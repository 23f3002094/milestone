import { FormEvent, createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowRight, BadgeCheck, BriefcaseBusiness,
  Check, CheckCircle2, ChevronRight, Clock3, FileText,
  FolderKanban, LoaderCircle, LockKeyhole,
  MessageSquareText, Plus, Search, Send, ShieldCheck, Sparkles, UserRoundCheck, X,
} from "lucide-react";
import {
  BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate,
  useParams,
} from "react-router-dom";
import { client } from "./client";
import type { ProjectDetail, ProjectSummary, Role, User } from "./domain";
import "./design.css";
import { Landing, Shell, DashboardView } from "./Experience";
import Payment from "./PaymentPanel";
import AgreementEditor from "./AgreementEditor";
import WorkflowGuide from "./WorkflowGuide";
import Resolution from "./ResolutionRoom";
import { Badge, Brand, Button, Empty } from "./ui";
import { BusyContext, date, downloadRecord, money, pretty, timestamp, nextStep } from "./workspace-utils";

interface AuthValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}
const AuthContext = createContext<AuthValue>({ user: null, loading: true, setUser: () => undefined });
const useAuth = () => useContext(AuthContext);

function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("freelancer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accounts = {
    freelancer: { name: "Frankie Morgan", company: "Morgan Digital", email: "frankie@demo.milestone.app", initials: "FM" },
    client: { name: "Casey Nguyen", company: "Northstar Studio", email: "casey@demo.milestone.app", initials: "CN" },
  };
  const account = accounts[role];
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const user = await client.login(account.email, "Demo123!"); setUser(user); navigate("/app"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Sign in failed"); }
    finally { setBusy(false); }
  };
  return <div className="login-page">
    <div className="login-story"><Brand inverse /><div><span className="quote-mark">“</span><blockquote>Scope is confidence. Evidence is clarity. Resolution is a conversation.</blockquote><p>One calm workspace for both sides of great work.</p></div><small>Human approval at every meaningful step.</small></div>
    <main className="login-panel"><Link to="/" className="back-link">← Back to overview</Link><form onSubmit={submit}>
      <div className="login-heading"><small>INTERACTIVE DEMO</small><h1>Choose your side<br />of the project.</h1><p>Switch roles anytime to see the same work from a different perspective.</p></div>
      <div className="role-picker" role="group" aria-label="Demo account">
        {(["freelancer", "client"] as Role[]).map((value) => <button type="button" key={value} className={role === value ? "active" : ""} onClick={() => setRole(value)}>
          <span>{value === "freelancer" ? <BriefcaseBusiness /> : <UserRoundCheck />}</span><div><b>{pretty(value)}</b><small>{value === "freelancer" ? "Manage work & delivery" : "Review work & approve"}</small></div>{role === value && <Check />}
        </button>)}
      </div>
      <div className="demo-profile"><span>{account.initials}</span><div><b>{account.name}</b><small>{account.company} · {account.email}</small></div><Badge value="Demo ready" /></div>
      <label className="field-label">Demo password<input value="Demo123!" readOnly aria-label="Demo password" /></label>
      {error && <div className="form-error"><AlertTriangle />{error}</div>}
      <Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <>Continue as {account.name.split(" ")[0]} <ArrowRight /></>}</Button>
      <p className="demo-note"><ShieldCheck /> Sample projects contain simulated payments. New projects use PayPal Sandbox when configured.</p>
    </form></main>
  </div>;
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loader"><LoaderCircle className="spin" /><span>Preparing your workspace…</span></div>;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

function AppShell() {
  const { user, setUser } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const switchRole = async () => {
    if (!user || switching) return;
    setSwitching(true); setSwitchError("");
    try {
      const email = user.role === "freelancer" ? "casey@demo.milestone.app" : "frankie@demo.milestone.app";
      setUser(await client.login(email, "Demo123!"));
    } catch (error) { setSwitchError(error instanceof Error ? error.message : "Role switch failed"); }
    finally { setSwitching(false); }
  };
  if (!user) return null;
  return <Shell user={user} switching={switching} onSwitch={() => void switchRole()} onLogout={() => { client.logout(); setUser(null); }}>
    {switchError && <div className="inline-error" role="alert">{switchError}</div>}
    <Routes key={user.id}><Route index element={<Dashboard />} /><Route path="guide" element={<WorkflowGuide user={user} />} /><Route path="projects" element={<Projects />} /><Route path="projects/:projectId/:section?" element={<ProjectWorkspace />} /></Routes>
  </Shell>;
}

