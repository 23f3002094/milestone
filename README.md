# Milestone

Milestone is an AI Resolution Copilot for freelance payments. It turns vague project work into a shared, locked agreement; organizes delivery evidence; and helps both people prepare a fair resolution conversation before they choose a human-approved PayPal outcome.

Milestone is **not escrow, autonomous charging, legal adjudication, or a payment guarantee**. People approve every agreement, capture, resolution, and refund.

![Milestone workspace](docs/product-preview.png)

## Product experience

- A responsive cream and deep teal workspace with project cards, stage distribution, and a contextual next step. Dashboard PayPal totals exclude simulated sample transactions.
- Search projects with **Ctrl+K**, and use **Switch demo role** to sign in as the other seeded account while staying on the same project. Server membership and role checks still apply to every action.
- Start from a website or brand brief, then **Edit scope** as the freelancer before locking an agreement. Refine deliverables, acceptance criteria, evidence terms, and exclusions. Saving creates a new version and resets approvals.
- Follow three explicit payment steps: create the order, approve in PayPal Sandbox, then confirm capture. Capture and refund references remain visible in the payment record.
- View a live AI response in tabs for evidence gaps, questions, and next steps. Reviews are saved against the agreement, delivery, and resolution context and remain available after reload.
- **Propose your own** revision or partial refund. The selected proposal locks its terms; both people approve it before the client confirms execution. An agreed revision permits updated delivery and a new review.
- **Export record** downloads the project, evidence, AI advisory, payment references, and activity history as JSON.

![Milestone payment workflow](docs/payment-premium.png)

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Freelancer | `frankie@demo.milestone.app` | `Demo123!` |
| Client | `casey@demo.milestone.app` | `Demo123!` |

Seed data is persisted on the first database startup. It includes a website delivery ready for review and a brand project already in the Resolution Room.

These seeded projects are walkthrough fixtures: their `DEMO-*` payment IDs and example delivery links are simulated. New projects use real PayPal Sandbox API orders when Sandbox credentials are configured. PayPal Sandbox uses test money, as required by the challenge. AI reviews call the configured model live.

## Architecture

- **Frontend:** React, TypeScript, Vite, React Router. Public landing/sign-in plus routed dashboard, project list, project overview, agreement, payment, delivery, Resolution Room, and activity timeline.
- **API:** modular FastAPI routers, schemas, authentication, services, PayPal adapter, deterministic evidence checks, and an OpenAI-compatible AI Resolution Copilot.
- **Data:** SQLAlchemy normalized relational models and Alembic migrations. PostgreSQL is the deployment database; SQLite is the zero-setup fallback.
- **Security:** Argon2 password hashes, 12-hour signed JWTs, protected APIs, project membership/role checks, server-owned amounts and state transitions.
- **Financial integration:** PayPal sandbox orders, captures, and refunds. When credentials are absent, a safe demo adapter persists realistic transaction states without moving money.

## AI Resolution Copilot

The Resolution Room includes an on-demand AI advisory that reads only server-owned project context: the locked agreement, acceptance criteria, delivery summary/evidence, deterministic check results, and (when present) the resolution concern. It returns a structured review with:

- evidence to inspect;
- clarifying questions for the two parties; and
- concrete, human-reviewable next steps.

The AI has no payment tools and is explicitly prohibited from accepting work, determining legal liability, recommending a refund amount, or authorizing/capturing/refunding money. The browser cannot provide the project facts used for analysis. The advisory is requested explicitly, saved with its source context, displayed as advisory-only, and logged in the activity trail; it never changes project or payment state. Evidence checks inspect submitted text and URL structure; they do not browse remote pages or prove the quality of delivered work.

![AI Resolution Copilot reviewing the Cedar and Finch demo project](docs/ai-resolution-room.png)

Configure any OpenAI-compatible provider in `.env`:

```env
AI_API_KEY=your_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

For a GroqCloud free-plan demo, use `AI_BASE_URL=https://api.groq.com/openai/v1`, a Groq API key, and an `AI_MODEL` returned by Groq's `/models` endpoint. `openai/gpt-oss-20b` was verified with the JSON response format used by this app. Free-plan model availability and rate limits can vary by account.

### Relational model

