from __future__ import annotations

import json
import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("MILESTONE_DB_PATH", ROOT / "milestone.db"))
PAYPAL_BASE_URL = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/")

app = FastAPI(
    title="Milestone",
    description="Human-approved agreement-to-resolution workflow for one website milestone.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[item.strip() for item in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    return connection


def save(project: dict[str, Any]) -> dict[str, Any]:
    project["updated_at"] = now()
    with db() as connection:
        connection.execute(
            """
            INSERT INTO projects (id, data, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at
            """,
            (project["id"], json.dumps(project), project["updated_at"]),
        )
    return project


def load(project_id: str) -> dict[str, Any]:
    with db() as connection:
        row = connection.execute("SELECT data FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Project not found")
    return json.loads(row["data"])


def audit(project: dict[str, Any], event: str, actor: str, detail: str) -> None:
    project.setdefault("audit", []).append(
        {"at": now(), "event": event, "actor": actor, "detail": detail}
    )


def money(cents: int) -> str:
    return f"{cents / 100:.2f}"


def extract_amount(brief: str, fallback: int) -> int:
    match = re.search(r"(?:\$|USD\s*)([\d,]+(?:\.\d{1,2})?)", brief, re.IGNORECASE)
    if not match:
        return fallback
    return int(round(float(match.group(1).replace(",", "")) * 100))


def requirement(
    title: str, description: str, check: Literal["url", "text", "evidence"], expected: str
) -> dict[str, str]:
    return {
        "id": f"req_{uuid.uuid4().hex[:8]}",
        "title": title,
        "description": description,
        "check": check,
        "expected": expected,
    }


def structure_brief(brief: str) -> dict[str, Any]:
    lowered = brief.lower()
    requirements: list[dict[str, str]] = []
    page_match = re.search(r"(\d+)\s*(?:page|pages)", lowered)
    if page_match:
        count = int(page_match.group(1))
        requirements.append(requirement(
            f"{count} distinct pages",
            f"Published site exposes at least {count} navigable page routes.",
            "url",
            str(count),
        ))
    else:
        requirements.append(requirement(
            "Published website",
            "A publicly reachable website URL is supplied.",
            "url",
            "https://",
        ))
    keyword_requirements = [
        ("responsive", "Responsive layout", "Evidence names mobile and desktop testing.", "mobile, desktop"),
        ("contact", "Working contact form", "Evidence includes the form route and successful submission.", "contact, submitted"),
        ("seo", "Basic SEO", "Evidence identifies page titles and descriptions.", "title, description"),
        ("analytics", "Analytics installed", "Evidence identifies the analytics provider or event.", "analytics"),
        ("accessib", "Accessibility pass", "Evidence includes keyboard and contrast checks.", "keyboard, contrast"),
        ("cms", "Editable CMS content", "Evidence identifies the CMS and editable fields.", "cms"),
    ]
    for needle, title, description, expected in keyword_requirements:
        if needle in lowered:
            requirements.append(requirement(title, description, "evidence", expected))
    if len(requirements) == 1:
        requirements.extend([
            requirement(
                "Responsive layout",
                "Primary pages render without horizontal overflow on mobile and desktop.",
                "evidence",
                "mobile, desktop",
            ),
            requirement(
                "Working enquiry path",
                "A visitor can complete the site's primary call to action.",
                "evidence",
                "submitted",
            ),
        ])

    ambiguities: list[str] = []
    checks = [
        (not re.search(r"(?:\$|usd\s*)[\d,]+", lowered), "Milestone price is not stated."),
        (not re.search(r"\b(?:by|before|due|deadline)\b", lowered), "Delivery date is not stated."),
        ("revision" not in lowered, "Included revision rounds are not stated."),
        (not any(word in lowered for word in ("copy", "content", "images", "assets")), "Content ownership is unclear."),
        (not any(word in lowered for word in ("chrome", "safari", "firefox", "browser")), "Browser support is not stated."),
    ]
    ambiguities.extend(message for missing, message in checks if missing)
    return {
        "summary": re.sub(r"\s+", " ", brief).strip()[:240],
        "requirements": requirements,
        "ambiguities": ambiguities,
        "out_of_scope": [
            "Ongoing hosting or maintenance after acceptance",
            "Work not explicitly listed in the locked requirements",
        ],
    }


async def ai_advice(prompt: str) -> dict[str, Any] | None:
    api_key = os.getenv("AI_API_KEY")
    if not api_key:
        return None
    base_url = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "temperature": 0,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an advisory project reviewer. Return one concise paragraph. "
                                "Never decide payments or make legal conclusions."
                            ),
                        },
                        {"role": "user", "content": prompt[:6000]},
                    ],
                },
            )
            response.raise_for_status()
            return {
                "provider": model,
                "text": response.json()["choices"][0]["message"]["content"],
                "advisory_only": True,
            }
    except Exception as exc:
        return {"provider": model, "text": f"AI advisory unavailable: {type(exc).__name__}", "advisory_only": True}


