import importlib
import sys

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("JWT_SECRET", "test-only-secret")
    # Empty values keep the developer's root .env from enabling live API calls in tests.
    monkeypatch.setenv("PAYPAL_CLIENT_ID", "")
    monkeypatch.setenv("PAYPAL_CLIENT_SECRET", "")
    monkeypatch.setenv("AI_API_KEY", "")
    for name in list(sys.modules):
        if name == "main" or name.startswith("core"):
            del sys.modules[name]
    main = importlib.import_module("main")
    with TestClient(main.app) as client:
        yield client


def login(api, email):
    response = api.post("/api/auth/login", json={"email": email, "password": "Demo123!"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_authentication_and_project_authorization(api):
    anonymous = api.get("/api/projects")
    assert anonymous.status_code == 401
    client_headers = login(api, "casey@demo.milestone.app")
    freelancer_headers = login(api, "frankie@demo.milestone.app")
    assert len(api.get("/api/projects", headers=client_headers).json()) == 2
    forbidden = api.post("/api/projects", headers=client_headers, json={
        "title": "Unauthorized project",
        "brief": "A sufficiently detailed brief that should still be rejected for this role.",
        "client_email": "casey@demo.milestone.app",
        "amount_cents": 10000,
        "currency": "USD",
        "due_date": "2026-12-01",
    })
    assert forbidden.status_code == 403
    assert api.get("/api/projects/9999", headers=freelancer_headers).status_code == 403


def test_full_human_approved_workflow(api):
    freelancer = login(api, "frankie@demo.milestone.app")
    client = login(api, "casey@demo.milestone.app")
    created = api.post("/api/projects", headers=freelancer, json={
        "title": "Campaign launch",
        "brief": "Build a responsive 3 page campaign website with a contact form, SEO and public routes.",
        "client_email": "casey@demo.milestone.app",
        "amount_cents": 90000,
        "currency": "USD",
        "due_date": "2026-12-01",
    })
    assert created.status_code == 201
    project_id = created.json()["id"]

    one_approval = api.post(f"/api/projects/{project_id}/agreement/approve", headers=freelancer, json={"confirmed": True})
    assert one_approval.json()["agreement"]["locked_at"] is None
    locked = api.post(f"/api/projects/{project_id}/agreement/approve", headers=client, json={"confirmed": True})
    assert locked.json()["agreement"]["locked_at"]

    assert api.post(f"/api/projects/{project_id}/payment/order", headers=freelancer, json={"confirmed": True}).status_code == 403
    ordered = api.post(f"/api/projects/{project_id}/payment/order", headers=client, json={"confirmed": True})
    assert ordered.json()["milestone"]["payment"]["mode"] == "demo"
    captured = api.post(f"/api/projects/{project_id}/payment/capture", headers=client, json={"confirmed": True})
    assert captured.json()["milestone"]["payment"]["captured_cents"] == 90000

    delivery = api.post(f"/api/projects/{project_id}/delivery", headers=freelancer, json={
        "url": "https://campaign.example",
        "summary": "Three campaign routes are live with responsive behavior, contact flow and metadata.",
        "evidence": [
            "https://campaign.example https://campaign.example/about https://campaign.example/contact",
            "mobile desktop responsive screenshots",
            "contact submitted successfully",
            "SEO title and description",
        ],
    })
    assert delivery.status_code == 200
    assert len(delivery.json()["milestone"]["deliverable"]["evaluations"]) >= 4
    accepted = api.post(f"/api/projects/{project_id}/accept", headers=client, json={"confirmed": True})
    assert accepted.json()["status"] == "completed"
    assert any(event["event"] == "delivery_accepted" for event in accepted.json()["audit"])


def test_resolution_requires_two_party_same_proposal(api):
    freelancer = login(api, "frankie@demo.milestone.app")
    client = login(api, "casey@demo.milestone.app")
    project = api.get("/api/projects/2", headers=client).json()
    proposal = next(item for item in project["resolution"]["proposals"] if item["kind"] == "partial_refund")
    premature = api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/execute", headers=client, json={"confirmed": True})
    assert premature.status_code == 409
    api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/approve", headers=client, json={"confirmed": True})
    approved = api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/approve", headers=freelancer, json={"confirmed": True})
    assert len(next(item for item in approved.json()["resolution"]["proposals"] if item["id"] == proposal["id"])["approvals"]) == 2
    resolved = api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/execute", headers=client, json={"confirmed": True})
    assert resolved.status_code == 200
    assert resolved.json()["milestone"]["payment"]["refunded_cents"] == proposal["amount_cents"]
    assert resolved.json()["status"] == "resolved"
    repeated = api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/execute", headers=client, json={"confirmed": True})
    assert repeated.status_code == 409


def test_resolution_rejects_conflicting_proposals(api):
    freelancer = login(api, "frankie@demo.milestone.app")
    client = login(api, "casey@demo.milestone.app")
    proposals = api.get("/api/projects/2", headers=client).json()["resolution"]["proposals"]
    first = proposals[0]["id"]
    second = proposals[1]["id"]
    assert api.post(f"/api/projects/2/resolution/proposals/{first}/approve", headers=client, json={"confirmed": True}).status_code == 200
    conflict = api.post(f"/api/projects/2/resolution/proposals/{second}/approve", headers=freelancer, json={"confirmed": True})
    assert conflict.status_code == 409


def test_ai_resolution_copilot_requires_configuration_and_never_changes_state(api):
    client = login(api, "casey@demo.milestone.app")
    before = api.get("/api/projects/2", headers=client).json()
    response = api.post("/api/projects/2/ai-resolution-review", headers=client, json={})
    assert response.status_code == 409
    assert "AI copilot is not configured" in response.json()["detail"]
    after = api.get("/api/projects/2", headers=client).json()
    assert after["status"] == before["status"]
    assert after["milestone"]["payment"] == before["milestone"]["payment"]


def test_ai_review_persists_with_delivery_context_without_moving_money(api, monkeypatch):
    async def review(*args):
        return {"provider": "mock-model", "summary": "Inspect the missing social formats.",
            "evidence_gaps": ["Social export formats are not documented."], "clarifying_questions": [],
            "suggested_next_steps": ["Share format evidence."], "advisory_only": True, "guardrail": "People decide."}
    monkeypatch.setattr(importlib.import_module("core.api"), "resolution_copilot", review)
    client = login(api, "casey@demo.milestone.app")
    before = api.get("/api/projects/2", headers=client).json()
    result = api.post("/api/projects/2/ai-resolution-review", headers=client, json={})
    assert result.status_code == 200
    after = api.get("/api/projects/2", headers=client).json()
    assert after["ai_review"]["summary"] == result.json()["summary"]
    assert after["ai_review"]["generated_at"]
    assert after["milestone"]["payment"] == before["milestone"]["payment"]
    assert after["status"] == before["status"]


def test_custom_refund_proposal_checks_balance_and_locks_terms(api):
    client = login(api, "casey@demo.milestone.app")
    freelancer = login(api, "frankie@demo.milestone.app")
    body = {"kind": "partial_refund", "title": "Agree a partial refund", "description": "Return the agreed amount and close this milestone.", "amount_cents": 300000}
    assert api.post("/api/projects/2/resolution/proposals", headers=client, json=body).status_code == 400
    body["amount_cents"] = 10000
    created = api.post("/api/projects/2/resolution/proposals", headers=freelancer, json=body)
    assert created.status_code == 201
    proposal = created.json()["resolution"]["proposals"][-1]
    assert not proposal["approvals"]
    assert api.post(f"/api/projects/2/resolution/proposals/{proposal['id']}/approve", headers=client, json={"confirmed": True}).status_code == 200
    assert api.post("/api/projects/2/resolution/proposals", headers=freelancer, json=body).status_code == 409


def test_agreed_revision_allows_resubmission_and_new_review(api):
    client = login(api, "casey@demo.milestone.app")
    freelancer = login(api, "frankie@demo.milestone.app")
    project = api.get("/api/projects/2", headers=client).json()
    revision = next(p for p in project["resolution"]["proposals"] if p["kind"] == "revision")
    for headers in (client, freelancer):
        assert api.post(f"/api/projects/2/resolution/proposals/{revision['id']}/approve", headers=headers, json={"confirmed": True}).status_code == 200
    executed = api.post(f"/api/projects/2/resolution/proposals/{revision['id']}/execute", headers=client, json={"confirmed": True})
    assert executed.status_code == 200
    assert executed.json()["status"] == "in_progress"
    assert executed.json()["milestone"]["payment"] == project["milestone"]["payment"]
    submitted = api.post("/api/projects/2/delivery", headers=freelancer, json={"url": "https://brand.example/updated", "summary": "Revised social templates with requested formats and usage spacing.", "evidence": ["social templates formats updated", "usage spacing guide updated"]})
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "delivery_review"
    reopened = api.post("/api/projects/2/resolution", headers=client, json={"reason": "Please clarify whether the updated source files include editable social templates."})
    assert reopened.status_code == 200
    assert reopened.json()["resolution"]["id"] != project["resolution"]["id"]
    assert reopened.json()["resolution"]["status"] == "open"


def test_scope_editor_creates_a_new_version_and_clears_prior_approvals(api):
    freelancer = login(api, "frankie@demo.milestone.app")
    client = login(api, "casey@demo.milestone.app")
    created = api.post("/api/projects", headers=freelancer, json={"title": "New scope review", "brief": "Deliver a responsive website with mobile and desktop evidence and source files.", "client_email": "casey@demo.milestone.app", "amount_cents": 100, "currency": "USD", "due_date": "2026-12-01"}).json()
    project_id = created["id"]
    api.post(f"/api/projects/{project_id}/agreement/approve", headers=freelancer, json={"confirmed": True})
    body = {"summary": "Deliver a portfolio with three documented page routes and one revision round.", "ambiguities": [], "out_of_scope": ["Ongoing hosting"], "items": [{"title": "Portfolio pages", "description": "Provide three public page URLs.", "criteria": [{"description": "Three page URLs appear in the delivery evidence.", "check_type": "routes", "expected": "3"}]}]}
    assert api.post(f"/api/projects/{project_id}/agreement/versions", headers=client, json=body).status_code == 403
    body["items"][0]["criteria"][0]["expected"] = "invalid"
    assert api.post(f"/api/projects/{project_id}/agreement/versions", headers=freelancer, json=body).status_code == 422
    body["items"][0]["criteria"][0]["expected"] = "3"
    edited = api.post(f"/api/projects/{project_id}/agreement/versions", headers=freelancer, json=body)
    assert edited.status_code == 200
    assert edited.json()["agreement"]["version"] == 2
    assert not edited.json()["agreement"]["approvals"]
    assert edited.json()["agreement"]["items"][0]["title"] == "Portfolio pages"
    for headers in (freelancer, client):
        api.post(f"/api/projects/{project_id}/agreement/approve", headers=headers, json={"confirmed": True})
    assert api.post(f"/api/projects/{project_id}/agreement/versions", headers=freelancer, json=body).status_code == 409
