from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    AcceptanceCriterion, AgreementVersion, Approval, Deliverable, Evidence, Milestone, PaypalCapture,
    PaypalOrder, Project, ProjectMembership, ResolutionCase, ResolutionProposal, User,
    ScopeItem,
)
from .services import BRAND_SCOPE_ENTRIES, audit, evaluate_delivery, make_scope

DEMO_PASSWORD = "Demo123!"


def repair_demo_brand_scope(db: Session) -> None:
    """Correct the original Cedar & Finch demo fixture without touching other projects."""
    project = db.scalar(select(Project).where(
        Project.title == "Cedar & Finch brand launch",
        Project.brief == "Create a brand identity and launch kit for Cedar & Finch including logo, color system, social templates and a concise usage guide.",
    ))
    if not project:
        return
    agreement = db.scalar(select(AgreementVersion).where(AgreementVersion.project_id == project.id, AgreementVersion.version == 1))
    if not agreement:
        return
    items = sorted(agreement.scope_items, key=lambda item: item.sort_order)
    if [item.title for item in items] != ["Published experience", "Responsive layout", "Complete page set"]:
        return
    for item, (title, description, check_type, expected) in zip(items, BRAND_SCOPE_ENTRIES):
        item.title, item.description = title, description
        criterion = item.criteria[0]
        criterion.description, criterion.check_type, criterion.expected = description, check_type, expected
    title, description, check_type, expected = BRAND_SCOPE_ENTRIES[-1]
    added = ScopeItem(title=title, description=description, sort_order=3)
    added.criteria.append(AcceptanceCriterion(description=description, check_type=check_type, expected=expected))
    agreement.scope_items.append(added)
    db.flush()
    milestone = project.milestones[0]
    if milestone.deliverables and not milestone.deliverables[-1].evaluations:
        evaluate_delivery(db, project, milestone.deliverables[-1])
    audit(db, project.id, None, "demo_scope_corrected", "Demo brand acceptance criteria corrected to match the original brand brief.")
    db.commit()