class BriefIn(BaseModel):
    brief: str = Field(min_length=20, max_length=5000)
    title: str = Field(default="Website milestone", min_length=2, max_length=100)
    amount_cents: int = Field(default=120_000, ge=100, le=10_000_000)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")


class ApprovalIn(BaseModel):
    role: Literal["client", "freelancer"]
    name: str = Field(min_length=2, max_length=80)
    confirmed: bool


class HumanConfirm(BaseModel):
    actor: str = Field(min_length=2, max_length=80)
    confirmed: bool


class DeliverableIn(BaseModel):
    actor: str = Field(min_length=2, max_length=80)
    url: HttpUrl
    summary: str = Field(min_length=10, max_length=3000)
    evidence: list[str] = Field(min_length=1, max_length=20)


class ComplaintIn(BaseModel):
    actor: str = Field(min_length=2, max_length=80)
    complaint: str = Field(min_length=10, max_length=3000)


class ResolutionApprovalIn(BaseModel):
    role: Literal["client", "freelancer"]
    name: str = Field(min_length=2, max_length=80)
    option_id: str
    confirmed: bool


class RefundIn(BaseModel):
    actor: str = Field(min_length=2, max_length=80)
    amount_cents: int = Field(gt=0)
    confirmed: bool


async def paypal_token() -> str:
    client_id = os.getenv("PAYPAL_CLIENT_ID")
    secret = os.getenv("PAYPAL_CLIENT_SECRET")
    if not client_id or not secret:
        raise HTTPException(409, "PayPal sandbox credentials are not configured")
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(client_id, secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json"},
        )
    if response.is_error:
        raise HTTPException(502, "PayPal authentication failed")
    return response.json()["access_token"]


async def paypal_post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    token = await paypal_token()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "PayPal-Request-Id": uuid.uuid4().hex,
            },
            json=payload,
        )
    if response.is_error:
        raise HTTPException(502, f"PayPal request failed ({response.status_code})")
    return response.json()


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "paypal_mode": "sandbox" if os.getenv("PAYPAL_CLIENT_ID") else "demo",
        "ai_mode": "advisory" if os.getenv("AI_API_KEY") else "deterministic",
    }


@app.post("/api/projects")
async def create_project(payload: BriefIn) -> dict[str, Any]:
    project_id = f"ms_{uuid.uuid4().hex[:10]}"
    total_cents = extract_amount(payload.brief, payload.amount_cents)
    project = {
        "id": project_id,
        "title": payload.title,
        "brief": payload.brief,
        "currency": payload.currency,
        "total_cents": total_cents,
        "status": "draft",
        "scope": structure_brief(payload.brief),
        "approvals": {"client": None, "freelancer": None},
        "payment": {
            "mode": "sandbox" if os.getenv("PAYPAL_CLIENT_ID") else "demo",
            "status": "not_created",
            "order_id": None,
            "capture_id": None,
            "captured_cents": 0,
            "refunded_cents": 0,
            "approval_url": None,
        },
        "deliverable": None,
        "evaluation": None,
        "resolution": None,
        "audit": [],
        "created_at": now(),
    }
    audit(project, "scope_created", "system", "Brief converted into deterministic measurable scope.")
    project["scope"]["ai_advisory"] = await ai_advice(
        f"Identify important ambiguities in this website brief:\n{payload.brief}"
    )
    return save(project)


