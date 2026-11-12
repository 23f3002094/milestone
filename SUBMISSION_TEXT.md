# Submission text

## Project name

Milestone

## Short pitch

A shared freelancer-client workspace connecting clear agreements, delivery evidence, live AI reviews, and human-approved PayPal payment workflows.

## Description

Freelance disagreements become harder when the agreement, delivery proof, and payment concern live in different places. Milestone brings the whole story into one shared workspace.

The freelancer defines deliverables and measurable acceptance criteria. Both people approve the same agreement version before the client creates a PayPal Sandbox order for the locked milestone amount. Submitted evidence stays beside the agreed criteria so the client can review the work in context.

When a concern arises, the AI Resolution Copilot reads the recorded agreement, delivery evidence, check results, and concern. It returns evidence gaps, clarifying questions, and human next steps. The advisory is saved and can be exported with the project record. AI cannot accept work, determine a refund amount, or authorize a payment.

People can propose a revision or financial adjustment, approve the same terms from both accounts, and confirm the agreed outcome. The server enforces project membership, role permissions, matching approvals, locked payment values, and the available captured balance. Agreed revisions support updated delivery and another review.

## PayPal and AI usage

- PayPal Sandbox REST API: real order creation was verified, including the returned PayPal reference and buyer approval URL. Capture and refund endpoints are implemented; external Sandbox capture and refund remain unverified.
- GroqCloud Chat Completions API: live structured advisory reviews using `openai/gpt-oss-20b`, with saved evidence gaps, questions, and next steps.
- Seeded delivery and payment examples demonstrate the later workflow stages. Their payment references and delivery links are simulated and must be identified as sample data.

## Tools and technologies

PayPal Sandbox API; GroqCloud; openai/gpt-oss-20b; React; TypeScript; Vite; FastAPI; SQLAlchemy; SQLite for local persistence; PostgreSQL deployment support; Alembic; pytest; Vitest.

## Source code

https://github.com/23f3002094/milestone

## Functional build

Use the public repository's README setup instructions to run the build locally. The submission allows complete setup instructions instead of a hosted demo. A localhost URL is only accessible on the computer running the app.

## License

MIT, with LICENSE at the repository root.

## Video

Add the public YouTube URL after confirming the uploaded video is under three minutes.