function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { void client.projects().then(setProjects).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);
  return { projects, loading, error };
}

function Dashboard() {
  const { user } = useAuth();
  const { projects, loading, error } = useProjects();
  if (loading || !user) return <PageLoading />;
  return <DashboardView user={user} projects={projects} error={error} />;
}

function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return <div className="project-table"><div className="table-row head"><span>PROJECT</span><span>STATUS</span><span>COUNTERPARTY</span><span>DUE</span><span>VALUE</span><span /></div>
    {projects.map((project) => <Link className="table-row" to={`/app/projects/${project.id}/overview`} key={project.id}><div><span className={`project-monogram p${project.id}`}>{project.title.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><p><b>{project.title}</b><small>{pretty(project.role)} workspace</small></p></div><span><Badge value={project.status} /></span><span>{project.counterparty}</span><span>{date(project.due_date)}</span><b>{money(project.budget_cents, project.currency)}</b><ChevronRight /></Link>)}</div>;
}

function Projects() {
  const { user } = useAuth();
  const { projects, loading, error: projectsError } = useProjects();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "review" | "resolution">(() => new URLSearchParams(location.search).get("view") === "resolution" ? "resolution" : "all");
  const [showNew, setShowNew] = useState(() => new URLSearchParams(location.search).has("new"));
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [clientEmail, setClientEmail] = useState("casey@demo.milestone.app");
  const [amount, setAmount] = useState("25");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  useEffect(() => { if (new URLSearchParams(location.search).has("new")) setShowNew(true); }, [location.search]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setCreating(true); setCreateError("");
    try {
      const project = await client.createProject({ title, brief, client_email: clientEmail, amount_cents: Math.round(Number(amount) * 100), currency: "USD", due_date: dueDate });
      navigate(`/app/projects/${project.id}/agreement`);
    } catch (error) { setCreateError(error instanceof Error ? error.message : "Project could not be created."); }
    finally { setCreating(false); }
  };
  if (loading) return <PageLoading />;
  const filtered = projects.filter((project) => project.title.toLowerCase().includes(query.toLowerCase())
    && (filter === "all" || (filter === "review" ? project.status === "delivery_review" : project.status === "resolution")));
  return <main className="page"><div className="page-title"><div><small>WORKSPACES</small><h1>Projects</h1><p>Agreements, payments, delivery, and decisions in one place.</p></div>{user?.role === "freelancer" && <Button onClick={() => setShowNew(!showNew)}><Plus /> {showNew ? "Close form" : "New project"}</Button>}</div>
    {projectsError && <div className="form-error" role="alert">{projectsError}</div>}
    {showNew && user?.role === "freelancer" && <form className="surface new-project-form" onSubmit={(event) => void create(event)}>
      <div className="surface-head"><div><small>A CLEAR START FOR GREAT WORK</small><h2>Start a new milestone</h2><p>Define the work. Agree the terms. Then pay with PayPal.</p></div><FileText /></div>
      <div className="brief-starters"><span>START WITH A BRIEF</span><button type="button" onClick={() => { setTitle("Website launch"); setBrief("Build a responsive 3 page website with a home page, about page, and working contact form. Provide mobile and desktop screenshots, public page URLs, and SEO title and description evidence. Include one round of revisions and deliver source files."); }}>Website launch <ArrowRight /></button><button type="button" onClick={() => { setTitle("Brand identity launch"); setBrief("Deliver a brand identity with primary logo exports, a documented color system, editable social templates in launch formats, and a usage guide covering logo spacing. Include one revision round and editable source files."); }}>Brand identity <ArrowRight /></button></div>
      <div className="new-project-fields"><label className="field-label">Project title<input required minLength={3} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Campaign website" /></label><label className="field-label">Client email<input required type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} /><small>Use Casey?s account for this shared prototype.</small></label><label className="field-label">Milestone amount (USD)<input required type="number" min="1" max="1000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="field-label">Due date<input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
      <label className="field-label">Project brief<textarea required minLength={30} maxLength={6000} rows={5} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Describe the deliverables, formats, evidence, and revision limit?" /><small>{brief.length} / 6,000 characters ? Be specific about what completion looks like.</small></label>
      {createError && <div className="form-error"><AlertTriangle />{createError}</div>}<div className="form-footer"><span><ShieldCheck /> Both parties review before payment.</span><Button type="submit" disabled={creating}>{creating ? <><LoaderCircle className="spin" /> Creating project</> : <>Create project <ArrowRight /></>}</Button></div>
    </form>}
    <div className="filterbar"><label><Search /><input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>{projects.length}</span></button><button className={filter === "review" ? "active" : ""} onClick={() => setFilter("review")}>In review <span>{projects.filter((project) => project.status === "delivery_review").length}</span></button><button className={filter === "resolution" ? "active" : ""} onClick={() => setFilter("resolution")}>Resolution <span>{projects.filter((project) => project.status === "resolution").length}</span></button></div>
    <section className="surface">{filtered.length ? <ProjectTable projects={filtered} /> : <Empty icon={<FolderKanban />} title="No projects found" body="Try another search term or create a new project." />}</section>
  </main>;
}

