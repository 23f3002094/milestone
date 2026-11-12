from __future__ import annotations

import os
import json
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from .auth import create_token, current_user, verify_password
from .database import get_db
from .models import (
    AgreementVersion, AiReview, Approval, Deliverable, Evidence, Milestone, PartyApproval, PaypalCapture,
    PaypalOrder, PaypalRefund, Project, ProjectMembership, ResolutionCase, ResolutionProposal, User,
)
from .schemas import AgreementEditIn, ConfirmIn, DeliveryIn, LoginIn, ProjectIn, ProposalIn, ResolutionIn
from .services import (
    audit, evaluate_delivery, get_project, latest_agreement, make_scope, membership, paypal_post,
    project_dict, require_role, resolution_copilot,
)

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"ok": True, "database": "connected", "paypal_mode": "sandbox" if os.getenv("PAYPAL_CLIENT_ID") and os.getenv("PAYPAL_CLIENT_SECRET") else "demo",
        "ai_configured": bool(os.getenv("AI_API_KEY")), "ai_model": os.getenv("AI_MODEL", "gpt-4o-mini") if os.getenv("AI_API_KEY") else None}


@router.post("/auth/login")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    return {"access_token": create_token(user), "user": user_dict(user)}


def user_dict(user: User) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.primary_role, "company": user.company}


@router.get("/auth/me")
def me(user: User = Depends(current_user)) -> dict:
    return user_dict(user)


@router.get("/projects")
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[dict]:
    projects = db.scalars(select(Project).join(ProjectMembership).where(
        ProjectMembership.user_id == user.id
    ).order_by(Project.created_at.desc()).options(selectinload(Project.memberships).selectinload(ProjectMembership.user),
        selectinload(Project.milestones).selectinload(Milestone.orders).selectinload(PaypalOrder.captures).selectinload(PaypalCapture.refunds))).all()
    return [{
        "id": p.id, "title": p.title, "status": p.status, "budget_cents": p.budget_cents,
        "currency": p.currency, "due_date": p.due_date,
        "role": next(m.role for m in p.memberships if m.user_id == user.id),
        "counterparty": next(m.user.name for m in p.memberships if m.user_id != user.id),
        "payment_mode": p.milestones[0].orders[-1].mode if p.milestones[0].orders else None,
        "captured_cents": sum(c.amount_cents for o in p.milestones[0].orders for c in o.captures),
        "refunded_cents": sum(r.amount_cents for o in p.milestones[0].orders for c in o.captures for r in c.refunds),
    } for p in projects]