Core tables are `users`, `projects`, `project_memberships`, `milestones`, `agreement_versions`, `scope_items`, `acceptance_criteria`, `approvals`, `deliverables`, `evidence`, `evaluations`, `paypal_orders`, `paypal_captures`, `paypal_refunds`, `resolution_cases`, `resolution_proposals`, `party_approvals`, `ai_reviews`, and append-only `audit_events`.

## Windows: zero-setup local run

Requirements: Python 3.10+ and Node.js 18+.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In another PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The SQLite fallback is created at `milestone.db`.

## PostgreSQL with Docker

```powershell
docker compose up -d postgres
$env:DATABASE_URL="postgresql+psycopg://milestone:milestone@127.0.0.1:5432/milestone"
cd backend
python -m alembic upgrade head
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Copy `.env.example` to `.env` for all configuration options; the server loads this root-level file automatically. Use a strong `JWT_SECRET` outside local demo use.

## Demo walkthrough without buyer checkout

1. Open **How it works** to see Agree, Pay, Deliver, and Decide.
2. As **Frankie**, create a project and refine its scope. Approve the same version from both accounts using **Switch demo role**.
3. As **Casey**, create a real PayPal Sandbox order. Show its actual order reference and approval link. Leave buyer checkout and capture pending if you are not completing the payment test.
4. Open **Northstar Studio website** to inspect sample delivery evidence. This project's payment references and delivery URLs are simulated.
5. Open **Cedar & Finch brand launch**, then **Resolution Room**, and request a live AI review. The project is seeded, but the configured AI response is live and persisted.
6. Approve the same proposal as both accounts. A sample financial action records a simulated refund and moves no money; identify it clearly in the recording.
7. Review the activity trail and use **Export record**.

Sandbox buyer approval, capture, and refund can be verified separately later. The current verified external payment operation is order creation. See HACKATHON_SUBMISSION.md for the recording script.

## PayPal sandbox

Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` for PayPal's sandbox API. The server:

- creates an order only for the locked milestone amount and currency;
- captures the known order and verifies PayPal's returned amount and currency;
- allows a refund only for a two-party-approved resolution proposal;
- calculates the refundable balance from persisted captures/refunds;
- never accepts an amount, actor, project role, or approval identity from the browser.

To demonstrate the live Sandbox path, create a **new** project as Frankie (the seeded projects remain in demo mode), approve its agreement from both accounts, then as Casey create the order. Click **Approve in PayPal**, sign in with a PayPal **Personal Sandbox buyer** account, return to Milestone, and click **Confirm capture**. Frankie can then submit delivery evidence; Casey can accept it or open a resolution. A refund is possible only after both accounts approve the same financial proposal and Casey confirms execution. The browser returns to the same payment page after buyer approval or cancellation.

For a quick credential and order check without buyer approval or capture, run `python smoke_paypal.py` from `backend/`. It creates a USD 1.00 order against PayPal Sandbox using an isolated temporary database and checks that PayPal returned a buyer approval link. This does not verify capture or refund; those require a Sandbox buyer to approve checkout.

Production merchant onboarding, webhook reconciliation, production credentials, and a production-grade double-entry ledger remain deployment work.

## Verification

```powershell
cd backend
python -m pytest

cd ..\frontend
npm run lint
npm test
npm run build
npm audit
```

After `npm run build`, FastAPI also serves the SPA at <http://127.0.0.1:8000>.

## Important files

- `backend/main.py` — application lifecycle, CORS, SPA serving
- `backend/core/models.py` — normalized SQLAlchemy model
- `backend/core/api.py` — authenticated workflow endpoints
- `backend/core/services.py` — authorization, serialization, evidence and PayPal services
- `backend/core/seed.py` — persisted demo users and projects
- `backend/alembic/` — schema migration environment
- `frontend/src/Workspace.tsx` — routed role-aware product surfaces
- `frontend/src/Experience.tsx` — landing, navigation, search, and dashboard
- `frontend/src/PaymentPanel.tsx` — guided PayPal checkout and payment records
- `frontend/src/ResolutionRoom.tsx` — persisted AI review, custom proposals, and approval flow
- `frontend/src/AgreementEditor.tsx` — versioned scope editing
- `frontend/src/design.css` — responsive visual system
- `backend/test_workflows.py` — auth, authorization, happy path, two-party resolution tests

## License

MIT
