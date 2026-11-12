import importlib

from fastapi.testclient import TestClient


def test_happy_path_and_locked_amount(tmp_path, monkeypatch):
    monkeypatch.setenv("MILESTONE_DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.delenv("PAYPAL_CLIENT_ID", raising=False)
    import app as app_module

    importlib.reload(app_module)
    client = TestClient(app_module.app)

    project = client.post("/api/projects", json={
        "title": "Test launch",
        "brief": (
            "Build a responsive 3 page site for $900 by Friday with a contact form, "
            "client supplied copy, Chrome support, and one revision."
        ),
    }).json()
    assert project["total_cents"] == 90_000
    assert len(project["scope"]["requirements"]) >= 3

    project_id = project["id"]
    for role, name in (("client", "Casey Client"), ("freelancer", "Frankie Freelancer")):
        response = client.post(f"/api/projects/{project_id}/approve", json={
            "role": role, "name": name, "confirmed": True,
        })
        assert response.status_code == 200
    assert response.json()["status"] == "locked"

    response = client.post(f"/api/projects/{project_id}/payment/create", json={
        "actor": "Casey Client", "confirmed": True,
    })
    assert response.json()["payment"]["mode"] == "demo"

    response = client.post(f"/api/projects/{project_id}/payment/capture", json={
        "actor": "Casey Client", "confirmed": True,
    })
    assert response.json()["payment"]["captured_cents"] == 90_000

    response = client.post(f"/api/projects/{project_id}/deliverable", json={
        "actor": "Frankie Freelancer",
        "url": "https://example.com",
        "summary": "Three routes are live and the contact form was submitted.",
        "evidence": [
            "https://example.com https://example.com/about https://example.com/contact",
            "mobile desktop responsive screenshots",
            "contact submitted successfully",
        ],
    })
    assert response.status_code == 200

    evaluation = client.post(f"/api/projects/{project_id}/evaluate").json()["evaluation"]
    assert evaluation["total"] >= 3
    assert evaluation["passed"] >= 3

    accepted = client.post(f"/api/projects/{project_id}/accept", json={
        "actor": "Casey Client", "confirmed": True,
    }).json()
    assert accepted["status"] == "accepted"


def test_refund_requires_joint_exact_approval(tmp_path, monkeypatch):
    monkeypatch.setenv("MILESTONE_DB_PATH", str(tmp_path / "resolution.db"))
    monkeypatch.delenv("PAYPAL_CLIENT_ID", raising=False)
    import app as app_module

    importlib.reload(app_module)
    client = TestClient(app_module.app)
    project = client.post("/api/demo").json()
    project_id = project["id"]

    for role in ("client", "freelancer"):
        client.post(f"/api/projects/{project_id}/approve", json={
            "role": role, "name": role.title(), "confirmed": True,
        })
    client.post(f"/api/projects/{project_id}/payment/create", json={
        "actor": "Client", "confirmed": True,
    })
    client.post(f"/api/projects/{project_id}/payment/capture", json={
        "actor": "Client", "confirmed": True,
    })
    client.post(f"/api/projects/{project_id}/deliverable", json={
        "actor": "Freelancer",
        "url": "https://example.com",
        "summary": "Initial site submission requiring review.",
        "evidence": ["Home page only"],
    })
    client.post(f"/api/projects/{project_id}/evaluate")
    resolution = client.post(f"/api/projects/{project_id}/resolution", json={
        "actor": "Client",
        "complaint": "The contact form and remaining pages are not evidenced.",
    }).json()["resolution"]
    amount = next(item["amount_cents"] for item in resolution["options"] if item["id"] == "partial_refund")

    rejected = client.post(f"/api/projects/{project_id}/refund", json={
        "actor": "Client", "amount_cents": amount, "confirmed": True,
    })
    assert rejected.status_code == 409

    for role in ("client", "freelancer"):
        client.post(f"/api/projects/{project_id}/resolution/approve", json={
            "role": role,
            "name": role.title(),
            "option_id": "partial_refund",
            "confirmed": True,
        })
    wrong_amount = client.post(f"/api/projects/{project_id}/refund", json={
        "actor": "Client", "amount_cents": amount + 1, "confirmed": True,
    })
    assert wrong_amount.status_code == 409

    refunded = client.post(f"/api/projects/{project_id}/refund", json={
        "actor": "Client", "amount_cents": amount, "confirmed": True,
    }).json()
    assert refunded["status"] == "resolved"
    assert refunded["payment"]["refunded_cents"] == amount
