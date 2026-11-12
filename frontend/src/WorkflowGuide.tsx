import { useEffect, useState } from "react";
import { ArrowRight, CircleDollarSign, CircleHelp, FileCheck2, Layers3, MessageSquareText, ShieldCheck, Sparkles, SwitchCamera } from "lucide-react";
import { Link } from "react-router-dom";
import { client } from "./client";
import type { ProjectSummary, User } from "./domain";
import { Badge } from "./ui";

const steps = [
  { title: "Agree on the work", role: "Freelancer starts · both people approve", icon: FileCheck2, body: "A milestone is one piece of work with an agreed price. The freelancer creates it, describes the deliverables, and edits the acceptance criteria. Both people approve the same agreement version to lock it.", result: "You know what will be delivered and how it will be reviewed." },
  { title: "Pay through PayPal", role: "Client acts", icon: CircleDollarSign, body: "The client creates the payment order, approves it in PayPal Sandbox with a Personal Sandbox buyer account, then returns to Milestone and clicks Confirm capture. Sandbox payments use test funds.", result: "The project records the payment and the freelancer can submit work." },
  { title: "Deliver the work with proof", role: "Freelancer acts", icon: Layers3, body: "The freelancer shares a delivery URL, explains what was delivered, and attaches evidence. The app compares submitted text and links with the criteria to organize the review. People still inspect the actual work.", result: "The client sees the work and the evidence beside the original agreement." },
  { title: "Accept it or resolve a concern", role: "Client reviews · both people resolve", icon: MessageSquareText, body: "The client can accept the delivery. If there is a concern, the Resolution Room brings the agreement and evidence together. Ask AI for an advisory review, propose a revision or partial refund, and approve the same terms as both people. The client confirms the final action.", result: "The outcome is recorded. An agreed revision lets the freelancer submit updated work." },
];

export default function WorkflowGuide({ user }: { user: User }) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void client.projects().then(setProjects).catch(() => setError("Open Projects to choose a workspace when the connection returns.")); }, []);
  const sandbox = projects.find((project) => project.payment_mode === "sandbox" && project.status === "payment");
  const delivery = projects.find((project) => project.status === "delivery_review");
  const resolution = projects.find((project) => project.status === "resolution");
  return <main className="page guide-page"><div className="page-title"><div><small>START HERE</small><h1>One project. Four clear steps.</h1><p>Agree → Pay → Deliver → Decide. Each project stays with both people throughout.</p></div><CircleHelp /></div>
    <section className="guide-identity"><span><SwitchCamera /></span><div><h2>You’re signed in as {user.name.split(" ")[0]}, the {user.role}.</h2><p>Frankie is the freelancer. Casey is the client. Use <b>Switch demo role</b> in the sidebar to try the other account while staying on the same project.</p><p>Your PayPal Sandbox buyer login is a separate account used only on PayPal’s checkout page.</p></div></section>
    <div className="guide-steps">{steps.map(({ title, role, icon: Icon, body, result }, index) => <article className="surface" key={title}><div className="guide-step-head"><span>0{index + 1}</span><Icon /><small>{role}</small></div><h2>{title}</h2><p>{body}</p><div className="guide-result"><ShieldCheck /><span>{result}</span></div></article>)}</div>
    <div className="section-row"><div><small>CHOOSE WHAT YOU WANT TO TRY</small><h2>A starting point for each experience.</h2></div></div><p className="guide-examples-note">The example projects begin at later steps so you can explore the review and resolution screens immediately.</p>{error && <div className="form-error">{error}</div>}
    <div className="guide-starts">{sandbox && <Link to={`/app/projects/${sandbox.id}/payment`}><CircleDollarSign /><Badge value="sandbox" /><h3>Complete your $1 checkout</h3><p>Sign in as Casey. Approve in PayPal, return here, and confirm capture.</p><span>Go to payment <ArrowRight /></span></Link>}{delivery && <Link to={`/app/projects/${delivery.id}/delivery`}><Layers3 /><Badge value={delivery.payment_mode ?? "Not created"} /><h3>Try reviewing delivered work</h3><p>Open {delivery.title}. Casey can inspect the proof and choose a decision.</p><span>Go to delivery <ArrowRight /></span></Link>}{resolution && <Link to={`/app/projects/${resolution.id}/resolution`}><Sparkles /><Badge value={resolution.payment_mode ?? "Not created"} /><h3>Try the AI Resolution Copilot</h3><p>Open {resolution.title}. Inspect the live AI review and proposal approvals.</p><span>Go to Resolution Room <ArrowRight /></span></Link>}</div>
    <section className="guide-difference"><ShieldCheck /><div><h3>What “sample” and “Sandbox” mean</h3><p><b>Sample projects:</b> real records saved in the app, with simulated payment references and example delivery links.</p><p><b>New Sandbox projects:</b> payment orders call PayPal’s real Sandbox API using test money.</p><p><b>AI review:</b> calls the configured AI service live. It prepares advice and never approves payments or decides the outcome.</p></div></section><div className="guide-footer"><Link className="ms-button" to={user.role === "freelancer" ? "/app/projects?new=1" : "/app/projects"}>{user.role === "freelancer" ? "Start your own project" : "Open your projects"}<ArrowRight /></Link></div>
  </main>;
}
