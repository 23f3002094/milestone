import { FormEvent, useState } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BadgeCheck, Check, CircleDollarSign, Clock3, FileCheck2, FileText, Lightbulb, LoaderCircle, MessageSquareText, Plus, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { client } from "./client";
import type { AiResolutionReview, ProjectDetail } from "./domain";
import { Badge, Button, Empty, Modal } from "./ui";
import { date, downloadRecord, initials, money } from "./workspace-utils";

type Proposal = NonNullable<ProjectDetail["resolution"]>["proposals"][number];
type Action = (promise: Promise<ProjectDetail>) => Promise<void>;

export default function ResolutionRoom({ project, act }: { project: ProjectDetail; act: Action }) {
  const resolution = project.resolution;
  const [review, setReview] = useState<AiResolutionReview | null>(project.ai_review);
  const [reviewError, setReviewError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewTab, setReviewTab] = useState(0);
  const [showProposal, setShowProposal] = useState(false);
  const [confirmation, setConfirmation] = useState<{ proposal: Proposal; execute: boolean } | null>(null);
  const requestReview = async () => {
    setReviewing(true); setReviewError("");
    try { setReview(await client.aiResolutionReview(project.id)); }
    catch (error) { setReviewError(error instanceof Error ? error.message : "AI review could not be completed."); }
    finally { setReviewing(false); }
  };
  if (!resolution) return <div className="surface"><Empty icon={<MessageSquareText />} title="Start with the delivery" body="When submitted work needs a conversation, open a concern from the Delivery tab. The agreement and evidence will come with you." /><Link className="ms-button empty-cta" to={`/app/projects/${project.id}/delivery`}>Review delivery <ArrowRight /></Link></div>;
  const selected = resolution.proposals.find((proposal) => proposal.approvals.length > 0);
  const completed = resolution.status === "resolved";
  const evidence = project.milestone.deliverable;
  const tabs = [{ name: "Evidence gaps", icon: FileText, items: review?.evidence_gaps ?? [] }, { name: "Questions to ask", icon: MessageSquareText, items: review?.clarifying_questions ?? [] }, { name: "Next steps", icon: Lightbulb, items: review?.suggested_next_steps ?? [] }];
  return <div className="resolution-page"><div className="resolution-intro"><div><div className="eyebrow"><MessageSquareText size={15} /> A SHARED SPACE TO MOVE FORWARD</div><h2>Find the next <em>fair step.</em></h2><p>Start with the facts. Get perspective. Agree on what happens next.</p></div><button className="ms-button secondary" onClick={() => downloadRecord({ ...project, ai_review: review }, `milestone-${project.id}-resolution.json`)}><ArrowDownToLine /> Export record</button></div>
    {completed && <div className="resolution-complete"><BadgeCheck /><div><b>A shared outcome is on record.</b><p>{project.status === "in_progress" ? "A revision was agreed. The freelancer can now submit updated delivery evidence." : "Review the payment record and activity trail for the recorded outcome."}</p></div><Link to={`/app/projects/${project.id}/${project.status === "in_progress" ? "delivery" : "activity"}`}>View next step <ArrowRight /></Link></div>}
    <div className="resolution-layout"><div className="resolution-main"><section className="concern-card"><div className="concern-label"><span><MessageSquareText /></span><small>THE CONCERN, IN THEIR WORDS</small><Badge value={resolution.status} /></div><blockquote>“{resolution.reason}”</blockquote><div className="concern-foot"><ShieldCheck /><span>A concern opens a conversation. No money moves automatically.</span></div></section>
    <section className="copilot-studio"><div className="copilot-studio-head"><div className="copilot-icon"><Sparkles /></div><div><small>AI RESOLUTION COPILOT</small><h3>A clearer view of the evidence.</h3></div><span className="advisory-label">ADVISORY ONLY</span></div><p className="copilot-description">Your locked scope, delivery proof, and concern become a focused review you can discuss together.</p><div className="copilot-source-tags"><span><FileCheck2 /> Agreement v{project.agreement.version}</span><span><FileText /> {evidence?.evidence.length ?? 0} evidence records</span><span><MessageSquareText /> Stated concern</span></div>
      {!review && !reviewing && <div className="copilot-ready"><div className="copilot-empty-art"><Sparkles /><span /><span /><span /></div><h4>Better questions lead to better outcomes.</h4><p>Ask the copilot to find missing proof, prepare questions, and suggest human next steps.</p></div>}
      {reviewing && <div className="copilot-loading" role="status"><span className="ai-loader"><Sparkles /></span><h4>Reviewing your recorded scope and evidence…</h4><p>Waiting for the configured AI provider. Your project and payment state stay under human control.</p><div className="skeleton-lines"><i /><i /><i /></div></div>}
      {reviewError && <div className="form-error" role="alert">{reviewError}</div>}
      {review && !reviewing && <div className="copilot-result"><div className="review-provenance"><span className="live-dot" /> LIVE MODEL RESPONSE <span>{review.provider}</span>{review.generated_at && <time dateTime={review.generated_at}>{date(review.generated_at)}</time>}</div><h4>{review.summary}</h4><div className="review-tabs" role="tablist" aria-label="AI review details">{tabs.map((tab, index) => <button id={`review-tab-${index}`} aria-controls="review-detail" key={tab.name} role="tab" aria-selected={reviewTab === index} className={reviewTab === index ? "active" : ""} onClick={() => setReviewTab(index)}>{tab.name}<span>{tab.items.length}</span></button>)}</div><div id="review-detail" role="tabpanel" aria-labelledby={`review-tab-${reviewTab}`} className="review-detail">{tabs[reviewTab].items.length ? tabs[reviewTab].items.map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></article>) : <p>No specific items were returned in this category. Review the evidence together.</p>}</div><p className="ai-guardrail"><ShieldCheck />{review.guardrail}</p></div>}
      <div className="copilot-actions"><span><ShieldCheck /> The copilot cannot authorize payments.</span><Button onClick={() => void requestReview()} disabled={reviewing}>{reviewing ? <><LoaderCircle className="spin" /> Preparing review</> : <><Sparkles /> {review ? "Refresh AI review" : "Ask AI to prepare review"}</>}</Button></div>
    </section></div>
    <aside className="resolution-facts"><section className="surface compact"><div className="surface-head"><div><small>YOUR SHARED REFERENCE</small><h3>The facts stay visible.</h3></div><FileCheck2 /></div><div className="fact-row"><span>Agreement</span><b>Version {project.agreement.version} <Check /></b></div><div className="fact-row"><span>Scope items</span><b>{project.agreement.items.length}</b></div><div className="fact-row"><span>Evidence records</span><b>{evidence?.evidence.length ?? 0}</b></div><div className="fact-row"><span>Captured</span><b>{money(project.milestone.payment?.captured_cents ?? 0, project.currency)}</b></div><div className="fact-row"><span>Refunded</span><b>{money(project.milestone.payment?.refunded_cents ?? 0, project.currency)}</b></div><Badge value={project.milestone.payment?.mode ?? "Not created"} /><Link className="text-link" to={`/app/projects/${project.id}/delivery`}>Inspect delivery proof <ArrowUpRight /></Link></section><section className="resolution-people"><small>TWO PEOPLE. ONE AGREEMENT.</small>{project.members.map((member) => <div className="person" key={member.id}><span>{initials(member.name)}</span><div><b>{member.name}</b><small>{member.role}</small></div></div>)}<p><ShieldCheck /> Both parties must approve the same proposal before the client confirms any financial action.</p></section></aside></div>
    <div className="section-row"><div><small>THE DECISION BELONGS TO YOU</small><h3>Choose a way forward.</h3></div>{!completed && !selected && <Button secondary onClick={() => setShowProposal(true)}><Plus /> Propose your own</Button>}</div>
    <div className="proposal-grid">{resolution.proposals.map((proposal) => {
      const mine = proposal.approvals.some((approval) => approval.role === project.viewer_role);
      const agreed = proposal.approvals.length === 2;
      const lockedOut = Boolean(selected && selected.id !== proposal.id);
      const financial = ["partial_refund", "adjusted_final_payment"].includes(proposal.kind);
      return <article className={`${agreed ? "agreed" : ""} ${lockedOut ? "unselected" : ""}`} key={proposal.id}><div className="proposal-top"><span className="proposal-icon">{proposal.kind === "revision" ? <Send /> : financial ? <CircleDollarSign /> : <Plus />}</span><small>{financial ? "FINANCIAL OUTCOME" : "WORK AGREEMENT"}</small>{agreed && <Badge value="locked" />}</div><h3>{proposal.title}</h3><p>{proposal.description}</p><div className="proposal-value">{proposal.amount_cents > 0 ? <><strong>{money(proposal.amount_cents, project.currency)}</strong><small>{financial ? "Refund amount" : "Future milestone value · no charge here"}</small></> : <><strong>No payment change</strong><small>Agree a focused revision and resubmit</small></>}</div><div className="proposal-approvals">{project.members.map((member) => { const approved = proposal.approvals.some((approval) => approval.user_id === member.id); return <div key={member.id}><span className={approved ? "approved" : ""}>{approved ? <Check /> : initials(member.name)}</span><small>{member.role}<b>{approved ? "Approved" : "Not approved"}</b></small></div>; })}</div>
      {!completed && !mine && !agreed && <Button secondary disabled={lockedOut} onClick={() => setConfirmation({ proposal, execute: false })}>{lockedOut ? "Another proposal selected" : "Review & approve"}<ArrowRight /></Button>}
      {!completed && mine && !agreed && <div className="waiting"><Clock3 /> Waiting for the other party</div>}
      {!completed && agreed && project.viewer_role === "client" && <Button onClick={() => setConfirmation({ proposal, execute: true })}>{financial ? "Confirm financial action" : "Record agreed outcome"}<ArrowRight /></Button>}
      {agreed && <div className="agreed-label"><BadgeCheck /> {completed ? "Agreed outcome recorded" : "Approved by both people"}</div>}
      </article>;
    })}</div>
    <div className="resolution-guardrail"><ShieldCheck /><div><b>People approve the terms. PayPal records the payment.</b><p>The AI advisory never selects a proposal or sets a refund amount. Each selected proposal locks for both people, and any refund is limited to the captured balance.</p></div></div>
    {showProposal && <ProposalForm project={project} act={act} onClose={() => setShowProposal(false)} />}
    {confirmation && <Modal title={confirmation.execute ? "Confirm the agreed outcome" : "Review your approval"} onClose={() => setConfirmation(null)}><div className="confirmation-terms"><Badge value={confirmation.proposal.kind} /><h3>{confirmation.proposal.title}</h3><p>{confirmation.proposal.description}</p>{confirmation.proposal.amount_cents > 0 && <strong>{money(confirmation.proposal.amount_cents, project.currency)}</strong>}</div><p className="modal-explanation">{confirmation.execute ? ["partial_refund", "adjusted_final_payment"].includes(confirmation.proposal.kind) ? `Both people approved these exact terms. This action submits the refund through ${project.milestone.payment?.mode === "demo" ? "the sample adapter; no money moves" : "PayPal Sandbox using test funds"}.` : "Both people approved these exact terms. This records the agreed next step." : "Approving selects and locks this proposal for the other party to review. Financial execution requires both approvals and a separate confirmation by the client."}</p><div className="modal-actions"><Button secondary onClick={() => setConfirmation(null)}>Keep reviewing</Button><Button onClick={() => { const { proposal, execute } = confirmation; setConfirmation(null); void act(execute ? client.executeProposal(project.id, proposal.id) : client.approveProposal(project.id, proposal.id)); }}>{confirmation.execute ? "Confirm outcome" : "Approve these terms"}<Check /></Button></div></Modal>}
  </div>;
}

