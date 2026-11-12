import type { Project, Role } from "./types";

async function request(path: string, options: RequestInit = {}): Promise<Project> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail || "Request failed");
  }
  return response.json();
}

const post = (path: string, body?: unknown) =>
  request(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  create: (brief: string, title: string, amountCents: number) =>
    post("/api/projects", { brief, title, amount_cents: amountCents, currency: "USD" }),
  demo: () => post("/api/demo"),
  approve: (id: string, role: Role, name: string) =>
    post(`/api/projects/${id}/approve`, { role, name, confirmed: true }),
  createPayment: (id: string) =>
    post(`/api/projects/${id}/payment/create`, { actor: "Casey Client", confirmed: true }),
  capturePayment: (id: string) =>
    post(`/api/projects/${id}/payment/capture`, { actor: "Casey Client", confirmed: true }),
  submit: (id: string, url: string, summary: string, evidence: string[]) =>
    post(`/api/projects/${id}/deliverable`, {
      actor: "Frankie Freelancer",
      url,
      summary,
      evidence,
    }),
  evaluate: (id: string) => post(`/api/projects/${id}/evaluate`),
  accept: (id: string) =>
    post(`/api/projects/${id}/accept`, { actor: "Casey Client", confirmed: true }),
  complain: (id: string, complaint: string) =>
    post(`/api/projects/${id}/resolution`, { actor: "Casey Client", complaint }),
  approveResolution: (id: string, role: Role, name: string, optionId: string) =>
    post(`/api/projects/${id}/resolution/approve`, {
      role,
      name,
      option_id: optionId,
      confirmed: true,
    }),
  refund: (id: string, amountCents: number) =>
    post(`/api/projects/${id}/refund`, {
      actor: "Casey Client",
      amount_cents: amountCents,
      confirmed: true,
    }),
};
