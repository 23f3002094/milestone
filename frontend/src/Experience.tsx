import { ReactNode, useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, CircleDollarSign, CircleHelp, Command, FileCheck2, FolderKanban, Layers3, LayoutDashboard, LoaderCircle, LogOut, Menu, MessageSquareText, Plus, Search, ShieldCheck, Sparkles, SwitchCamera, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { client } from "./client";
import type { IntegrationHealth, ProjectSummary, User } from "./domain";
import { Badge, Brand, Modal } from "./ui";
import { date, initials, money } from "./workspace-utils";

const stages = [
  { title: "Agree", icon: FileCheck2, heading: "The same page. Literally.", body: "Measurable scope, clear acceptance criteria, and one version approved by both people.", tag: "Locked scope", lines: ["Responsive website + contact form", "Mobile and desktop evidence", "Two approvals on the same version"] },
  { title: "Pay", icon: CircleDollarSign, heading: "A real payment. A clear record.", body: "The client approves checkout in PayPal Sandbox. Capture and refund records stay with the milestone.", tag: "PayPal Sandbox", lines: ["Amount comes from the agreement", "Buyer approval before capture", "Transaction references preserved"] },
  { title: "Deliver", icon: Layers3, heading: "Show the work behind the work.", body: "Attach delivery links and proof to the acceptance criteria, so every review starts with context.", tag: "Visible evidence", lines: ["Public delivery link", "Evidence for each criterion", "Checks organize the proof"] },
  { title: "Resolve", icon: Sparkles, heading: "Less friction. More understanding.", body: "AI reads the scope, evidence, and concern to prepare a review. The people agree the next step.", tag: "AI advisory", lines: ["Evidence gaps to inspect", "Questions for both people", "Human approval before any refund"] },
];

export function Landing() {
  const [selected, setSelected] = useState(3);
  const stage = stages[selected];
  return <div className="landing">
    <header className="public-nav"><Brand /><nav><a href="#how">The experience</a><a href="#trust">Built on trust</a></nav><Link className="nav-signin" to="/login">Open workspace <ArrowUpRight size={16} /></Link></header>
    <main><section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="live-dot" /><span>PAYPAL + AI, WITH PEOPLE IN CONTROL</span></div><h1>Clear work.<br /><em>Fair outcomes.</em></h1>
        <p>Good work deserves a clear finish. Bring the agreement, delivery evidence, and payment into one shared workspace.</p>
        <div className="hero-actions"><Link className="hero-cta" to="/login">Explore the live demo <ArrowUpRight /></Link><a className="hero-secondary" href="#how">See how it works <ArrowDown size={16} /></a></div>
        <div className="hero-people"><div className="avatar-pair"><span>FM</span><span>CN</span></div><p>Two perspectives.<br /><b>One shared version of the story.</b></p></div>
      </div>
      <div className="hero-visual"><div className="orbit-label">THE MILESTONE WORKFLOW</div><div className="flow-preview">
        <div className="flow-window-head"><span className="live-dot" /> Shared project workspace <span>01 / 04</span></div>
        <div className="flow-preview-title"><div className="flow-monogram">NS</div><div><small>EXAMPLE PROJECT</small><h3>Northstar Studio</h3><p>Website launch milestone</p></div><ArrowUpRight /></div>
        <div className="flow-tabs" role="tablist" aria-label="Explore the workflow">{stages.map(({ title, icon: Icon }, index) => <button key={title} role="tab" aria-selected={selected === index} aria-controls="workflow-preview" id={`flow-tab-${index}`} onClick={() => setSelected(index)}><Icon />{title}</button>)}</div>
        <div className="flow-preview-body" id="workflow-preview" role="tabpanel" aria-labelledby={`flow-tab-${selected}`}><div className="flow-caption"><stage.icon /><span>{stage.tag}</span><span className="preview-label">Illustrated example</span></div><h3>{stage.heading}</h3><p>{stage.body}</p><div className="preview-checks">{stage.lines.map((line) => <div key={line}><Check /><span>{line}</span></div>)}</div></div>
        <div className="flow-footer"><ShieldCheck /><span>PayPal handles the payment. People make every decision.</span></div>
      </div><div className="visual-note"><span><Sparkles /></span><div><b>Clarity is the real upgrade.</b><small>AI prepares. People decide.</small></div></div><div className="visual-grid" /></div>
    </section>
    <section className="platform-strip"><span>BUILT FOR THE MOMENTS THAT MATTER</span><div><FileCheck2 /> Shared agreements</div><div><CircleDollarSign /> PayPal Sandbox</div><div><Sparkles /> Live AI reviews</div><div><ShieldCheck /> Human approval</div></section>
    <section className="how-section" id="how"><div className="section-heading"><small>FROM BRIEF TO BETTER OUTCOMES</small><h2>Keep the whole story<br /><em>in one place.</em></h2><p>Four connected steps. A clear record at every one.</p></div><div className="how-grid">{stages.map(({ title, icon: Icon, body }, index) => <article key={title}><div><span>0{index + 1}</span><Icon /></div><h3>{title}</h3><p>{body}</p><span className="how-line" /></article>)}</div></section>
    <section className="trust-section" id="trust"><div><div className="trust-symbol"><ShieldCheck /></div><small>TRUST IS PART OF THE WORKFLOW</small><h2>AI prepares the conversation.<br /><em>People choose the outcome.</em></h2></div><div><p>The copilot surfaces missing evidence and useful questions. Agreements and financial actions require explicit approval from the people involved.</p><div className="trust-points"><span><Check /> Locked agreement versions</span><span><Check /> Two-party resolution approvals</span><span><Check /> Recorded PayPal operations</span></div><small>Milestone is an advisory collaboration tool. It does not provide escrow or legal adjudication.</small></div></section>
    </main><footer className="public-footer"><Brand inverse /><span>Better work. Clearer endings.</span><small>© 2026 Milestone · MIT licensed</small></footer>
  </div>;
}

export function Shell({ user, switching, onSwitch, onLogout, children }: { user: User; switching: boolean; onSwitch: () => void; onLogout: () => void; children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [searchError, setSearchError] = useState("");
  const location = useLocation();
  useEffect(() => {
    let active = true;
    void client.projects().then((data) => { if (active) setProjects(data); }).catch(() => { if (active) setSearchError("Project search is unavailable. Try opening Projects."); });
    void client.health().then((data) => { if (active) setHealth(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [user.id, location.pathname]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((value) => !value); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const resolution = projects.find((project) => project.status === "resolution");
  const resolutionCount = projects.filter((project) => project.status === "resolution").length;
  const sample = projects.find((project) => project.payment_mode === "demo");
  const isDemoAccount = ["frankie@demo.milestone.app", "casey@demo.milestone.app"].includes(user.email);
  return <div className="product-shell">
    {mobile && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={mobile ? "open" : ""}><div className="side-head"><Brand inverse /><button onClick={() => setMobile(false)} aria-label="Close menu"><X /></button></div>
      <div className="role-chip"><span>{initials(user.name)}</span><div><small>{user.role} workspace</small><b>{user.company}</b></div><ChevronRight /></div>
      <div className="nav-label">WORKSPACE</div><nav>
        <NavLink to="/app" end onClick={() => setMobile(false)}><LayoutDashboard /><span>Overview</span></NavLink>
        <NavLink to="/app/projects" end onClick={() => setMobile(false)}><FolderKanban /><span>Projects</span><i>{projects.length}</i></NavLink>
        <NavLink to={resolution ? `/app/projects/${resolution.id}/resolution` : "/app/projects?view=resolution"} onClick={() => setMobile(false)}><MessageSquareText /><span>Resolution Room</span>{resolutionCount > 0 && <i className="attention-count">{resolutionCount}</i>}</NavLink>
        {sample && <><div className="nav-label">SAMPLE WALKTHROUGH</div><NavLink to={`/app/projects/${sample.id}/agreement`} onClick={() => setMobile(false)}><FileCheck2 /><span>Explore an agreement</span><ArrowUpRight /></NavLink></>}
      <NavLink to="/app/guide" onClick={() => setMobile(false)}><CircleHelp /><span>How it works</span></NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="side-copilot"><span><Sparkles /></span><small>AI RESOLUTION COPILOT</small><h3>A little clarity<br />goes a long way.</h3><p>Evidence first.<br />People in control.</p><Link to={resolution ? `/app/projects/${resolution.id}/resolution` : "/app/projects"}>Open a project <ArrowUpRight /></Link></div>
      {isDemoAccount && <button className="switch-role" onClick={() => { setMobile(false); onSwitch(); }} disabled={switching}>{switching ? <LoaderCircle className="spin" /> : <SwitchCamera />}<span><b>Switch demo role</b><small>View as {user.role === "client" ? "freelancer" : "client"}</small></span><ChevronRight /></button>}
      <button className="logout" onClick={onLogout}><LogOut /> Sign out</button></div>
    </aside>
    <div className="product-main"><header className="app-topbar"><button className="menu-button" onClick={() => setMobile(true)} aria-label="Open menu"><Menu /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight /><b>{location.pathname.includes("guide") ? "How it works" : location.pathname.includes("projects/") ? "Project detail" : location.pathname.includes("projects") ? "Projects" : "Overview"}</b></div>
      <button className="global-search" onClick={() => { setQuery(""); setSearchOpen(true); }}><Search /><span>Find a project</span><kbd>Ctrl K</kbd></button><div className="top-actions"><span className="environment-pill"><span className="live-dot" />{health ? health.paypal_mode === "sandbox" ? "PAYPAL SANDBOX" : "SAMPLE MODE" : "CONNECTING"}</span><span className="top-avatar" title={user.name}>{initials(user.name)}</span></div></header>
      {children}<footer className="workspace-footer"><span><ShieldCheck /> Human-approved, at every step.</span><span>Milestone / PayPal + AI</span></footer>
    </div>
    {searchOpen && <Modal title="Find your next step" onClose={() => setSearchOpen(false)}><label className="command-input"><Search /><input aria-label="Find a project" autoFocus placeholder="Search project or person…" value={query} onChange={(event) => setQuery(event.target.value)} /><Command /></label><div className="command-results">{projects.filter((project) => `${project.title} ${project.counterparty}`.toLowerCase().includes(query.toLowerCase())).map((project) => <Link key={project.id} to={`/app/projects/${project.id}/overview`} onClick={() => setSearchOpen(false)}><span className={`project-monogram p${project.id % 4}`}>{initials(project.title)}</span><div><b>{project.title}</b><small>{project.counterparty}</small></div><Badge value={project.status} /><ArrowUpRight /></Link>)}{searchError && <p>{searchError}</p>}{!projects.some((project) => `${project.title} ${project.counterparty}`.toLowerCase().includes(query.toLowerCase())) && <p>No matching projects. Try a different name.</p>}</div><div className="command-footer"><span><kbd>Esc</kbd> to close</span><Link to="/app/projects" onClick={() => setSearchOpen(false)}>View all projects <ArrowRight /></Link></div></Modal>}
  </div>;
}

const stageLink = (project: ProjectSummary) => project.status === "resolution" ? "resolution" : ["in_progress", "delivery_review"].includes(project.status) ? "delivery" : project.status === "payment" ? "payment" : ["resolved", "completed"].includes(project.status) ? "activity" : "agreement";
const projectThemes = ["website", "brand", "launch", "product"];

export function DashboardView({ user, projects, error }: { user: User; projects: ProjectSummary[]; error: string }) {
  const active = projects.filter((project) => !["completed", "resolved"].includes(project.status));
  const resolutionCount = projects.filter((project) => project.status === "resolution").length;
  const reviewCount = projects.filter((project) => project.status === "delivery_review").length;
  const sampleCount = projects.filter((project) => project.payment_mode === "demo").length;
  const sandbox = projects.filter((project) => project.payment_mode === "sandbox");
  const currencies = [...new Set(projects.map((project) => project.currency))];
  const value = currencies.map((currency) => money(projects.filter((project) => project.currency === currency).reduce((sum, project) => sum + project.budget_cents, 0), currency)).join(" + ") || money(0);
  const sandboxCurrencies = [...new Set(sandbox.map((project) => project.currency))];
  const capturedValue = sandboxCurrencies.map((currency) => money(sandbox.filter((project) => project.currency === currency).reduce((sum, project) => sum + project.captured_cents - project.refunded_cents, 0), currency)).join(" + ") || money(0);
  const focus = projects.find((project) => project.status === "resolution") ?? projects.find((project) => project.status === "delivery_review") ?? active[0];
  const pipeline = [{ label: "Agreement", count: projects.filter((p) => p.status === "agreement_review").length, tone: "gray" }, { label: "Payment & work", count: projects.filter((p) => ["payment", "in_progress"].includes(p.status)).length, tone: "teal" }, { label: "Delivery review", count: reviewCount, tone: "violet" }, { label: "Resolution", count: resolutionCount, tone: "coral" }];
  return <main className="page dashboard-page"><div className="welcome"><div><small>YOUR WORK, IN A BETTER PLACE</small><h1>Good to see you, {user.name.split(" ")[0]}<span className="heading-dot">.</span></h1><p>{user.role === "freelancer" ? "Great work starts with clarity. Let’s keep yours moving." : "A clear view of the work, the evidence, and your next decision."}</p></div><div className="welcome-actions"><span className="today-label">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>{user.role === "freelancer" && <Link className="ms-button" to="/app/projects?new=1"><Plus /> New project</Link>}</div></div>
    <Link className="welcome-guide" to="/app/guide"><CircleHelp /><span><b>New to Milestone?</b> Follow the four-step guide and choose a starting project.</span><span>How it works <ArrowRight /></span></Link>
    {error && <div className="form-error">{error}</div>}
    <div className="metric-grid"><article><div><small>ACTIVE PROJECTS</small><FolderKanban /></div><strong>{active.length}<span> / {projects.length}</span></strong><p>Milestones moving forward</p></article><article><div><small>PROJECT VALUE</small><CircleDollarSign /></div><strong className="metric-money">{value}</strong><p>{sampleCount ? `Includes ${sampleCount} sample walkthrough${sampleCount === 1 ? "" : "s"}` : "Across shared project agreements"}</p></article><article><div><small>AWAITING REVIEW</small><FileCheck2 /></div><strong>{reviewCount}<span> deliveries</span></strong><p>Evidence ready to inspect</p></article><article className={resolutionCount ? "metric-attention" : ""}><div><small>OPEN CONVERSATIONS</small><MessageSquareText /></div><strong>{resolutionCount}<span> {resolutionCount === 1 ? "resolution" : "resolutions"}</span></strong><p>{resolutionCount ? "Find the next fair step together" : "No open concerns"}</p></article></div>
    <div className="dashboard-feature-grid"><section className="focus-card"><div className="focus-top"><span><Sparkles /> YOUR NEXT MEANINGFUL STEP</span><span className="focus-index">01</span></div><div className="focus-content"><div><h2>{focus?.status === "resolution" ? <>Turn a concern<br />into a <em>conversation.</em></> : focus?.status === "delivery_review" ? <>The work is ready.<br /><em>Take a closer look.</em></> : <>Keep your next<br /><em>milestone moving.</em></>}</h2><p>{focus?.status === "resolution" ? "Start with the agreement and evidence. Let the AI copilot help you find common ground." : "Bring the scope, payment, and submitted proof together before your next decision."}</p></div><div className="focus-art" aria-hidden="true"><div className="focus-orbit"><div className="orbit-center"><Sparkles /></div><span className="orbit-one"><FileCheck2 /></span><span className="orbit-two"><MessageSquareText /></span><span className="orbit-three"><ShieldCheck /></span></div></div></div><div className="focus-bottom">{focus ? <><div><span className={`project-monogram p${focus.id % 4}`}>{initials(focus.title)}</span><div><b>{focus.title}</b><small>{focus.counterparty} · {focus.payment_mode === "demo" ? "Sample walkthrough" : "Shared project"}</small></div></div><Link className="ms-button lime" to={`/app/projects/${focus.id}/${stageLink(focus)}`}>{focus.status === "resolution" ? "Open Resolution Room" : "Open project"}<ArrowUpRight /></Link></> : <><p>Your next project starts with a shared agreement.</p><Link className="ms-button lime" to="/app/projects">View projects <ArrowUpRight /></Link></>}</div></section>
    <section className="surface workspace-pulse"><div className="surface-head"><div><small>THE BIG PICTURE</small><h2>Workspace pulse</h2></div><Activity /></div><div className="pulse-total"><strong>{active.length}</strong><span>active milestones<br /><b>Every stage, connected.</b></span></div><div className="pipeline-bar" aria-label="Project distribution by stage">{pipeline.filter((stage) => stage.count > 0).map((stage) => <span key={stage.label} className={stage.tone} style={{ flex: stage.count }} title={`${stage.label}: ${stage.count}`} />)}</div><div className="pipeline-legend">{pipeline.map((stage) => <div key={stage.label}><i className={stage.tone} /><span>{stage.label}</span><b>{stage.count}</b></div>)}</div><div className="pulse-payment"><CircleDollarSign /><div><small>NET CAPTURED IN PAYPAL SANDBOX</small><b>{capturedValue}</b><p>Excludes sample transactions</p></div></div></section></div>
    <div className="section-row"><div><small>GOOD WORK IN PROGRESS</small><h2>Your projects<span>{projects.length}</span></h2></div><Link className="text-link" to="/app/projects">View all projects <ArrowRight /></Link></div>
    <div className="project-card-grid">{projects.slice(0, 3).map((project) => <Link className={`project-card ${projectThemes[(project.id - 1) % 4]}`} to={`/app/projects/${project.id}/${stageLink(project)}`} key={project.id}><div className="project-card-art"><div className="card-art-lines" /><span className="project-art-letter">{initials(project.title)}</span><span className="project-card-number">PROJECT / {String(project.id).padStart(3, "0")}</span><span className="card-open"><ArrowUpRight /></span></div><div className="project-card-body"><div className="card-status-row"><Badge value={project.status} /><small>{project.payment_mode === "demo" ? "Sample" : project.payment_mode === "sandbox" ? "Sandbox" : "New project"}</small></div><h3>{project.title}</h3><p>With {project.counterparty}</p><div className="project-card-bottom"><span><small>MILESTONE VALUE</small><b>{money(project.budget_cents, project.currency)}</b></span><span><small>DUE DATE</small><b>{date(project.due_date)}</b></span></div></div></Link>)}</div>
    {sampleCount > 0 && <div className="sample-disclosure"><BadgeCheck /><p><b>Explore the examples. Build your own.</b> {sampleCount} projects use sample transactions. New projects use PayPal Sandbox when credentials are configured.</p><Link to="/app/projects">Open projects <ArrowUpRight /></Link></div>}
  </main>;
}