function ProposalForm({ project, act, onClose }: { project: ProjectDetail; act: Action; onClose: () => void }) {
  const [kind, setKind] = useState("revision");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const balance = (project.milestone.payment?.captured_cents ?? 0) - (project.milestone.payment?.refunded_cents ?? 0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cents = kind === "revision" ? 0 : Math.round(Number(amount) * 100);
    if (kind !== "revision" && (cents <= 0 || cents > balance)) { setError("Choose a refund amount within the remaining captured balance."); return; }
    onClose(); void act(client.createProposal(project.id, { kind, title, description, amount_cents: cents }));
  };
  return <Modal title="Propose a way forward" onClose={onClose}><form onSubmit={submit}><p className="modal-explanation">Write specific terms both people can review. Creating a proposal does not approve it or move money.</p><label className="field-label">Outcome type<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="revision">Focused revision</option><option value="partial_refund">Partial refund</option></select></label><label className="field-label">Proposal title<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deliver the missing social formats by Friday" /></label><label className="field-label">Specific terms<textarea required minLength={10} maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Define exactly what happens next and how both people will confirm it." /></label>{kind !== "revision" && <label className="field-label">Refund amount ({project.currency})<input required type="number" min="0.01" step="0.01" max={balance / 100} value={amount} onChange={(event) => setAmount(event.target.value)} /><small>Available captured balance: {money(balance, project.currency)}</small></label>}{error && <div className="form-error">{error}</div>}<div className="modal-actions"><Button secondary onClick={onClose}>Cancel</Button><Button type="submit">Create proposal <ArrowRight /></Button></div></form></Modal>;
}
