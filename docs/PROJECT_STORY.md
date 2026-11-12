## Inspiration

Freelance disagreements often start with an unclear brief: what counts as finished, what evidence proves delivery, and what happens when expectations differ? A payment receipt cannot answer those questions on its own.

We built Milestone to connect the agreement, delivery evidence, and payment workflow in one shared workspace. Our idea was to use AI to help people understand a disagreement while keeping the decision with the freelancer and client.

## What it does

Milestone follows four steps: **Agree, Pay, Deliver, Decide.**

- The freelancer defines deliverables and acceptance criteria. Both people approve the same agreement version before it locks.
- The client creates a PayPal Sandbox order using the locked milestone amount and currency.
- Delivery links and supporting evidence stay beside the criteria so the client can review the work in context.
- If a concern arises, the AI Resolution Copilot prepares evidence gaps, clarifying questions, and suggested next steps from the recorded project facts.

People can propose a revision or financial adjustment and approve the same terms. Financial execution requires matching approvals and a separate client confirmation. An agreed revision allows updated delivery and another review.

The workspace also includes project search, guided navigation, saved AI reviews, activity history, and an exported project record.

## How we built it

We built the interface with **React, TypeScript, and Vite**, and the backend with **Python and FastAPI**. **SQLAlchemy and SQLite** persist projects, agreement versions, approvals, evidence, payment references, and AI reviews. Alembic supports schema migrations, with PostgreSQL deployment support.

**PayPal Sandbox REST APIs** connect payments to the locked milestone. The backend checks project membership, role permissions, matching approvals, payment values, and the remaining captured balance.

**GroqCloud**, using **openai/gpt-oss-20b**, generates structured advisory reviews. The model receives recorded scope, evidence, and concerns as context. It has no payment tools and cannot approve work or authorize money movement.

## Challenges we faced

One challenge was making the workflow understandable from both sides. We added role switching for the prototype, a four-step guide, and a visible next-action reminder inside each project.

Another was separating missing evidence from failed work. Text and URL checks organize the proof; they do not establish its quality. The AI review supports a human conversation rather than declaring a winner.

API configuration, quota limits, and PayPal checkout states also required careful handling. We made the AI provider configurable and clearly separated sample transactions from real Sandbox calls.

## What we accomplished

We verified **real PayPal Sandbox order creation** and **live Groq reviews**. AI reviews survive reload and are included in the exported record. Backend and browser checks cover scope editing, role restrictions, approvals, delivery, revisions, and the sample refund workflow.

The seeded delivery and payment examples are labelled as sample data. They let reviewers explore the later workflow while distinguishing simulated transactions from real API calls. External Sandbox buyer approval, capture, and refund remain unverified.

## What we learned

AI becomes more useful when it works from specific, shared records. Clear criteria and visible evidence give its advice context. We also learned that a polished interface needs a clear workflow: people should always know their role, the current stage, and the next action.

## What's next

Our next steps are completing external Sandbox capture and refund verification, adding merchant onboarding and webhook reconciliation, and testing the workflow with freelancers and clients.

The aim is simple: help both people move from an unclear disagreement to a specific, shared next step.