@app.post("/api/demo")
async def create_demo() -> dict[str, Any]:
    return await create_project(BriefIn(
        title="Northstar Studio launch",
        brief=(
            "Build a responsive 4 page portfolio website by 15 November for $1,200. "
            "Include Home, Work, About and Contact pages, a working contact form, basic SEO, "
            "client-provided copy and images, Chrome and Safari support, and one revision round."
        ),
    ))


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> dict[str, Any]:
    return load(project_id)


@app.post("/api/projects/{project_id}/approve")
def approve_scope(project_id: str, payload: ApprovalIn) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] != "draft":
        raise HTTPException(409, "The scope is already locked and cannot be changed")
    if not payload.confirmed:
        raise HTTPException(400, "Explicit confirmation is required")
    project["approvals"][payload.role] = {"name": payload.name, "at": now()}
    audit(project, "scope_approved", payload.name, f"{payload.role.title()} approved the scope.")
    if all(project["approvals"].values()):
        project["status"] = "locked"
        project["locked_at"] = now()
        audit(project, "scope_locked", "system", "Both parties approved. Scope snapshot locked.")
    return save(project)


@app.post("/api/projects/{project_id}/payment/create")
async def create_payment(project_id: str, payload: HumanConfirm) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] != "locked":
        raise HTTPException(409, "Both parties must lock the scope before creating payment")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    if project["payment"]["status"] != "not_created":
        raise HTTPException(409, "A payment order already exists")
    if project["payment"]["mode"] == "demo":
        order_id = f"DEMO-{uuid.uuid4().hex[:10].upper()}"
        result = {"id": order_id, "links": []}
    else:
        result = await paypal_post("/v2/checkout/orders", {
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": project["id"],
                "custom_id": project["id"],
                "description": project["title"][:127],
                "amount": {
                    "currency_code": project["currency"],
                    "value": money(project["total_cents"]),
                },
            }],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "return_url": os.getenv("PAYPAL_RETURN_URL", "http://localhost:5173"),
                        "cancel_url": os.getenv("PAYPAL_CANCEL_URL", "http://localhost:5173"),
                        "user_action": "PAY_NOW",
                    }
                }
            },
        })
    approval_url = next(
        (link["href"] for link in result.get("links", []) if link.get("rel") == "payer-action"),
        None,
    )
    project["payment"].update(
        {"order_id": result["id"], "status": "created", "approval_url": approval_url}
    )
    audit(project, "payment_created", payload.actor, (
        "PayPal sandbox order created." if project["payment"]["mode"] == "sandbox"
        else "Demo payment order created; no money moved."
    ))
    return save(project)


@app.post("/api/projects/{project_id}/payment/capture")
async def capture_payment(project_id: str, payload: HumanConfirm) -> dict[str, Any]:
    project = load(project_id)
    payment = project["payment"]
    if payment["status"] != "created":
        raise HTTPException(409, "Payment order is not ready to capture")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    if payment["mode"] == "demo":
        capture_id = f"DEMO-CAP-{uuid.uuid4().hex[:8].upper()}"
        captured_cents = project["total_cents"]
    else:
        result = await paypal_post(f"/v2/checkout/orders/{payment['order_id']}/capture", {})
        captures = [
            capture
            for unit in result.get("purchase_units", [])
            for capture in unit.get("payments", {}).get("captures", [])
        ]
        if not captures or captures[0].get("status") != "COMPLETED":
            raise HTTPException(502, "PayPal did not return a completed capture")
        capture = captures[0]
        if capture["amount"]["currency_code"] != project["currency"]:
            raise HTTPException(502, "PayPal currency did not match locked agreement")
        captured_cents = int(round(float(capture["amount"]["value"]) * 100))
        if captured_cents != project["total_cents"]:
            raise HTTPException(502, "PayPal amount did not match locked agreement")
        capture_id = capture["id"]
    payment.update({
        "status": "captured",
        "capture_id": capture_id,
        "captured_cents": captured_cents,
        "captured_at": now(),
    })
    project["status"] = "funded"
    audit(project, "payment_captured", payload.actor, (
        "Sandbox payment captured after human approval." if payment["mode"] == "sandbox"
        else "Demo capture recorded; no money moved."
    ))
    return save(project)


