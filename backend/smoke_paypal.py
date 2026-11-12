"""Create a $1 PayPal Sandbox order through the real app without charging a buyer.

Run from backend/: python smoke_paypal.py
The project lives in an isolated temporary SQLite database. A Sandbox order is
created externally, but no buyer approval, capture, or refund is performed.
"""

import os
import tempfile
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


def main() -> None:
    if not os.getenv("PAYPAL_CLIENT_ID") or not os.getenv("PAYPAL_CLIENT_SECRET"):
        raise SystemExit("PayPal Sandbox credentials are missing from .env")

    with tempfile.TemporaryDirectory(prefix="milestone-sandbox-") as scratch:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(scratch) / 'smoke.db'}"
        from main import app
        from core.database import engine

        with TestClient(app) as api:
            def sign_in(email: str) -> dict[str, str]:
                response = api.post("/api/auth/login", json={"email": email, "password": "Demo123!"})
                response.raise_for_status()
                return {"Authorization": f"Bearer {response.json()['access_token']}"}

            freelancer = sign_in("frankie@demo.milestone.app")
            client = sign_in("casey@demo.milestone.app")
            created = api.post("/api/projects", headers=freelancer, json={
                "title": "Sandbox checkout smoke test",
                "brief": "Build a simple responsive two page portfolio site with a contact form and a clear delivery link.",
                "client_email": "casey@demo.milestone.app",
                "amount_cents": 100,
                "currency": "USD",
                "due_date": "2026-11-30",
            })
            created.raise_for_status()
            project_id = created.json()["id"]
            for actor in (freelancer, client):
                response = api.post(f"/api/projects/{project_id}/agreement/approve", headers=actor, json={"confirmed": True})
                response.raise_for_status()

            order = api.post(f"/api/projects/{project_id}/payment/order", headers=client, json={"confirmed": True})
            print(f"PayPal Sandbox order HTTP: {order.status_code}")
            if order.status_code != 200:
                print(f"Reason: {order.json().get('detail', 'unknown')}")
                raise SystemExit(1)
            payment = order.json()["milestone"]["payment"]
            print(f"Mode: {payment['mode']}")
            print(f"Order created: {bool(payment['order_id'])}")
            print(f"Buyer approval link returned: {bool(payment['approval_url'])}")
            if not payment["approval_url"]:
                base = os.getenv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com").rstrip("/")
                with httpx.Client(timeout=20) as paypal:
                    token_response = paypal.post(f"{base}/v1/oauth2/token", auth=(os.environ["PAYPAL_CLIENT_ID"], os.environ["PAYPAL_CLIENT_SECRET"]), data={"grant_type": "client_credentials"})
                    token_response.raise_for_status()
                    details = paypal.get(f"{base}/v2/checkout/orders/{payment['order_id']}", headers={"Authorization": f"Bearer {token_response.json()['access_token']}"})
                    details.raise_for_status()
                    print("PayPal link relations:", [link.get("rel") for link in details.json().get("links", [])])
        engine.dispose()
        if payment["mode"] != "sandbox" or not payment["approval_url"]:
            raise SystemExit("Sandbox order did not return a buyer approval link")


if __name__ == "__main__":
    main()