@router.post("/projects", status_code=201)
def create_project(payload: ProjectIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    if user.primary_role != "freelancer":
        raise HTTPException(403, "Only a freelancer account can create a project")
    client = db.scalar(select(User).where(func.lower(User.email) == payload.client_email.lower()))
    if not client or client.primary_role != "client":
        raise HTTPException(400, "Add a registered client demo account")
    project = Project(title=payload.title, brief=payload.brief, status="agreement_review", currency=payload.currency,
        budget_cents=payload.amount_cents, due_date=payload.due_date, created_by_id=user.id)
    project.memberships.extend([
        ProjectMembership(user_id=user.id, role="freelancer"),
        ProjectMembership(user_id=client.id, role="client"),
    ])
    agreement = AgreementVersion(version=1, summary=payload.brief[:500],
        ambiguities="Revision limit should be confirmed.\nRequired source file formats should be confirmed.",
        out_of_scope="Ongoing maintenance\nWork not listed in the locked scope", created_by_id=user.id)
    make_scope(agreement, payload.brief)
    project.agreements.append(agreement)
    project.milestones.append(Milestone(title=payload.title, amount_cents=payload.amount_cents,
        currency=payload.currency, status="awaiting_agreement", due_date=payload.due_date))
    db.add(project)
    db.flush()
    audit(db, project.id, user, "project_created", f"Project created and {client.name} added as client.")
    audit(db, project.id, None, "agreement_generated", "Agreement version 1 generated with measurable acceptance criteria.")
    db.commit()
    return project_dict(db, get_project(db, project.id), user)


@router.get("/projects/{project_id}")
def project_detail(project_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    membership(db, project_id, user)
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/agreement/versions")
def edit_agreement(project_id: int, payload: AgreementEditIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "freelancer")
    current = latest_agreement(db, project_id)
    if current.locked_at:
        raise HTTPException(409, "The locked agreement is immutable")
    version = AgreementVersion(project_id=project_id, version=current.version + 1, summary=payload.summary,
        ambiguities="\n".join(payload.ambiguities), out_of_scope="\n".join(payload.out_of_scope), created_by_id=user.id)
    from .models import AcceptanceCriterion, ScopeItem
    for index, item in enumerate(payload.items if payload.items is not None else current.scope_items):
        clone = ScopeItem(title=item.title, description=item.description, sort_order=index)
        clone.criteria.extend([AcceptanceCriterion(description=c.description, check_type=c.check_type, expected=c.expected) for c in item.criteria])
        version.scope_items.append(clone)
    db.add(version)
    audit(db, project_id, user, "agreement_revised", f"Agreement version {version.version} created; prior approvals cleared.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/agreement/approve")
def approve_agreement(project_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    member = membership(db, project_id, user)
    if not payload.confirmed:
        raise HTTPException(400, "Explicit confirmation is required")
    agreement = latest_agreement(db, project_id)
    if agreement.locked_at:
        raise HTTPException(409, "Agreement is already locked")
    if db.scalar(select(Approval).where(Approval.agreement_version_id == agreement.id, Approval.user_id == user.id)):
        raise HTTPException(409, "You already approved this version")
    agreement.approvals.append(Approval(user_id=user.id, role=member.role))
    db.flush()
    count = db.scalar(select(func.count(Approval.id)).where(Approval.agreement_version_id == agreement.id))
    audit(db, project_id, user, "agreement_approved", f"{member.role.title()} approved agreement version {agreement.version}.")
    if count == 2:
        from .models import utcnow
        agreement.locked_at = utcnow()
        project = db.get(Project, project_id)
        project.status = "payment"
        project.milestones[0].status = "awaiting_payment"
        audit(db, project_id, None, "agreement_locked", f"Both parties approved; version {agreement.version} locked.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/payment/order")
async def create_order(project_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "client")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    project = get_project(db, project_id)
    agreement = latest_agreement(db, project_id)
    milestone = project.milestones[0]
    if not agreement.locked_at or milestone.orders:
        raise HTTPException(409, "Payment requires a locked agreement and no existing order")
    mode = "sandbox" if os.getenv("PAYPAL_CLIENT_ID") and os.getenv("PAYPAL_CLIENT_SECRET") else "demo"
    approval_url = None
    if mode == "demo":
        provider_id = f"DEMO-ORDER-{uuid.uuid4().hex[:10].upper()}"
    else:
        return_url = os.getenv("PAYPAL_RETURN_URL", "http://127.0.0.1:5173").rstrip("/") + f"/app/projects/{project.id}/payment"
        cancel_url = os.getenv("PAYPAL_CANCEL_URL", "http://127.0.0.1:5173").rstrip("/") + f"/app/projects/{project.id}/payment"
        result = await paypal_post("/v2/checkout/orders", {
            "intent": "CAPTURE",
            "purchase_units": [{"reference_id": str(project.id), "amount": {
                "currency_code": milestone.currency, "value": f"{milestone.amount_cents / 100:.2f}"
            }}],
            "payment_source": {"paypal": {"experience_context": {"return_url": return_url, "cancel_url": cancel_url}}},
        })
        provider_id = result["id"]
        approval_url = next((x["href"] for x in result.get("links", []) if x.get("rel") in {"payer-action", "approve"}), None)
    milestone.orders.append(PaypalOrder(provider_id=provider_id, status="CREATED", amount_cents=milestone.amount_cents,
        currency=milestone.currency, mode=mode, approval_url=approval_url))
    audit(db, project_id, user, "payment_order_created", f"{mode.title()} payment order created for the locked amount.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/payment/capture")
async def capture_order(project_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "client")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    project = get_project(db, project_id)
    milestone = project.milestones[0]
    if not milestone.orders:
        raise HTTPException(409, "Create a payment order before capture")
    order = milestone.orders[-1]
    if order.captures:
        raise HTTPException(409, "Order is already captured")
    if order.mode == "demo":
        provider_id, amount = f"DEMO-CAP-{uuid.uuid4().hex[:10].upper()}", order.amount_cents
    else:
        result = await paypal_post(f"/v2/checkout/orders/{order.provider_id}/capture", {})
        capture = result["purchase_units"][0]["payments"]["captures"][0]
        if capture.get("status") != "COMPLETED":
            raise HTTPException(502, "PayPal did not return a completed capture")
        if capture["amount"]["currency_code"] != order.currency:
            raise HTTPException(502, "PayPal returned a different currency")
        amount = int(Decimal(capture["amount"]["value"]) * 100)
        if amount != order.amount_cents:
            raise HTTPException(502, "PayPal returned a different amount")
        provider_id = capture["id"]
    order.captures.append(PaypalCapture(provider_id=provider_id, status="COMPLETED", amount_cents=amount))
    milestone.status, project.status = "in_progress", "in_progress"
    audit(db, project_id, user, "payment_captured", f"{order.mode.title()} capture recorded after client confirmation.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/delivery")
def submit_delivery(project_id: int, payload: DeliveryIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "freelancer")
    project = get_project(db, project_id)
    milestone = project.milestones[0]
    if project.status not in {"in_progress"}:
        raise HTTPException(409, "Delivery can be submitted only while the milestone is in progress")
    if not milestone.orders or not milestone.orders[-1].captures:
        raise HTTPException(409, "A captured payment is required before delivery")
    delivery = Deliverable(submitted_by_id=user.id, url=str(payload.url), summary=payload.summary)
    delivery.evidence.extend([Evidence(label=f"Evidence {index + 1}", url=value if value.startswith("http") else None, notes=value) for index, value in enumerate(payload.evidence)])
    milestone.deliverables.append(delivery)
    db.flush()
    evaluate_delivery(db, project, delivery)
    milestone.status, project.status = "in_review", "delivery_review"
    audit(db, project_id, user, "delivery_submitted", f"Delivery submitted with {len(payload.evidence)} evidence records.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/accept")
def accept_delivery(project_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "client")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    project = get_project(db, project_id)
    milestone = project.milestones[0]
    if milestone.status != "in_review":
        raise HTTPException(409, "Only a submitted delivery can be accepted")
    milestone.status, project.status = "accepted", "completed"
    audit(db, project_id, user, "delivery_accepted", "Client accepted the milestone after evidence review.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/resolution")
def open_resolution(project_id: int, payload: ResolutionIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    membership(db, project_id, user)
    project = get_project(db, project_id)
    milestone = project.milestones[0]
    if not milestone.deliverables:
        raise HTTPException(409, "Resolution Room is available after a delivery")
    if project.status != "delivery_review":
        raise HTTPException(409, "A resolution can be opened only for a delivery awaiting review")
    if db.scalar(select(ResolutionCase).where(ResolutionCase.milestone_id == milestone.id, ResolutionCase.status == "open")):
        raise HTTPException(409, "A resolution case already exists")
    case = ResolutionCase(milestone_id=milestone.id, opened_by_id=user.id, reason=payload.reason)
    suggested = min(milestone.amount_cents, round(milestone.amount_cents * .15))
    case.proposals.extend([
        ResolutionProposal(kind="revision", title="Focused revision", description="Address the listed gaps and resubmit evidence.", amount_cents=0, created_by_id=user.id),
        ResolutionProposal(kind="partial_refund", title="Partial refund", description="Close with a jointly approved partial refund.", amount_cents=suggested, created_by_id=user.id),
        ResolutionProposal(kind="adjusted_final_payment", title="Adjusted final payment", description="Reduce the retained project value by the approved amount.", amount_cents=suggested, created_by_id=user.id),
        ResolutionProposal(kind="paid_change_order", title="Paid change order", description="Create a separately approved milestone for out-of-scope work.", amount_cents=round(milestone.amount_cents * .2), created_by_id=user.id),
    ])
    db.add(case)
    project.status, milestone.status = "resolution", "in_resolution"
    audit(db, project_id, user, "resolution_opened", "Resolution Room opened; no financial action was taken.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/ai-resolution-review")
async def ai_resolution_review(project_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Prepare a fresh advisory; it cannot change payment or project state."""
    membership(db, project_id, user)
    project = get_project(db, project_id)
    case = db.scalar(select(ResolutionCase).where(ResolutionCase.milestone_id == project.milestones[0].id).order_by(ResolutionCase.id.desc()))
    review = await resolution_copilot(project, case.reason if case else None)
    from .models import utcnow
    review["generated_at"] = utcnow().isoformat()
    db.add(AiReview(project_id=project_id, agreement_id=latest_agreement(db, project_id).id,
        deliverable_id=project.milestones[0].deliverables[-1].id, resolution_case_id=case.id if case else None,
        requested_by_id=user.id, content=json.dumps(review)))
    audit(db, project_id, user, "ai_resolution_review_requested", "AI Resolution Copilot prepared an advisory review; no payment or project state changed.")
    db.commit()
    return review


@router.post("/projects/{project_id}/resolution/proposals", status_code=201)
def create_proposal(project_id: int, payload: ProposalIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    membership(db, project_id, user)
    project = get_project(db, project_id)
    case = db.scalar(select(ResolutionCase).where(ResolutionCase.milestone_id == project.milestones[0].id,
        ResolutionCase.status == "open").options(selectinload(ResolutionCase.proposals).selectinload(ResolutionProposal.approvals)))
    if not case:
        raise HTTPException(409, "Open a resolution case before proposing an outcome")
    if any(p.approvals for p in case.proposals):
        raise HTTPException(409, "A proposal has already been selected; its terms are locked for both parties")
    if payload.kind in {"partial_refund", "adjusted_final_payment"}:
        capture = project.milestones[0].orders[-1].captures[-1]
        balance = capture.amount_cents - sum(r.amount_cents for r in capture.refunds)
        if not 0 < payload.amount_cents <= balance:
            raise HTTPException(400, "Refund amount must be positive and within the captured balance")
    elif payload.kind == "revision" and payload.amount_cents:
        raise HTTPException(400, "A revision proposal does not move money")
    case.proposals.append(ResolutionProposal(kind=payload.kind, title=payload.title,
        description=payload.description, amount_cents=payload.amount_cents, created_by_id=user.id))
    audit(db, project_id, user, "resolution_proposal_created", f"{user.name} proposed: {payload.title}. No financial action taken.")
    db.commit()
    return project_dict(db, project, user)


@router.post("/projects/{project_id}/resolution/proposals/{proposal_id}/approve")
def approve_proposal(project_id: int, proposal_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    member = membership(db, project_id, user)
    if not payload.confirmed:
        raise HTTPException(400, "Explicit confirmation is required")
    proposal = db.scalar(select(ResolutionProposal).where(ResolutionProposal.id == proposal_id).options(selectinload(ResolutionProposal.approvals)))
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    case = db.get(ResolutionCase, proposal.case_id)
    if case.milestone_id != get_project(db, project_id).milestones[0].id:
        raise HTTPException(403, "Proposal is not part of this project")
    if case.status != "open":
        raise HTTPException(409, "This resolution case is already closed")
    selected_ids = db.scalars(select(PartyApproval.proposal_id).join(ResolutionProposal).where(
        ResolutionProposal.case_id == case.id
    )).all()
    if selected_ids and proposal.id not in selected_ids:
        raise HTTPException(409, "A different proposal was already approved in this case")
    if any(a.user_id == user.id for a in proposal.approvals):
        raise HTTPException(409, "You already approved this proposal")
    proposal.approvals.append(PartyApproval(user_id=user.id, role=member.role))
    audit(db, project_id, user, "resolution_proposal_approved", f"{member.role.title()} approved “{proposal.title}”.")
    db.commit()
    return project_dict(db, get_project(db, project_id), user)


@router.post("/projects/{project_id}/resolution/proposals/{proposal_id}/execute")
async def execute_proposal(project_id: int, proposal_id: int, payload: ConfirmIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    require_role(db, project_id, user, "client")
    if not payload.confirmed:
        raise HTTPException(400, "Final human confirmation is required")
    proposal = db.scalar(select(ResolutionProposal).where(ResolutionProposal.id == proposal_id).options(selectinload(ResolutionProposal.approvals)))
    if not proposal or len(proposal.approvals) != 2:
        raise HTTPException(409, "Both parties must approve the same proposal")
    case = db.get(ResolutionCase, proposal.case_id)
    project = get_project(db, project_id)
    if case.milestone_id != project.milestones[0].id:
        raise HTTPException(403, "Proposal is not part of this project")
    if case.status != "open":
        raise HTTPException(409, "This resolution case is already closed")
    if proposal.kind in {"partial_refund", "adjusted_final_payment"}:
        capture = project.milestones[0].orders[-1].captures[-1]
        refundable = capture.amount_cents - sum(r.amount_cents for r in capture.refunds)
        if proposal.amount_cents <= 0 or proposal.amount_cents > refundable:
            raise HTTPException(409, "Approved amount exceeds the server-calculated refundable balance")
        order = project.milestones[0].orders[-1]
        if order.mode == "demo":
            refund_id, status = f"DEMO-REF-{uuid.uuid4().hex[:10].upper()}", "COMPLETED"
        else:
            result = await paypal_post(f"/v2/payments/captures/{capture.provider_id}/refund", {
                "amount": {"value": f"{proposal.amount_cents / 100:.2f}", "currency_code": order.currency}
            })
            refund_id, status = result["id"], result["status"]
        capture.refunds.append(PaypalRefund(provider_id=refund_id, status=status, amount_cents=proposal.amount_cents))
        detail = f"{order.mode.title()} refund submitted for {order.currency} {proposal.amount_cents / 100:.2f}."
    else:
        detail = f"Jointly approved {proposal.kind.replace('_', ' ')} recorded; no financial action taken."
    case.status = "resolved"
    project.status = project.milestones[0].status = "in_progress" if proposal.kind == "revision" else "resolved"
    audit(db, project_id, user, "resolution_executed", detail)
    db.commit()
    return project_dict(db, get_project(db, project_id), user)