@app.post("/api/projects/{project_id}/deliverable")
def submit_deliverable(project_id: str, payload: DeliverableIn) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] not in ("funded", "delivered", "in_resolution"):
        raise HTTPException(409, "The locked milestone must have a captured payment first")
    project["deliverable"] = {
        "url": str(payload.url),
        "summary": payload.summary,
        "evidence": payload.evidence,
        "submitted_at": now(),
        "submitted_by": payload.actor,
    }
    project["status"] = "delivered"
    project["evaluation"] = None
    audit(project, "deliverable_submitted", payload.actor, "Website and evidence submitted for review.")
    return save(project)


@app.post("/api/projects/{project_id}/evaluate")
async def evaluate(project_id: str) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] not in ("delivered", "in_resolution") or not project["deliverable"]:
        raise HTTPException(409, "Submit a deliverable before evaluation")
    deliverable = project["deliverable"]
    searchable = " ".join([deliverable["url"], deliverable["summary"], *deliverable["evidence"]]).lower()
    checks = []
    for req in project["scope"]["requirements"]:
        expected = [item.strip().lower() for item in req["expected"].split(",")]
        if req["check"] == "url":
            passed = deliverable["url"].startswith("http")
            if expected[0].isdigit():
                routes = set(re.findall(r"https?://[^\s,]+", searchable))
                passed = len(routes) >= int(expected[0])
        else:
            passed = all(term in searchable for term in expected)
        checks.append({
            "requirement_id": req["id"],
            "title": req["title"],
            "passed": passed,
            "method": f"Deterministic evidence keyword check: {', '.join(expected)}",
        })
    passed_count = sum(1 for check in checks if check["passed"])
    project["evaluation"] = {
        "checks": checks,
        "passed": passed_count,
        "total": len(checks),
        "result": "meets_checks" if passed_count == len(checks) else "needs_review",
        "disclaimer": "Checks organize evidence; they do not prove quality or decide payment.",
        "ai_advisory": await ai_advice(
            "Compare this locked scope and submitted evidence. Note only gaps; do not decide payment.\n"
            + json.dumps({"scope": project["scope"], "deliverable": deliverable})
        ),
        "evaluated_at": now(),
    }
    audit(project, "evidence_evaluated", "system", f"{passed_count}/{len(checks)} deterministic checks passed.")
    return save(project)


@app.post("/api/projects/{project_id}/accept")
def accept(project_id: str, payload: HumanConfirm) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] != "delivered":
        raise HTTPException(409, "Only a delivered milestone can be accepted")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    project["status"] = "accepted"
    project["accepted_at"] = now()
    audit(project, "milestone_accepted", payload.actor, "Client accepted the submitted milestone.")
    return save(project)


@app.post("/api/projects/{project_id}/resolution")
def open_resolution(project_id: str, payload: ComplaintIn) -> dict[str, Any]:
    project = load(project_id)
    if project["status"] not in ("delivered", "in_resolution"):
        raise HTTPException(409, "Resolution Room is available after delivery")
    missing = [
        check["title"] for check in (project.get("evaluation") or {}).get("checks", [])
        if not check["passed"]
    ]
    available = project["payment"]["captured_cents"] - project["payment"]["refunded_cents"]
    suggested_refund = min(available, max(100, round(available * min(0.5, max(0.1, len(missing) * 0.15)))))
    options = [
        {
            "id": "revision",
            "type": "revision",
            "title": "Focused revision",
            "description": "Freelancer addresses the listed evidence gaps, then resubmits.",
            "amount_cents": 0,
        },
        {
            "id": "partial_refund",
            "type": "partial_refund",
            "title": f"Partial refund of {project['currency']} {money(suggested_refund)}",
            "description": "Both people approve before a PayPal refund is initiated.",
            "amount_cents": suggested_refund,
        },
        {
            "id": "adjusted_final",
            "type": "adjusted_final_payment",
            "title": "Adjust final payment",
            "description": "Agree a lower final value; any reduction is processed as a human-approved refund.",
            "amount_cents": suggested_refund,
        },
        {
            "id": "full_refund",
            "type": "partial_refund",
            "title": f"Full refund of {project['currency']} {money(available)}",
            "description": "Return the remaining captured payment only after both people approve.",
            "amount_cents": available,
        },
        {
            "id": "change_order",
            "type": "paid_change_order",
            "title": "Paid change order",
            "description": "Treat requests outside locked scope as a separate, newly approved milestone.",
            "amount_cents": 0,
        },
    ]
    project["resolution"] = {
        "complaint": payload.complaint,
        "opened_by": payload.actor,
        "opened_at": now(),
        "comparison": {
            "failed_checks": missing,
            "scope_note": (
                "Some deterministic checks need review." if missing
                else "No deterministic evidence gaps were found; discuss quality or interpretation."
            ),
        },
        "options": options,
        "approvals": {"client": None, "freelancer": None},
        "selected_option_id": None,
        "status": "open",
    }
    project["status"] = "in_resolution"
    audit(project, "resolution_opened", payload.actor, "Complaint compared with locked scope and evidence.")
    return save(project)


