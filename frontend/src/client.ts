import type { AiResolutionReview, IntegrationHealth, ProjectDetail, ProjectSummary, User } from "./domain";
export type { AiResolutionReview } from "./domain";

const TOKEN_KEY = "milestone_token";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string | Array<{ msg: string }> } | null;
    throw new Error(typeof body?.detail === "string" ? body.detail : Array.isArray(body?.detail) ? body.detail.map((item) => item.msg).join(". ") : "Something went wrong. Please try again.");
  }
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const client = {
  health: () => request<IntegrationHealth>("/api/health"),
  token: () => localStorage.getItem(TOKEN_KEY),
  logout: () => localStorage.removeItem(TOKEN_KEY),
  login: async (email: string, password: string) => {
    const result = await post<{ access_token: string; user: User }>("/api/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, result.access_token);
    return result.user;
  },
  me: () => request<User>("/api/auth/me"),
  projects: () => request<ProjectSummary[]>("/api/projects"),
  project: (id: number) => request<ProjectDetail>(`/api/projects/${id}`),
  createProject: (body: object) => post<ProjectDetail>("/api/projects", body),
  approveAgreement: (id: number) => post<ProjectDetail>(`/api/projects/${id}/agreement/approve`, { confirmed: true }),
  editAgreement: (id: number, body: object) => post<ProjectDetail>(`/api/projects/${id}/agreement/versions`, body),
  createOrder: (id: number) => post<ProjectDetail>(`/api/projects/${id}/payment/order`, { confirmed: true }),
  captureOrder: (id: number) => post<ProjectDetail>(`/api/projects/${id}/payment/capture`, { confirmed: true }),
  submitDelivery: (id: number, body: object) => post<ProjectDetail>(`/api/projects/${id}/delivery`, body),
  accept: (id: number) => post<ProjectDetail>(`/api/projects/${id}/accept`, { confirmed: true }),
  openResolution: (id: number, reason: string) => post<ProjectDetail>(`/api/projects/${id}/resolution`, { reason }),
  aiResolutionReview: (id: number) => post<AiResolutionReview>(`/api/projects/${id}/ai-resolution-review`, {}),
  approveProposal: (projectId: number, proposalId: number) =>
    post<ProjectDetail>(`/api/projects/${projectId}/resolution/proposals/${proposalId}/approve`, { confirmed: true }),
  createProposal: (projectId: number, body: object) => post<ProjectDetail>(`/api/projects/${projectId}/resolution/proposals`, body),
  executeProposal: (projectId: number, proposalId: number) =>
    post<ProjectDetail>(`/api/projects/${projectId}/resolution/proposals/${proposalId}/execute`, { confirmed: true }),
};
