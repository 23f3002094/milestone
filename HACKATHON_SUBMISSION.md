# Milestone - AI Resolution Copilot for Freelance Payments

## Submission description

Freelance payments become difficult when the agreement, delivery proof, and a concern live in different places. Milestone gives a freelancer and client one shared workspace: define a measurable agreement, approve the same version, create PayPal Sandbox checkout for the locked milestone, attach delivery evidence, and review the work together.

The AI Resolution Copilot compares the recorded agreement, acceptance criteria, submitted evidence, checks, and concern. It returns evidence gaps, clarifying questions, and human next steps. Reviews are saved with their source context. Both people retain control of acceptance and every financial action.

The prototype includes scope editing, project search, switching between two prototype accounts, saved AI reviews, custom resolution proposals, revised delivery submissions, and exported project records. Refund proposals require matching approvals from both people and a separate client confirmation. The server calculates the available captured balance.

## What has been verified

- A real PayPal Sandbox order was created through the app, with a PayPal reference and buyer approval link.
- Groq returned a live advisory review, which survived reload and was included in the exported record.
- The sample workflow, including capture and a jointly approved refund, passed backend and browser checks.
- Buyer approval, capture, and refund through the external PayPal Sandbox API have not been verified. The recording can show order creation without completing buyer checkout. Seeded payment references and sample delivery links must be identified as simulated.

## Tools used

- **PayPal Sandbox REST API:** verified Orders API integration; capture and capture-refund endpoints are implemented but remain externally unverified.
- **GroqCloud Chat Completions API:** structured advisory reviews using `openai/gpt-oss-20b`. Provider and model are configurable.
- **FastAPI and SQLAlchemy:** protected workflow, local SQLite persistence, PostgreSQL support, role checks, and activity records.
- **React, TypeScript, and Vite:** responsive product with separate client and freelancer experiences.

## Demo storyboard - 2 minutes 45 seconds

This recording plan does not require completing buyer checkout. Keep simulated examples clearly labelled.

1. **0:00-0:15 - Introduce the problem.** Show the workspace and four-step guide. Explain that Milestone brings the agreement, delivery proof, and payment concern together.
2. **0:15-0:35 - Agree the scope.** Show editable acceptance criteria and both approvals on the same version. Use Switch demo role to move between the accounts.
3. **0:35-1:00 - Create real PayPal checkout.** As the client, create a Sandbox order for a new locked milestone. Show its actual PayPal reference and approval link. Say: "This is a real Sandbox API order using test money. Buyer approval and capture are pending."
4. **1:00-1:15 - Review a delivery example.** Open Northstar's sample delivery and show evidence beside the criteria. Identify its payments and delivery links as sample data.
5. **1:15-1:55 - Show live AI.** Request a Cedar & Finch advisory. Show one evidence gap, one question, and one next step. Say: "The project is an example; this AI response is live and saved. People decide the outcome."
6. **1:55-2:25 - Demonstrate human approvals.** Propose a resolution, approve it from both accounts, and show the separate client confirmation. Identify any sample refund as simulated with no money movement.
7. **2:25-2:45 - Show the record.** Open the activity trail and export the project record. Close with the connected scope, evidence, and human approvals.

## Judge setup

See README.md for local setup. PayPal and AI credentials enable external integrations. Without credentials, sample workflows still run; AI requests explain that a provider must be configured.

| Role | Email | Password |
|---|---|---|
| Freelancer | `frankie@demo.milestone.app` | `Demo123!` |
| Client | `casey@demo.milestone.app` | `Demo123!` |

A public source repository and public YouTube video under three minutes are required submission materials. Clear repository setup instructions can satisfy the functional demo requirement in place of a hosted URL.