def seed(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)):
        repair_demo_brand_scope(db)
        return
    frankie = User(email="frankie@demo.milestone.app", name="Frankie Morgan", company="Morgan Digital", primary_role="freelancer", password_hash=hash_password(DEMO_PASSWORD))
    casey = User(email="casey@demo.milestone.app", name="Casey Nguyen", company="Northstar Studio", primary_role="client", password_hash=hash_password(DEMO_PASSWORD))
    db.add_all([frankie, casey])
    db.flush()

    brief = "Build a responsive 4 page portfolio website by 15 November for $4,800. Include Home, Work, About and Contact pages, a working contact form, basic SEO, client-provided copy and images, Chrome and Safari support, and one revision round."
    project = Project(title="Northstar Studio website", brief=brief, status="delivery_review", currency="USD", budget_cents=480000, due_date="2026-11-15", created_by_id=frankie.id)
    project.memberships.extend([
        ProjectMembership(user_id=frankie.id, role="freelancer"),
        ProjectMembership(user_id=casey.id, role="client"),
    ])
    agreement = AgreementVersion(version=2, summary="Design and build a polished four-page portfolio website with responsive behavior, enquiry capture and SEO foundations.", ambiguities="", out_of_scope="Copywriting beyond client edits\nOngoing hosting and maintenance\nAdditional pages after scope lock", created_by_id=frankie.id)
    make_scope(agreement, brief)
    project.agreements.append(agreement)
    milestone = Milestone(title="Website design and launch", amount_cents=480000, currency="USD", status="in_review", due_date="2026-11-15")
    project.milestones.append(milestone)
    db.add(project)
    db.flush()
    agreement.approvals.extend([
        Approval(user_id=frankie.id, role="freelancer"),
        Approval(user_id=casey.id, role="client"),
    ])
    from .models import utcnow
    agreement.locked_at = utcnow()
    order = PaypalOrder(provider_id="DEMO-ORDER-NORTHSTAR", status="CREATED", amount_cents=480000, currency="USD", mode="demo")
    order.captures.append(PaypalCapture(provider_id="DEMO-CAP-NORTHSTAR", status="COMPLETED", amount_cents=480000))
    milestone.orders.append(order)
    delivery = Deliverable(submitted_by_id=frankie.id, url="https://northstar.example", summary="All four pages are live. Responsive QA, contact flow and metadata checks are attached.")
    delivery.evidence.extend([
        Evidence(label="Live routes", url="https://northstar.example https://northstar.example/work https://northstar.example/about https://northstar.example/contact", notes="Home, Work, About and Contact"),
        Evidence(label="Responsive QA", notes="mobile desktop Chrome Safari at 390px, 768px and 1440px"),
        Evidence(label="Form and SEO checks", notes="contact submitted; title and description verified"),
    ])
    milestone.deliverables.append(delivery)
    db.flush()
    evaluate_delivery(db, project, delivery)
    audit(db, project.id, frankie, "project_created", "Northstar Studio website workspace created.")
    audit(db, project.id, casey, "agreement_approved", "Client approved agreement version 2.")
    audit(db, project.id, frankie, "agreement_locked", "Both parties approved; version 2 was locked.")
    audit(db, project.id, casey, "payment_captured", "Demo payment captured for USD 4,800.00. No money moved.")
    audit(db, project.id, frankie, "delivery_submitted", "Website delivery and three evidence records submitted.")

    brief2 = "Create a brand identity and launch kit for Cedar & Finch including logo, color system, social templates and a concise usage guide."
    project2 = Project(title="Cedar & Finch brand launch", brief=brief2, status="resolution", currency="USD", budget_cents=240000, due_date="2026-11-28", created_by_id=frankie.id)
    project2.memberships.extend([
        ProjectMembership(user_id=frankie.id, role="freelancer"),
        ProjectMembership(user_id=casey.id, role="client"),
    ])
    agreement2 = AgreementVersion(version=1, summary="A compact brand identity and practical launch asset package.", ambiguities="Exact number of social variants is not stated.", out_of_scope="Packaging design\nTrademark clearance", created_by_id=frankie.id)
    make_scope(agreement2, brief2)
    project2.agreements.append(agreement2)
    milestone2 = Milestone(title="Identity system and launch kit", amount_cents=240000, currency="USD", status="in_resolution", due_date="2026-11-28")
    project2.milestones.append(milestone2)
    db.add(project2)
    db.flush()
    agreement2.approvals.extend([Approval(user_id=frankie.id, role="freelancer"), Approval(user_id=casey.id, role="client")])
    agreement2.locked_at = utcnow()
    order2 = PaypalOrder(provider_id="DEMO-ORDER-CEDAR", status="CREATED", amount_cents=240000, currency="USD", mode="demo")
    order2.captures.append(PaypalCapture(provider_id="DEMO-CAP-CEDAR", status="COMPLETED", amount_cents=240000))
    milestone2.orders.append(order2)
    delivery2 = Deliverable(submitted_by_id=frankie.id, url="https://cedar-finch.example/delivery", summary="Identity files and initial templates delivered.")
    delivery2.evidence.append(Evidence(label="Handover folder", url="https://cedar-finch.example/delivery", notes="Logo and color files included"))
    milestone2.deliverables.append(delivery2)
    db.flush()
    evaluate_delivery(db, project2, delivery2)
    case = ResolutionCase(milestone_id=milestone2.id, opened_by_id=casey.id, reason="The social templates need the agreed launch formats and the usage guide needs clearer spacing rules.")
    case.proposals.extend([
        ResolutionProposal(kind="revision", title="Focused revision", description="Add the missing launch formats and clarify usage guidance.", amount_cents=0, created_by_id=casey.id),
        ResolutionProposal(kind="partial_refund", title="Partial refund", description="Close the project with a jointly approved USD 360 refund.", amount_cents=36000, created_by_id=casey.id),
        ResolutionProposal(kind="adjusted_final_payment", title="Adjusted final payment", description="Reduce the final retained value by USD 360.", amount_cents=36000, created_by_id=casey.id),
        ResolutionProposal(kind="paid_change_order", title="Paid change order", description="Create a separately approved milestone for additional formats.", amount_cents=60000, created_by_id=casey.id),
    ])
    db.add(case)
    audit(db, project2.id, casey, "resolution_opened", "Client opened a Resolution Room with specific evidence gaps.")
    db.commit()
