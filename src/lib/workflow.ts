// Approval-workflow automation — deterministic, transparent policy engine.
// Produces an auto-recommendation (approve / reject / manual review) with the
// exact rules that fired. The officer always keeps the final say (override).

import { detectAnomalies, fraudRisk, type RiskApplication } from "./risk";
import { getScoreBand, type ScoreBand } from "./scoring";

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return v === null || v === undefined || Number.isNaN(n) ? fallback : n;
};

export type WorkflowAction = "auto_approve" | "auto_reject" | "manual_review";

export interface WorkflowPolicy {
  approveBands: ScoreBand[];
  approveMaxPd: number; // PD must be at or below this to auto-approve
  approveMaxFoir: number; // FOIR must be at or below this to auto-approve
  rejectBands: ScoreBand[];
  rejectMinPd: number; // PD at or above this auto-rejects
}

export const DEFAULT_POLICY: WorkflowPolicy = {
  approveBands: ["EXCELLENT", "VERY_GOOD"],
  approveMaxPd: 0.15,
  approveMaxFoir: 0.4,
  rejectBands: ["VERY_POOR"],
  rejectMinPd: 0.5,
};

export interface WorkflowResult {
  action: WorkflowAction;
  reasons: string[];
  pd: number;
  foir: number;
  band: ScoreBand;
  anomalyCount: number;
  fraud: ReturnType<typeof fraudRisk>;
}

export function evaluateWorkflow(
  app: RiskApplication,
  policy: WorkflowPolicy = DEFAULT_POLICY,
): WorkflowResult {
  const band = (app.score_band as ScoreBand) ?? getScoreBand(num(app.arthsetu_score));
  const pd = num(app.default_probability);
  const monthly = num(app.monthly_net_income);
  const foir = monthly > 0 ? num(app.total_emi_monthly) / monthly : 0;
  const flags = detectAnomalies(app);
  const fraud = fraudRisk(flags);

  const reasons: string[] = [];

  // Fraud always forces a human — never auto-decide a flagged file.
  if (fraud === "elevated") {
    reasons.push(
      `${flags.filter((f) => f.severity === "high").length} high-severity fraud flag(s) require manual verification.`,
    );
    return { action: "manual_review", reasons, pd, foir, band, anomalyCount: flags.length, fraud };
  }

  // Auto-reject rules.
  if (policy.rejectBands.includes(band)) {
    reasons.push(`Score band is ${band.replace("_", " ").toLowerCase()} (auto-reject band).`);
  }
  if (pd >= policy.rejectMinPd) {
    reasons.push(`Default probability ${(pd * 100).toFixed(0)}% ≥ ${(policy.rejectMinPd * 100).toFixed(0)}% reject threshold.`);
  }
  if (reasons.length > 0) {
    return { action: "auto_reject", reasons, pd, foir, band, anomalyCount: flags.length, fraud };
  }

  // Auto-approve rules — all must hold.
  const approveChecks = [
    {
      ok: policy.approveBands.includes(band),
      pass: `Strong score band (${band.replace("_", " ").toLowerCase()}).`,
      fail: `Score band ${band.replace("_", " ").toLowerCase()} is below auto-approve tier.`,
    },
    {
      ok: pd <= policy.approveMaxPd,
      pass: `Low default probability (${(pd * 100).toFixed(0)}%).`,
      fail: `Default probability ${(pd * 100).toFixed(0)}% exceeds ${(policy.approveMaxPd * 100).toFixed(0)}% limit.`,
    },
    {
      ok: foir <= policy.approveMaxFoir,
      pass: `Healthy repayment burden (FOIR ${(foir * 100).toFixed(0)}%).`,
      fail: `Repayment burden FOIR ${(foir * 100).toFixed(0)}% above ${(policy.approveMaxFoir * 100).toFixed(0)}% limit.`,
    },
    {
      ok: flags.length === 0,
      pass: "No anomaly flags.",
      fail: `${flags.length} anomaly flag(s) need a closer look.`,
    },
  ];

  if (approveChecks.every((c) => c.ok)) {
    return {
      action: "auto_approve",
      reasons: approveChecks.map((c) => c.pass),
      pd,
      foir,
      band,
      anomalyCount: flags.length,
      fraud,
    };
  }

  // Otherwise route to a human, explaining what blocked auto-approval.
  reasons.push(...approveChecks.filter((c) => !c.ok).map((c) => c.fail));
  return { action: "manual_review", reasons, pd, foir, band, anomalyCount: flags.length, fraud };
}

export const ACTION_META: Record<
  WorkflowAction,
  { label: string; cls: string }
> = {
  auto_approve: { label: "Auto-approve", cls: "bg-success/15 text-success border-success/30" },
  auto_reject: { label: "Auto-reject", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  manual_review: { label: "Manual review", cls: "bg-warning/15 text-warning border-warning/30" },
};
