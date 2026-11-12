import { createContext } from "react";
import type { ProjectDetail } from "./domain";

export const BusyContext = createContext(false);
export const money = (cents: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
export const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
export const timestamp = (value: string) => new Date(value.includes("T") && !/(Z|[+-]\d\d:\d\d)$/.test(value) ? `${value}Z` : value);
export const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(timestamp(value));
export const initials = (name: string) => name.split(" ").slice(0, 2).map((part) => part[0]).join("");

export function nextStep(project: ProjectDetail) {
  const role = project.viewer_role;
  if (["completed", "resolved"].includes(project.status)) return { phase: 4, title: "This milestone has a final outcome", detail: "The decisions and payment records are saved in the activity trail.", section: "activity", label: "View final record" };
  if (!project.agreement.locked_at) {
    const approved = project.agreement.approvals.some((approval) => approval.role === role);
    return { phase: 1, title: approved ? "Waiting for the other person’s agreement approval" : "Review and approve the agreement", detail: "Both people must approve the same version before the client pays.", section: "agreement", label: "Open agreement" };
  }
  if (!project.milestone.payment?.captured_cents) return { phase: 2, title: role === "client" ? "Approve checkout in PayPal, then confirm capture" : "Waiting for the client’s payment", detail: role === "client" ? "Your Milestone client account approves the app action. Your Personal Sandbox buyer account approves PayPal checkout." : "For the prototype, Switch demo role lets you sign in as the client and complete payment.", section: "payment", label: "Open payment" };
  if (!project.milestone.deliverable || project.status === "in_progress") return { phase: 3, title: role === "freelancer" ? project.milestone.deliverable ? "Submit revised work and evidence" : "Submit the finished work and evidence" : "Waiting for the freelancer’s delivery", detail: "The freelancer shares a delivery URL and evidence. The client then reviews the work.", section: "delivery", label: "Open delivery" };
  if (project.status === "resolution") {
    const selected = project.resolution?.proposals.find((proposal) => proposal.approvals.length > 0);
    const mine = selected?.approvals.some((approval) => approval.role === role);
    return { phase: 4, title: selected?.approvals.length === 2 ? role === "client" ? "Confirm the outcome both people approved" : "Both people approved; the client confirms execution" : mine ? "Waiting for the other person’s proposal approval" : selected ? "Review the proposal the other person selected" : "Review the concern and agree a way forward", detail: "AI prepares evidence gaps and questions. Both people select the same outcome before the client confirms it.", section: "resolution", label: "Open Resolution Room" };
  }
  return { phase: 4, title: role === "client" ? "Review the delivery and choose the next step" : "Waiting for the client’s delivery review", detail: "The client can accept the work or open a concern in the Resolution Room.", section: "delivery", label: "Review delivery" };
}

export function downloadRecord(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