function useProject(id: number) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setProject(null); setError(""); setNotice("");
    void client.project(id).then((value) => { if (active) setProject(value); }).catch((e: Error) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const act = async (promise: Promise<ProjectDetail>) => {
    setError(""); setNotice(""); setBusy(true);
    try { const result = await promise; setProject(result); setNotice(result.audit[0]?.detail ?? "Project updated."); } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(false); }
  };
  return { project, loading, error, busy, notice, act };
}

const sections = [
  ["overview", "Overview"], ["agreement", "Agreement"], ["payment", "Payment"],
  ["delivery", "Delivery"], ["resolution", "Resolution Room"], ["activity", "Activity"],
];

function ProjectWorkspace() {
  const { projectId, section = "overview" } = useParams();
  const id = Number(projectId);
  const { project, loading, error, busy, notice, act } = useProject(id);
  if (loading && !project) return <PageLoading />;
  if (!project) return <main className="page"><Empty icon={<AlertTriangle />} title="Project unavailable" body={error || "This workspace could not be loaded."} /></main>;
  const next = nextStep(project);
  return <main className="project-page">
    <div className="project-banner"><div className={`project-logo p${project.id}`}>{project.title.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><div className="project-eyebrow"><Badge value={project.status} /><span>Project #{String(project.id).padStart(4, "0")}</span></div><h1>{project.title}</h1><p>with {project.members.find((member) => member.role !== project.viewer_role)?.name} · Due {date(project.due_date)}</p></div><div className="project-value"><small>MILESTONE VALUE</small><b>{money(project.budget_cents, project.currency)}</b></div></div>
    <nav className="project-tabs">{sections.map(([path, label]) => <NavLink key={path} to={`/app/projects/${id}/${path}`} className={section === path ? "active" : ""}>{label}{path === "resolution" && project.resolution && <i />}</NavLink>)}</nav>
    <div className="project-guidance"><span className="guidance-stage">STEP {next.phase} / 4</span><div><small>YOUR ROLE: {project.viewer_role.toUpperCase()}</small><b>{next.title}</b><p>{next.detail}</p></div>{section !== next.section && <Link className="ms-button secondary" to={`/app/projects/${project.id}/${next.section}`}>{next.label}<ArrowRight /></Link>}<Link className="guidance-help" to="/app/guide">How it works</Link></div>
    {error && <div className="inline-error" role="alert"><AlertTriangle />{error}</div>}
    {notice && <div className="action-notice" role="status"><CheckCircle2 />{notice}</div>}
    <BusyContext.Provider value={busy}><div className="project-content" aria-busy={busy}>
      {busy && <div className="saving-indicator" role="status"><LoaderCircle className="spin" /> Recording your action…</div>}
      {section === "overview" && <ProjectOverview project={project} />}
      {section === "agreement" && <Agreement project={project} act={act} />}
      {section === "payment" && <Payment project={project} act={act} />}
      {section === "delivery" && <Delivery project={project} act={act} />}
      {section === "resolution" && <Resolution project={project} act={act} />}
      {section === "activity" && <Timeline project={project} />}
    </div></BusyContext.Provider>
  </main>;
}

function ProjectOverview({ project }: { project: ProjectDetail }) {
  const next = nextStep(project);
  const steps = [
    ["Agreement", Boolean(project.agreement.locked_at), "Approved by both parties"],
    ["Payment", Boolean(project.milestone.payment?.captured_cents), project.milestone.payment?.captured_cents ? `${money(project.milestone.payment.captured_cents)} captured` : "Awaiting client"],
    ["Delivery", Boolean(project.milestone.deliverable), project.milestone.deliverable ? "Evidence submitted" : "Not submitted"],
    ["Decision", ["completed", "resolved"].includes(project.status), project.status === "resolution" ? "Resolution in progress" : "Awaiting acceptance"],
  ];
  return <><div className="overview-grid"><section className="surface"><div className="surface-head"><div><h2>Milestone progress</h2><p>One shared view of where the work stands.</p></div><Badge value={project.milestone.status} /></div>
    <div className="progress-steps">{steps.map(([title, done, detail], index) => <div className={done ? "done" : ""} key={String(title)}><span>{done ? <Check /> : index + 1}</span><div><b>{title}</b><small>{detail}</small></div>{index < steps.length - 1 && <i />}</div>)}</div>
    <div className="next-action"><Sparkles /><div><small>RECOMMENDED NEXT STEP</small><b>{next.title}</b><p>{next.detail}</p></div><Link className="ms-button" to={`/app/projects/${project.id}/${next.section}`}>{next.label} <ArrowRight /></Link></div></section>
    <section className="surface compact"><div className="surface-head"><div><h2>People</h2><p>Project roles</p></div></div>{project.members.map((member) => <div className="person" key={member.id}><span>{member.name.split(" ").map((part) => part[0]).join("")}</span><div><b>{member.name}</b><small>{member.email}</small></div><Badge value={member.role} /></div>)}</section></div>
    <div className="overview-grid"><section className="surface compact"><div className="surface-head"><div><h2>{project.agreement.locked_at ? "Locked agreement" : "Agreement draft"}</h2><p>Version {project.agreement.version}</p></div><LockKeyhole /></div><p className="body-copy">{project.agreement.summary}</p><Link className="text-link" to={`/app/projects/${project.id}/agreement`}>Review agreement <ArrowRight /></Link></section>
    <section className="surface compact"><div className="surface-head"><div><h2>Latest activity</h2><p>Immutable project history</p></div><Activity /></div>{project.audit.slice(0, 3).map((event) => <div className="mini-event" key={event.id}><i /><div><b>{pretty(event.event)}</b><small>{event.actor} · {date(event.at)}</small></div></div>)}</section></div></>;
}

function Agreement({ project, act }: { project: ProjectDetail; act: (promise: Promise<ProjectDetail>) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const approved = project.agreement.approvals.some((approval) => approval.role === project.viewer_role);
  return <><div className="content-grid"><section className="surface document"><div className="document-head"><div><small>AGREEMENT VERSION {project.agreement.version}</small><h2>{project.title}</h2><p>Structured from the original brief and preserved for both parties.</p></div>{project.agreement.locked_at ? <div className="locked-stamp"><LockKeyhole /><span><b>LOCKED</b><small>{date(project.agreement.locked_at)}</small></span></div> : <Badge value="Review required" />}</div>
    {!project.agreement.locked_at && project.viewer_role === "freelancer" && <div className="scope-edit-banner"><div><b>Make the agreement yours.</b><p>Review the suggested criteria and confirm the formats, evidence, and revision limit.</p></div><Button secondary onClick={() => setEditing(true)}>Edit scope <FileText /></Button></div>}<div className="agreement-summary"><h3>Project summary</h3><p>{project.agreement.summary}</p></div>
    <h3>Scope & acceptance criteria</h3><div className="scope-list">{project.agreement.items.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h4>{item.title}</h4><p>{item.description}</p>{item.criteria.map((criterion) => <small key={criterion.id}><Check /> {criterion.description}<i>{pretty(criterion.check_type)}</i></small>)}</div></article>)}</div>
    <div className="agreement-columns"><div><h3>Explicitly out of scope</h3>{project.agreement.out_of_scope.map((item) => <p key={item}><X />{item}</p>)}</div><div><h3>Ambiguity review</h3>{project.agreement.ambiguities.length ? project.agreement.ambiguities.map((item) => <p key={item}><AlertTriangle />{item}</p>) : <p><CheckCircle2 />No open ambiguity flags.</p>}</div></div>
  </section><aside className="sticky-stack"><section className="surface compact"><h2>Party approvals</h2><p className="side-copy">Each party approves the same version. Both approvals lock it permanently.</p>{project.members.map((member) => { const approval = project.agreement.approvals.find((value) => value.user_id === member.id); return <div className="approval-person" key={member.id}><span>{member.name.split(" ").map((part) => part[0]).join("")}</span><div><b>{member.name}</b><small>{pretty(member.role)}</small></div>{approval ? <CheckCircle2 /> : <Clock3 />}</div>; })}
    {!project.agreement.locked_at && !approved && <Button onClick={() => void act(client.approveAgreement(project.id))}><BadgeCheck /> Approve version {project.agreement.version}</Button>}{approved && !project.agreement.locked_at && <div className="waiting"><Clock3 /> Waiting for the other party</div>}{project.agreement.locked_at && <div className="lock-note"><ShieldCheck /><span><b>Scope snapshot locked</b><small>Future edits require a new version.</small></span></div>}</section>
    <section className="disclaimer"><ShieldCheck /><p><b>Human-approved agreement</b>This record supports collaboration. It is not legal advice or adjudication.</p></section></aside></div>{editing && <AgreementEditor project={project} act={act} onClose={() => setEditing(false)} />}</>;
}

function Delivery({ project, act }: { project: ProjectDetail; act: (promise: Promise<ProjectDetail>) => Promise<void> }) {
  const delivery = project.milestone.deliverable;
  const [reason, setReason] = useState("The submitted work needs clarification against the agreed acceptance criteria.");
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [resubmitting, setResubmitting] = useState(false);
  useEffect(() => { if (project.status !== "in_progress") setResubmitting(false); }, [project.status]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void act(client.submitDelivery(project.id, { url: deliveryUrl, summary, evidence: evidence.split("\n").map((item) => item.trim()).filter(Boolean) }));
  };
  if (!delivery || resubmitting) return project.viewer_role === "freelancer" && project.status === "in_progress" && Boolean(project.milestone.payment?.captured_cents)
    ? <form className="surface delivery-form" onSubmit={submit}><h2>Submit milestone delivery</h2><p>Share a public URL and one piece of evidence per line. Your client can review each criterion before deciding.</p><label className="field-label">Delivery URL<input required type="url" value={deliveryUrl} onChange={(event) => setDeliveryUrl(event.target.value)} placeholder="https://example.com" /></label><label className="field-label">What did you deliver?<textarea required minLength={20} maxLength={4000} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label><label className="field-label">Evidence (one item per line)<textarea required rows={5} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="https://example.com/about\nMobile and desktop screenshots\nContact form submitted successfully" /></label><Button type="submit"><Send /> Submit delivery for review</Button></form>
    : <div className="surface"><Empty icon={<Send />} title={project.viewer_role === "freelancer" ? "Payment first" : "No delivery yet"} body={project.viewer_role === "freelancer" ? "The client must capture the locked milestone payment before delivery can be submitted." : "The freelancer has not submitted this milestone."} /></div>;
  const passed = delivery.evaluations.filter((evaluation) => evaluation.passed).length;
  return <div className="content-grid"><section className="surface delivery-review">{project.status === "in_progress" && <div className="return-notice"><Send /><span>A revision was agreed. Updated evidence can now be submitted.</span>{project.viewer_role === "freelancer" && <Button onClick={() => setResubmitting(true)}>Submit revised delivery <ArrowRight /></Button>}</div>}<div className="surface-head"><div><small>DELIVERY SUBMITTED {date(delivery.submitted_at).toUpperCase()}</small><h2>Review the work and evidence</h2><p>{delivery.summary}</p></div><a className="ms-button secondary" href={delivery.url} target="_blank" rel="noreferrer">Open live work <ArrowRight /></a></div>
    <div className="evaluation-score"><div className="score-circle"><b>{passed}</b><span>of {delivery.evaluations.length}</span></div><div><Badge value={passed === delivery.evaluations.length ? "Checks matched" : "Needs review"} /><h3>Deterministic evidence review</h3><p>Checks organize proof. They do not judge quality or decide payment.</p></div></div>
    <div className="evidence-list">{project.agreement.items.flatMap((item) => item.criteria).map((criterion) => { const result = delivery.evaluations.find((evaluation) => evaluation.criterion_id === criterion.id); return <article key={criterion.id}><span className={result?.passed ? "pass" : "review"}>{result?.passed ? <Check /> : <AlertTriangle />}</span><div><h3>{criterion.description}</h3><p>{result?.detail ?? "Awaiting evidence check"}</p><small>Expected: {criterion.expected}</small></div><Badge value={result?.passed ? "Matched" : "Review"} /></article>; })}</div>
    <h3 className="subheading">Submitted evidence</h3><div className="evidence-cards">{delivery.evidence.map((evidence) => <article key={evidence.id}><FileText /><div><b>{evidence.label}</b><p>{evidence.notes}</p>{evidence.url && <a href={evidence.url} target="_blank" rel="noreferrer">Open evidence <ArrowRight /></a>}</div></article>)}</div>
  </section><aside className="sticky-stack">{project.viewer_role === "client" && project.milestone.status === "in_review" ? <section className="surface decision-card"><h2>Your decision</h2><p>Inspect the work yourself before choosing. Milestone never decides for you.</p><Button onClick={() => void act(client.accept(project.id))}><CheckCircle2 /> Accept milestone</Button><div className="or"><span>or</span></div><label className="field-label">What needs attention?<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} /></label><Button secondary onClick={() => void act(client.openResolution(project.id, reason))}><MessageSquareText /> Open Resolution Room</Button></section> : <section className="surface compact"><h2>Review status</h2><div className="waiting"><Clock3 /> {project.status === "in_progress" ? "Revision agreed; awaiting updated delivery" : project.viewer_role === "freelancer" ? "Waiting for client review" : pretty(project.milestone.status)}</div></section>}<section className="disclaimer"><Sparkles /><p><b>Optional AI is advisory only</b>Deterministic results remain visible and human review is always required.</p></section></aside></div>;
}

