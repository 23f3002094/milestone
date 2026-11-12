import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileCheck2,
  Flag,
  Info,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { api } from "./api";
import type { Project, ResolutionOption, Role } from "./types";
import "./style.css";

const sampleBrief =
  "Build a responsive 4 page portfolio website by 15 November for $1,200. Include Home, Work, About and Contact pages, a working contact form, basic SEO, client-provided copy and images, Chrome and Safari support, and one revision round.";

const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function SectionTitle({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}

function Button({
  children,
  secondary,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  secondary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={secondary ? "button secondary" : "button"}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function StepRail({ project }: { project: Project | null }) {
  const stage = project
    ? ["draft", "locked", "funded", "delivered", "in_resolution", "accepted", "resolved"].indexOf(
        project.status,
      )
    : -1;
  const paymentDone = project?.payment.status === "captured";
  const steps = [
    ["Agreement", project ? stage >= 0 : false],
    ["Lock scope", project ? stage >= 1 : false],
    ["Payment", Boolean(paymentDone)],
    ["Delivery", Boolean(project?.deliverable)],
    ["Review", Boolean(project?.evaluation)],
    ["Resolve", ["accepted", "resolved"].includes(project?.status ?? "")],
  ];
  return (
    <aside className="rail">
      <a className="brand" href="/">
        <span className="brand-mark">M</span>
        <span>milestone</span>
      </a>
      <nav aria-label="Milestone progress">
        {steps.map(([label, done], index) => (
          <div className={`rail-step ${done ? "done" : ""}`} key={String(label)}>
            <span>{done ? <Check size={14} /> : index + 1}</span>
            <p>{label}</p>
          </div>
        ))}
      </nav>
      <div className="rail-note">
        <ShieldCheck size={17} />
        <p>Humans approve every agreement and financial action.</p>
      </div>
    </aside>
  );
}

function BriefForm({
  onCreated,
  busy,
}: {
  onCreated: (project: Project) => void;
  busy: boolean;
}) {
  const [brief, setBrief] = useState(sampleBrief);
  const [title, setTitle] = useState("Northstar Studio launch");
  const [amount, setAmount] = useState("1200");
  return (
    <div className="hero-grid">
      <div className="hero-copy">
        <StatusPill tone="green">
          <Sparkles size={13} /> Hackathon demo
        </StatusPill>
        <h1>Clear work.<br />Fewer disputes.</h1>
        <p>
          Turn one website brief into a measurable, jointly approved milestone—with
          evidence-led review and a human resolution path.
        </p>
        <div className="trust-row">
          <span><LockKeyhole size={16} /> Locked scope</span>
          <span><Landmark size={16} /> PayPal sandbox</span>
          <span><Scale size={16} /> Human decisions</span>
        </div>
      </div>
      <form
        className="brief-card"
        onSubmit={(event) => {
          event.preventDefault();
          void api
            .create(brief, title, Math.round(Number(amount) * 100))
            .then(onCreated);
        }}
      >
        <div className="card-kicker"><FileCheck2 size={16} /> New agreement</div>
        <label>
          Project name
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Describe the milestone
          <textarea
            rows={8}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Pages, features, deadline, evidence, revision limits…"
          />
        </label>
        <label className="amount-field">
          Milestone value <span>USD</span>
          <div><b>$</b><input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </label>
        <Button type="submit" disabled={busy || brief.length < 20}>
          Structure this agreement <ArrowRight size={17} />
        </Button>
        <button className="text-button" type="button" disabled={busy} onClick={() => void api.demo().then(onCreated)}>
          Load the ready-to-run demo
        </button>
      </form>
    </div>
  );
}

function Scope({ project, act }: { project: Project; act: (call: Promise<Project>) => void }) {
  const locked = project.status !== "draft";
  return (
    <section>
      <SectionTitle
        eyebrow="01 · Agreement"
        title={locked ? "Scope locked by both parties" : "Review the measurable scope"}
        detail="The original brief stays visible. The structured snapshot becomes immutable after both approvals."
      />
      <div className="summary-strip">
        <div><span>Milestone</span><strong>{project.title}</strong></div>
        <div><span>Value</span><strong>{formatMoney(project.total_cents, project.currency)}</strong></div>
        <div><span>Requirements</span><strong>{project.scope.requirements.length}</strong></div>
        <div><span>Status</span><StatusPill tone={locked ? "green" : "amber"}>{locked ? "Locked" : "Needs approval"}</StatusPill></div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-heading"><h3>Acceptance requirements</h3><StatusPill>Deterministic</StatusPill></div>
          <div className="requirements">
            {project.scope.requirements.map((item, index) => (
              <article key={item.id}>
                <span>{index + 1}</span>
                <div><h4>{item.title}</h4><p>{item.description}</p><small>Evidence expected: {item.expected}</small></div>
              </article>
            ))}
          </div>
        </div>
        <div>
          <div className="panel warning">
            <div className="panel-heading"><h3><TriangleAlert size={18} /> Ambiguities</h3><b>{project.scope.ambiguities.length}</b></div>
            {project.scope.ambiguities.length ? (
              <ul>{project.scope.ambiguities.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : (
              <p className="all-clear"><CheckCircle2 size={17} /> No common ambiguities detected.</p>
            )}
          </div>
          <div className="panel exclusions">
            <h3>Explicitly out of scope</h3>
            <ul>{project.scope.out_of_scope.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </div>
      <div className="approval-bar">
        {(["client", "freelancer"] as Role[]).map((role) => {
          const approval = project.approvals[role];
          const name = role === "client" ? "Casey Client" : "Frankie Freelancer";
          return (
            <div className={approval ? "signed" : ""} key={role}>
              <span>{approval ? <BadgeCheck size={20} /> : <span className="avatar">{role[0].toUpperCase()}</span>}</span>
              <p><small>{role}</small><strong>{approval?.name ?? name}</strong></p>
              {approval ? <StatusPill tone="green">Approved</StatusPill> : (
                <Button secondary onClick={() => act(api.approve(project.id, role, name))}>Approve</Button>
              )}
            </div>
          );
        })}
        {locked && <div className="lock-stamp"><LockKeyhole size={17} /> Locked snapshot</div>}
      </div>
    </section>
  );
}

function Payment({ project, act }: { project: Project; act: (call: Promise<Project>) => void }) {
  const payment = project.payment;
  return (
    <section>
      <SectionTitle
        eyebrow="02 · Payment"
        title="Link payment to the locked milestone"
        detail="The server—not the browser—enforces the approved amount and state transitions."
      />
      <div className="payment-card">
        <div className="paypal-word"><i>Pay</i><b>Pal</b><StatusPill tone={payment.mode === "demo" ? "amber" : "blue"}>{payment.mode}</StatusPill></div>
        <div className="payment-amount">
          <small>Milestone total</small>
          <strong>{formatMoney(project.total_cents, project.currency)}</strong>
          <span>{payment.status.replace("_", " ")}</span>
        </div>
        <div className="payment-action">
          {payment.status === "not_created" && (
            <Button onClick={() => act(api.createPayment(project.id))}>Create order <ArrowRight size={16} /></Button>
          )}
          {payment.status === "created" && payment.approval_url && (
            <a className="button" href={payment.approval_url} target="_blank" rel="noreferrer">Approve in PayPal <ExternalLink size={16} /></a>
          )}
          {payment.status === "created" && (
            <Button secondary={Boolean(payment.approval_url)} onClick={() => act(api.capturePayment(project.id))}>
              {payment.mode === "demo" ? "Confirm demo payment" : "Capture approved order"}
            </Button>
          )}
          {payment.status === "captured" && <div className="success-label"><CheckCircle2 /> Captured</div>}
        </div>
      </div>
      <div className="notice"><Info size={16} /> {payment.mode === "demo"
        ? "Demo mode records realistic states but never moves money. Add PayPal sandbox credentials to enable orders, captures and refunds."
        : "Sandbox mode only. This is a milestone payment workflow, not escrow or guaranteed payment."}</div>
    </section>
  );
}

function Delivery({ project, act }: { project: Project; act: (call: Promise<Project>) => void }) {
  const [url, setUrl] = useState("https://northstar.example");
  const [summary, setSummary] = useState(
    "Four routes are live. Responsive behavior was checked on mobile and desktop. The contact form was submitted successfully and SEO titles and descriptions are present.",
  );
  const [evidence, setEvidence] = useState(
    "https://northstar.example https://northstar.example/work https://northstar.example/about https://northstar.example/contact\nMobile and desktop responsive screenshots\nContact form submitted successfully\nSEO title and description audit",
  );
  if (project.deliverable) return <Review project={project} act={act} />;
  return (
    <section>
      <SectionTitle
        eyebrow="03 · Delivery"
        title="Submit the website and evidence"
        detail="Evidence is checked against the locked requirements. A person still reviews quality and context."
      />
      <div className="delivery-layout">
        <div className="panel">
          <label>Published website URL<input value={url} onChange={(e) => setUrl(e.target.value)} /></label>
          <label>Delivery note<textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
          <label>Evidence — one item per line<textarea rows={5} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
          <Button onClick={() => act(api.submit(project.id, url, summary, evidence.split("\n").filter(Boolean)))}>
            Submit milestone <ArrowRight size={16} />
          </Button>
        </div>
        <div className="evidence-guide">
          <Sparkles size={20} />
          <h3>Strong evidence is specific</h3>
          <p>Include page URLs, test results, screenshots or handover notes. Avoid vague claims like “all done.”</p>
          <div><Check size={15} /> Requirement-by-requirement</div>
          <div><Check size={15} /> Easy for both parties to inspect</div>
          <div><Check size={15} /> Preserved with the milestone record</div>
        </div>
      </div>
    </section>
  );
}

function Review({ project, act }: { project: Project; act: (call: Promise<Project>) => void }) {
  const [complaint, setComplaint] = useState(
    "The contact form result is not clear and the mobile layout does not match the agreed evidence.",
  );
  if (project.resolution) return <Resolution project={project} act={act} />;
  return (
    <section>
      <SectionTitle
        eyebrow="04 · Review"
        title="Transparent requirement checks"
        detail="Deterministic checks show exactly what matched. Advisory AI, when configured, cannot approve money."
      />
      {!project.evaluation ? (
        <div className="evaluate-card">
          <div><FileCheck2 size={28} /><h3>Evidence ready to evaluate</h3><p>{project.deliverable?.summary}</p></div>
          <Button onClick={() => act(api.evaluate(project.id))}>Run transparent checks <ArrowRight size={16} /></Button>
        </div>
      ) : (
        <>
          <div className="score-card">
            <div className="score-ring">{project.evaluation.passed}<small>/{project.evaluation.total}</small></div>
            <div><StatusPill tone={project.evaluation.passed === project.evaluation.total ? "green" : "amber"}>
              {project.evaluation.result.replace("_", " ")}
            </StatusPill><h3>Evidence comparison complete</h3><p>{project.evaluation.disclaimer}</p></div>
          </div>
          <div className="check-list">
            {project.evaluation.checks.map((check) => (
              <div key={check.requirement_id} className={check.passed ? "passed" : "failed"}>
                {check.passed ? <CheckCircle2 /> : <Flag />}
                <p><strong>{check.title}</strong><small>{check.method}</small></p>
                <StatusPill tone={check.passed ? "green" : "amber"}>{check.passed ? "Matched" : "Review"}</StatusPill>
              </div>
            ))}
          </div>
          <div className="decision-grid">
            <div className="decision accept">
              <CheckCircle2 /><div><h3>Everything works for me</h3><p>Record client acceptance of this milestone.</p></div>
              <Button onClick={() => act(api.accept(project.id))}>Accept milestone</Button>
            </div>
            <div className="decision dispute">
              <MessageSquareText /><div><h3>Something needs resolution</h3><textarea rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} /></div>
              <Button secondary onClick={() => act(api.complain(project.id, complaint))}>Open Resolution Room</Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Resolution({ project, act }: { project: Project; act: (call: Promise<Project>) => void }) {
  const resolution = project.resolution!;
  const [selected, setSelected] = useState(resolution.selected_option_id ?? "revision");
  const option = resolution.options.find((item) => item.id === selected)!;
  const agreed = resolution.status === "agreed";
  return (
    <section>
      <SectionTitle
        eyebrow="05 · Resolution Room"
        title="Compare facts, then choose together"
        detail="These are proposals—not legal findings. Both people approve an outcome before any financial action."
      />
      <div className="complaint-card">
        <MessageSquareText size={20} />
        <div><small>Client complaint</small><p>“{resolution.complaint}”</p></div>
      </div>
      <div className="comparison">
        <div><h3>Locked scope comparison</h3><p>{resolution.comparison.scope_note}</p></div>
        <div><small>Evidence gaps</small><strong>{resolution.comparison.failed_checks.length}</strong></div>
      </div>
      <h3 className="option-heading">Proposed human-approved outcomes</h3>
      <div className="option-grid">
        {resolution.options.map((item: ResolutionOption) => (
          <button
            className={`option-card ${selected === item.id ? "selected" : ""}`}
            key={item.id}
            onClick={() => setSelected(item.id)}
            disabled={Boolean(resolution.selected_option_id && resolution.status !== "open")}
          >
            <span className="radio">{selected === item.id && <span />}</span>
            <div><h4>{item.title}</h4><p>{item.description}</p></div>
          </button>
        ))}
      </div>
      <div className="resolution-approvals">
        {(["client", "freelancer"] as Role[]).map((role) => {
          const approval = resolution.approvals[role];
          const name = role === "client" ? "Casey Client" : "Frankie Freelancer";
          return (
            <div key={role}>
              <span>{role}</span><strong>{approval?.name ?? name}</strong>
              {approval ? <StatusPill tone="green">Approved</StatusPill> : (
                <Button secondary onClick={() => act(api.approveResolution(project.id, role, name, selected))}>
                  Approve option
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {agreed && ["partial_refund", "adjusted_final_payment"].includes(option.type) && (
        <div className="financial-confirm">
          <div><CircleDollarSign /><p><strong>Final human confirmation</strong><span>Submit {formatMoney(option.amount_cents)} refund via {project.payment.mode === "demo" ? "demo mode" : "PayPal sandbox"}.</span></p></div>
          <Button onClick={() => act(api.refund(project.id, option.amount_cents))}>Confirm and submit refund</Button>
        </div>
      )}
      {agreed && !["partial_refund", "adjusted_final_payment"].includes(option.type) && (
        <div className="notice"><CheckCircle2 size={16} /> Joint choice recorded. No financial action was taken.</div>
      )}
    </section>
  );
}

function Completion({ project }: { project: Project }) {
  const accepted = project.status === "accepted";
  return (
    <section className="completion">
      <div className="completion-icon">{accepted ? <CheckCircle2 /> : <Scale />}</div>
      <StatusPill tone="green">{accepted ? "Accepted" : "Resolved"}</StatusPill>
      <h2>{accepted ? "Milestone accepted" : "Resolution completed"}</h2>
      <p>{accepted
        ? "The client accepted the submitted website against the locked milestone."
        : `${formatMoney(project.payment.refunded_cents)} was ${project.payment.mode === "demo" ? "recorded as a demo refund" : "submitted to PayPal sandbox"}.`}</p>
      <div className="final-stats">
        <div><span>Original value</span><strong>{formatMoney(project.total_cents)}</strong></div>
        <div><span>Refunded</span><strong>{formatMoney(project.payment.refunded_cents)}</strong></div>
        <div><span>Audit events</span><strong>{project.audit.length}</strong></div>
      </div>
      <p className="legal-note">Milestone supports collaboration and payment operations. It is not escrow, legal adjudication, autonomous charging, or a payment guarantee.</p>
    </section>
  );
}

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = (call: Promise<Project>) => {
    setBusy(true);
    setError("");
    void call.then(setProject).catch((reason: Error) => setError(reason.message)).finally(() => setBusy(false));
  };
  const content = useMemo(() => {
    if (!project) return <BriefForm busy={busy} onCreated={setProject} />;
    if (["accepted", "resolved"].includes(project.status)) return <Completion project={project} />;
    if (project.status === "draft") return <Scope project={project} act={act} />;
    if (project.payment.status !== "captured") return (
      <><Scope project={project} act={act} /><Payment project={project} act={act} /></>
    );
    return <Delivery project={project} act={act} />;
  }, [project, busy]);

  return (
    <div className="app-shell">
      <StepRail project={project} />
      <main>
        <header className="topbar">
          <div>{project ? <><span className="project-dot" /> {project.title}</> : "Agreement → delivery → resolution"}</div>
          <div className="topbar-right">
            {busy && <LoaderCircle className="spin" size={17} />}
            <StatusPill tone="green"><span className="live-dot" /> Demo ready</StatusPill>
          </div>
        </header>
        {error && <div className="error-banner"><TriangleAlert size={17} /> {error}<button onClick={() => setError("")}>×</button></div>}
        <div className="content">{content}</div>
        <footer><span>milestone</span><p>Clear scope. Visible evidence. Human-approved outcomes.</p><small>Not escrow or legal advice.</small></footer>
      </main>
    </div>
  );
}
