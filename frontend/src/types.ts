export type Role = "client" | "freelancer";

export interface Requirement {
  id: string;
  title: string;
  description: string;
  check: "url" | "text" | "evidence";
  expected: string;
}

export interface Check {
  requirement_id: string;
  title: string;
  passed: boolean;
  method: string;
}

export interface ResolutionOption {
  id: string;
  type: "revision" | "partial_refund" | "adjusted_final_payment" | "paid_change_order";
  title: string;
  description: string;
  amount_cents: number;
}

export interface Project {
  id: string;
  title: string;
  brief: string;
  currency: string;
  total_cents: number;
  status: string;
  scope: {
    summary: string;
    requirements: Requirement[];
    ambiguities: string[];
    out_of_scope: string[];
    ai_advisory?: { provider: string; text: string; advisory_only: boolean } | null;
  };
  approvals: Record<Role, { name: string; at: string } | null>;
  payment: {
    mode: "demo" | "sandbox";
    status: string;
    order_id: string | null;
    capture_id: string | null;
    captured_cents: number;
    refunded_cents: number;
    approval_url: string | null;
  };
  deliverable: {
    url: string;
    summary: string;
    evidence: string[];
    submitted_at: string;
  } | null;
  evaluation: {
    checks: Check[];
    passed: number;
    total: number;
    result: string;
    disclaimer: string;
    ai_advisory?: { provider: string; text: string; advisory_only: boolean } | null;
  } | null;
  resolution: {
    complaint: string;
    comparison: { failed_checks: string[]; scope_note: string };
    options: ResolutionOption[];
    approvals: Record<Role, { name: string; at: string } | null>;
    selected_option_id: string | null;
    status: string;
  } | null;
  audit: { at: string; event: string; actor: string; detail: string }[];
}