function Timeline({ project }: { project: ProjectDetail }) {
  return <section className="surface timeline-panel"><div className="surface-head"><div><small>YOUR SHARED PROJECT RECORD</small><h2>Activity & audit trail</h2><p>Important actions are appended with an actor and timestamp.</p></div><Button secondary onClick={() => downloadRecord(project, `milestone-${project.id}-record.json`)}><ArrowDownToLine /> Export record</Button></div><div className="timeline">{project.audit.map((event, index) => <article key={event.id}><div className="timeline-mark"><span>{event.actor.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>{index < project.audit.length - 1 && <i />}</div><div><small>{date(event.at)} · {timestamp(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small><h3>{pretty(event.event)}</h3><p>{event.detail}</p><b>{event.actor}</b></div></article>)}</div></section>;
}

function PageLoading() {
  return <div className="page-loading"><LoaderCircle className="spin" /><span>Loading workspace…</span></div>;
}

export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(client.token()));
  useEffect(() => {
    if (!client.token()) { setLoading(false); return; }
    void client.me().then(setUser).catch(() => client.logout()).finally(() => setLoading(false));
  }, []);
  const auth = useMemo(() => ({ user, loading, setUser }), [user, loading]);
  return <AuthContext.Provider value={auth}><BrowserRouter><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} /><Route path="/app/*" element={<Protected />} /><Route path="*" element={<Navigate to="/" />} /></Routes></BrowserRouter></AuthContext.Provider>;
}
