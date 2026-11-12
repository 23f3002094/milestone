# Milestone recording script - target 2 minutes 45 seconds

This script shows the current working prototype without completing PayPal buyer checkout. The PayPal order and AI request are real external API calls. The Northstar and Cedar & Finch payments are simulated sample transactions.

## Before recording

1. Keep the backend and frontend running. Open http://127.0.0.1:5173 and refresh with Ctrl+F5.
2. Sign in as Frankie, the freelancer. If signed in as Casey, use Switch demo role.
3. A draft has been prepared: **Recording walkthrough - website launch**, USD 1.00. Its agreement is at http://127.0.0.1:5173/app/projects/4/agreement. It has no approvals or payment order yet.
4. Use a single browser tab. Switch demo role changes accounts while preserving the current project.
5. Record at 1080p with readable browser text. Close unrelated tabs and notifications. Keep keys, .env, and developer credential pages off screen. No background music is needed.
6. Record short clips and join them if needed. Cut idle typing or provider waiting time; do not imply an unfinished payment completed. Keep the final video below three minutes.
7. Cedar & Finch's selected proposal is **Adjusted final payment**, USD 360. Casey has already approved it. Frankie still needs to approve. Other proposals are locked out. Do not execute the final outcome during rehearsal: it closes this sample case and its approval buttons disappear.

## 0:00-0:15 - Introduce the product

**Show:** Frankie dashboard. Briefly point to a project card, then open How it works and its four steps.

**Say:**

"Freelance disagreements become harder when the agreement, delivery proof, and payment live in different places. Milestone brings them together: agree the scope, pay through PayPal, deliver evidence, and decide the next step together."

## 0:15-0:45 - Show the agreement working

**Show and click:**

- Open Projects, then Recording walkthrough - website launch, then Agreement.
- Click Edit scope. Change the first Deliverable title to **Published website**. Click Save version 2. If you have already edited the project, use the version number shown in the app.
- Click Approve version 2 as Frankie.
- Click Switch demo role. You are now Casey.
- Click Approve version 2. Point to LOCKED and both approvals.

**Say:**

"Frankie is the freelancer and Casey is the client. The freelancer can refine deliverables and acceptance criteria before anyone pays. Saving creates a new version. Both people approve that same version, and the agreement locks. Switching roles here signs into the other prototype account; server permissions still apply."

## 0:45-1:05 - Show the real PayPal integration

**Show and click:**

- Stay signed in as Casey. Open Payment in this new project.
- Click Create payment order.
- Point to the actual order reference, Sandbox badge, USD 1.00 amount, and Approve in PayPal link.
- Do not click Approve in PayPal or Confirm capture.

**Say:**

"The client now creates a real PayPal Sandbox order. Its amount comes from the locked agreement. PayPal returns this order reference and buyer approval link. Sandbox uses test money. Buyer approval and capture remain pending; this recording demonstrates verified order creation."

## 1:05-1:20 - Show delivery evidence

**Show and click:**

- Open Projects, then Northstar Studio website, then Delivery.
- Scroll through the acceptance criteria and Submitted evidence.
- Keep the example delivery link inside the app; it is sample data.

**Say:**

"This prepared example shows the next stage: delivery evidence beside the agreed criteria. Its payment and delivery links are sample data. Checks organize the proof; the client still reviews the actual work and chooses acceptance or a concern."

## 1:20-1:55 - Show the live AI review

**Show and click:**

- Open Cedar & Finch brand launch, then Resolution Room.
- Briefly show the concern about social formats and spacing guidance.
- Click Refresh AI review, or Ask AI to prepare review if no review is saved.
- Once the response arrives, show LIVE MODEL RESPONSE and the configured model.
- Click Evidence gaps, Questions to ask, and Next steps. Read one short returned item if time allows.
- Cut long provider waiting time from the edited video.

**Say:**

"Here the client questions the social launch formats and usage guidance. The project is a sample, but this Groq AI request is live. It reads the recorded agreement, evidence, and concern to prepare evidence gaps, questions, and next steps. The review is saved with the project. AI does not approve work, set a refund amount, or authorize payment."

## 1:55-2:25 - Show two-party approval and sample execution

**Show and click:**

- Scroll to Adjusted final payment, USD 360. Point to Casey's Approved status and Frankie's Not approved status.
- Click Switch demo role to become Frankie.
- On Adjusted final payment, click Review & approve, inspect the modal, and click Approve these terms.
- Show Approved by both people.
- Click Switch demo role to return to Casey.
- Click Confirm financial action on that same proposal.
- The modal explains that this is the sample adapter. Click Confirm outcome.
- Show the recorded-outcome message.

**Say:**

"Casey has already selected this 360-dollar adjustment. I switch to Frankie, inspect the exact terms, and approve the same proposal. Both approvals are required. The client then confirms a separate final action. This example records a simulated refund; it moves no money and leaves our real Sandbox checkout untouched."

## 2:25-2:45 - Show the saved record and close

**Show and click:**

- Open Payment on Cedar & Finch. Show sample captured value, refunded value, and the remaining amount.
- Open Activity. Show the latest resolution event and actor.
- Click Export record to download the project JSON.

**Say:**

"The sample payment outcome, approvals, and actor are recorded in a real database. This record also includes the agreement, evidence, and saved AI advisory, and can be exported. Milestone connects clear scope and visible proof to a decision both people approve."

## After recording

- Trim the final video to approximately 2:45, and keep it strictly under 3:00.
- Upload it publicly to YouTube and use that URL in the submission.
- Pair it with the public source repository, setup instructions, license, project description, and tools used.
- Keep the claims accurate: verified Sandbox order creation and live AI; simulated sample capture/refund; external Sandbox capture/refund unverified.

If recording another take, use a fresh draft for scope approval and order creation. After Cedar & Finch is resolved, show its recorded outcome or prepare another sample case; do not pretend the closed case still has pending approvals.