@app.post("/api/projects/{project_id}/resolution/approve")
def approve_resolution(project_id: str, payload: ResolutionApprovalIn) -> dict[str, Any]:
    project = load(project_id)
    resolution = project.get("resolution")
    if not resolution or resolution["status"] not in ("open", "agreed"):
        raise HTTPException(409, "There is no open resolution")
    if not payload.confirmed:
        raise HTTPException(400, "Explicit confirmation is required")
    if payload.option_id not in {item["id"] for item in resolution["options"]}:
        raise HTTPException(400, "Unknown resolution option")
    existing_choice = resolution.get("selected_option_id")
    if existing_choice and existing_choice != payload.option_id:
        resolution["approvals"] = {"client": None, "freelancer": None}
    resolution["selected_option_id"] = payload.option_id
    resolution["approvals"][payload.role] = {"name": payload.name, "at": now()}
    if all(resolution["approvals"].values()):
        resolution["status"] = "agreed"
        resolution["agreed_at"] = now()
    audit(project, "resolution_approved", payload.name, f"{payload.role.title()} approved {payload.option_id}.")
    return save(project)


@app.post("/api/projects/{project_id}/refund")
async def refund(project_id: str, payload: RefundIn) -> dict[str, Any]:
    project = load(project_id)
    payment = project["payment"]
    resolution = project.get("resolution")
    if not payload.confirmed:
        raise HTTPException(400, "Human confirmation is required")
    if not resolution or resolution["status"] != "agreed":
        raise HTTPException(409, "Both parties must agree a financial resolution first")
    selected = next(
        item for item in resolution["options"] if item["id"] == resolution["selected_option_id"]
    )
    if selected["type"] not in ("partial_refund", "adjusted_final_payment"):
        raise HTTPException(409, "The agreed option does not authorize a refund")
    if payload.amount_cents != selected["amount_cents"]:
        raise HTTPException(409, "Refund amount must match the jointly approved option")
    refundable = payment["captured_cents"] - payment["refunded_cents"]
    if payload.amount_cents > refundable:
        raise HTTPException(409, "Refund exceeds the remaining captured amount")
    if payment["mode"] == "demo":
        refund_id = f"DEMO-REF-{uuid.uuid4().hex[:8].upper()}"
    else:
        result = await paypal_post(f"/v2/payments/captures/{payment['capture_id']}/refund", {
            "amount": {
                "value": money(payload.amount_cents),
                "currency_code": project["currency"],
            },
            "note_to_payer": "Jointly approved milestone resolution",
        })
        if result.get("status") not in ("COMPLETED", "PENDING"):
            raise HTTPException(502, "PayPal did not accept the refund")
        refund_id = result["id"]
    payment["refunded_cents"] += payload.amount_cents
    payment.setdefault("refunds", []).append({
        "id": refund_id,
        "amount_cents": payload.amount_cents,
        "at": now(),
        "mode": payment["mode"],
    })
    resolution["status"] = "completed"
    project["status"] = "resolved"
    audit(project, "refund_initiated", payload.actor, (
        f"{project['currency']} {money(payload.amount_cents)} refund approved and submitted."
        if payment["mode"] == "sandbox"
        else f"Demo refund of {project['currency']} {money(payload.amount_cents)} recorded; no money moved."
    ))
    return save(project)


dist = ROOT / "frontend" / "dist"
if dist.exists():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        target = dist / path
        return FileResponse(target if target.is_file() else dist / "index.html")
