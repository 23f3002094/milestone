export type Role = "client" | "freelancer";

export interface AiResolutionReview {
  provider: string; summary: string; evidence_gaps: string[]; clarifying_questions: string[];
  suggested_next_steps: string[]; advisory_only: boolean; guardrail: string; generated_at?: string;
}

export interface IntegrationHealth {
  ok: boolean; paypal_mode: "sandbox" | "demo"; ai_configured: boolean; ai_model: string | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  company: string;
}

export interface ProjectSummary {
  id: number;
  title: string;
  status: string;
  budget_cents: number;
  currency: string;
  due_date: string;
  role: Role;
  counterparty: string;
  payment_mode: "demo" | "sandbox" | null;
  captured_cents: number;
  refunded_cents: number;
}

export interface ProjectDetail {
  id: number;
  title: string;
  brief: string;
  status: string;
  currency: string;
  budget_cents: number;
  due_date: string;
  viewer_role: Role;
  ai_review: AiResolutionReview | null;
  members: Array<{ id: number; name: string; email: string; role: Role }>;
  agreement: {
    id: number;
    version: number;
    summary: string;
    ambiguities: string[];
    out_of_scope: string[];
    locked_at: string | null;
    items: Array<{
      id: number;
      title: string;
      description: string;
      criteria: Array<{ id: number; description: string; check_type: string; expected: string }>;
    }>;
    approvals: Array<{ user_id: number; role: Role; approved_at: string }>;
  };
  milestone: {
    id: number;
    title: string;
    amount_cents: number;
    currency: string;
    status: string;
    due_date: string;
    payment: null | {
      order_id: string;
      status: string;
      mode: "demo" | "sandbox";
      approval_url: string | null;
      captured_cents: number;
      capture_id: string | null;
      refunded_cents: number;
      refunds: Array<{ id: string; status: string; amount_cents: number }>;
    };
    deliverable: null | {
      id: number;
      url: string;
      summary: string;
      submitted_at: string;
      evidence: Array<{ id: number; label: string; url: string | null; notes: string }>;
      evaluations: Array<{ criterion_id: number; passed: boolean; detail: string }>;
    };
  };
  resolution: null | {
    id: number;
    reason: string;
    status: string;
    proposals: Array<{
      id: number;
      kind: string;
      title: string;
      description: string;
      amount_cents: number;
      approvals: Array<{ user_id: number; role: Role }>;
    }>;
  };
  audit: Array<{ id: number; event: string; detail: string; actor: string; at: string }>;
}
