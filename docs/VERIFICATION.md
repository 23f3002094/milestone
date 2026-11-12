# Verification — November 12, 2026

## Automated checks

- Backend: 11 tests passed, including role restrictions, complete sample workflow, conflicting proposal rejection, refund balance limits, persisted AI reviews, editable scope versions, and revision resubmission.
- Frontend: production build and lint passed; 2 existing component tests passed.
- Browser: Microsoft Edge with Playwright exercised creation, scope editing, both agreement approvals, sample capture, delivery, a custom proposal, both resolution approvals, and a sample refund against an isolated temporary database.
- Browser: project search, role switching while keeping the current route, advisory export, and eight public/product routes were checked. No browser JavaScript errors or mobile horizontal overflow were observed at a 390px viewport.

## External integrations

- Groq returned HTTP 200 using `openai/gpt-oss-20b` for a live Cedar & Finch evidence review. The returned advisory survived a page reload and was included in the exported record.
- The configured server reports PayPal Sandbox mode. A real USD 1.00 Sandbox order exists with a buyer approval link. Buyer approval, capture, and refund of that live Sandbox order are still pending verification.
- Seeded `DEMO-*` references and sample delivery URLs are walkthrough fixtures. The isolated browser capture/refund check used the sample adapter and is not proof of a PayPal API capture/refund.

## Screenshots

- `landing-premium.png` — public product introduction and interactive workflow illustration
- `dashboard-premium.png` — project overview, next action, and stage distribution
- `payment-premium.png` — the actual new Sandbox order awaiting approval/capture
- `ai-resolution-room.png` — live, persisted Groq review with human resolution options
- `mobile-premium.png` and `mobile-resolution.png` — responsive product views

The source is published at https://github.com/23f3002094/milestone with an MIT license. The user reports uploading a YouTube recording; its URL, visibility, and final runtime still need to be checked. Hackathon form submission remains pending.

The user chose to leave buyer checkout and capture pending. The current recording plan demonstrates verified Sandbox order creation and live AI, followed by clearly labelled sample delivery and resolution transactions.
