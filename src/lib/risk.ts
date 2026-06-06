// ArthSetu deterministic risk + roadmap engine.
// Pure, explainable, framework-agnostic — no black-box model, no API calls.
// Every output is traceable to a concrete rule or a re-run of the scoring engine.

import { computeScore, getScoreBand, type ScoringInput, type ScoreBand } from "./scoring";

// A loose shape covering the columns we read off an application row.
export interface RiskApplication extends ScoringInput {
  id?: string;
  full_name?: string | null;
  user_id?: string | null;
  status?: string | null;
  arthsetu_score?: number | string | null;
  score_band?: string | null;
  default_probability?: number | string | null;
  recommended_credit_limit?: number | string | null;
  recommended_interest_rate?: number | string | null;
  net_worth?: number | string | null;
  created_at?: string | null;
}

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return v === null || v === undefined || Number.isNaN(n) ? fallback : n;
};

// ---------------------------------------------------------------------------
// 1. Fraud & anomaly detection
// ---------------------------------------------------------------------------

export type AnomalySeverity = "high" | "medium" | "low";

export interface AnomalyFlag {
  code: string;
  label: string;
  detail: string;
  severity: AnomalySeverity;
}

const SEVERITY_WEIGHT: Record<AnomalySeverity, number> = {
  high: 40,
  medium: 20,
  low: 10,
};

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

/**
 * Run deterministic consistency checks on a single application.
 * Each flag explains exactly which two declared values disagree.
 */
export function detectAnomalies(app: RiskApplication): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  const annual = num(app.annual_income);
  const monthly = num(app.monthly_net_income);
  const loan = num(app.loan_amount_requested);
  const emi = num(app.total_emi_monthly);
  const cibil = num(app.cibil_score);
  const missed = num(app.missed_payments_12m);
  const defaults = num(app.loan_defaults_ever);
  const enquiries = num(app.credit_enquiries_6m);
  const digital = num(app.digital_footprint_score, 50);
  const age = num(app.age, 30);
  const tenure = num(app.employment_tenure_months);
  const tax = num(app.tax_filing_years);

  const assets =
    num(app.property_value) +
    num(app.vehicle_value) +
    num(app.bank_balance) +
    num(app.fixed_deposits) +
    num(app.gold_value);

  // Income statements that contradict each other.
  if (annual > 0 && monthly > 0) {
    const implied = monthly * 12;
    const diff = Math.abs(annual - implied) / Math.max(annual, implied);
    if (diff > 0.35) {
      flags.push({
        code: "income_mismatch",
        label: "Income statements disagree",
        detail: `Annual income (₹${inr(annual)}) is inconsistent with monthly net income × 12 (₹${inr(implied)}).`,
        severity: "high",
      });
    }
  }

  // Employment tenure longer than the applicant could plausibly have worked.
  if (tenure > Math.max(0, (age - 18) * 12) && age > 0) {
    flags.push({
      code: "tenure_impossible",
      label: "Implausible employment tenure",
      detail: `Tenure of ${tenure} months exceeds the maximum possible working life since age 18 (${(age - 18) * 12} months).`,
      severity: "high",
    });
  }

  // Pristine bureau score that contradicts recent defaults / missed payments.
  if (cibil >= 750 && (defaults > 0 || missed >= 3)) {
    flags.push({
      code: "cibil_behaviour_conflict",
      label: "Bureau score conflicts with history",
      detail: `CIBIL of ${cibil} is unusually high given ${defaults} default(s) and ${missed} missed payment(s) in 12 months.`,
      severity: "high",
    });
  }

  // Loan request far beyond repayment capacity.
  if (annual > 0 && loan > annual * 5) {
    flags.push({
      code: "loan_to_income",
      label: "Loan far exceeds income",
      detail: `Requested ₹${inr(loan)} is over 5× annual income (₹${inr(annual)}).`,
      severity: "medium",
    });
  }

  // Over-leveraged: FOIR above 60%.
  if (monthly > 0) {
    const foir = emi / monthly;
    if (foir > 0.6) {
      flags.push({
        code: "high_foir",
        label: "Over-leveraged (high FOIR)",
        detail: `EMIs consume ${(foir * 100).toFixed(0)}% of monthly net income (safe limit is 40%).`,
        severity: "medium",
      });
    }
  }

  // Declared wealth wildly out of proportion to income (possible inflation).
  if (annual > 0 && assets > annual * 50) {
    flags.push({
      code: "asset_income_mismatch",
      label: "Assets disproportionate to income",
      detail: `Declared assets (₹${inr(assets)}) exceed 50× annual income — verify documentation.`,
      severity: "medium",
    });
  }

  // Burst of recent credit enquiries — classic credit-hungry / fraud signal.
  if (enquiries >= 6) {
    flags.push({
      code: "enquiry_burst",
      label: "Credit enquiry burst",
      detail: `${enquiries} credit enquiries in the last 6 months suggest aggressive credit seeking.`,
      severity: "medium",
    });
  }

  // Thin / synthetic file: no bureau, no tax, almost no digital trail.
  if (cibil === 0 && tax === 0 && digital < 20) {
    flags.push({
      code: "thin_file",
      label: "Thin / unverifiable file",
      detail: "No bureau score, no tax history and minimal digital footprint — identity needs manual verification.",
      severity: "low",
    });
  }

  return flags;
}

export function anomalyScore(flags: AnomalyFlag[]): number {
  return Math.min(100, flags.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0));
}

export type FraudRisk = "clear" | "review" | "elevated";

export function fraudRisk(flags: AnomalyFlag[]): FraudRisk {
  if (flags.some((f) => f.severity === "high")) return "elevated";
  if (flags.length > 0) return "review";
  return "clear";
}

// ---------------------------------------------------------------------------
// 2. Portfolio-level risk analytics
// ---------------------------------------------------------------------------

export interface PortfolioRisk {
  total: number;
  approvedCount: number;
  exposure: number; // total recommended limit across approved
  expectedLoss: number; // Σ limit × default probability (approved)
  weightedDefaultProb: number; // exposure-weighted
  avgDefaultProb: number;
  highRiskCount: number; // POOR / VERY_POOR or PD > 0.4
  flaggedCount: number; // applications with ≥1 anomaly
  elevatedCount: number; // applications with a high-severity anomaly
  avgFoir: number;
  bandExposure: { band: ScoreBand; exposure: number; count: number }[];
  topExposures: { id: string; name: string; exposure: number; defaultProb: number }[];
}

const APPROVED = ["approved", "override_approved"];
const BANDS: ScoreBand[] = ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR", "VERY_POOR"];

export function computePortfolioRisk(apps: RiskApplication[]): PortfolioRisk {
  const approved = apps.filter((a) => APPROVED.includes(String(a.status)));

  let exposure = 0;
  let expectedLoss = 0;
  let pdSum = 0;
  const bandMap = new Map<ScoreBand, { exposure: number; count: number }>();
  BANDS.forEach((b) => bandMap.set(b, { exposure: 0, count: 0 }));

  for (const a of approved) {
    const limit = num(a.recommended_credit_limit);
    const pd = num(a.default_probability);
    exposure += limit;
    expectedLoss += limit * pd;
    pdSum += pd;
    const band = (a.score_band as ScoreBand) ?? getScoreBand(num(a.arthsetu_score));
    const slot = bandMap.get(band);
    if (slot) {
      slot.exposure += limit;
      slot.count += 1;
    }
  }

  let foirSum = 0;
  let foirN = 0;
  let highRisk = 0;
  let flagged = 0;
  let elevated = 0;
  for (const a of apps) {
    const monthly = num(a.monthly_net_income);
    if (monthly > 0) {
      foirSum += num(a.total_emi_monthly) / monthly;
      foirN += 1;
    }
    const band = (a.score_band as ScoreBand) ?? getScoreBand(num(a.arthsetu_score));
    if (band === "POOR" || band === "VERY_POOR" || num(a.default_probability) > 0.4) {
      highRisk += 1;
    }
    const flags = detectAnomalies(a);
    if (flags.length > 0) flagged += 1;
    if (flags.some((f) => f.severity === "high")) elevated += 1;
  }

  const topExposures = [...approved]
    .sort((a, b) => num(b.recommended_credit_limit) - num(a.recommended_credit_limit))
    .slice(0, 5)
    .map((a) => ({
      id: String(a.id ?? ""),
      name: a.full_name ?? "—",
      exposure: num(a.recommended_credit_limit),
      defaultProb: num(a.default_probability),
    }));

  return {
    total: apps.length,
    approvedCount: approved.length,
    exposure,
    expectedLoss,
    weightedDefaultProb: exposure > 0 ? expectedLoss / exposure : 0,
    avgDefaultProb: approved.length ? pdSum / approved.length : 0,
    highRiskCount: highRisk,
    flaggedCount: flagged,
    elevatedCount: elevated,
    avgFoir: foirN ? foirSum / foirN : 0,
    bandExposure: BANDS.map((band) => ({ band, ...bandMap.get(band)! })),
    topExposures,
  };
}

// ---------------------------------------------------------------------------
// 3. Customer credit-improvement roadmap
// ---------------------------------------------------------------------------

export interface RoadmapStep {
  title: string;
  why: string;
  action: string;
  timeline: string;
  points: number; // projected score gain, measured by re-running the engine
  priority: "critical" | "high" | "medium";
}

export interface Roadmap {
  currentScore: number;
  currentBand: ScoreBand;
  projectedScore: number;
  projectedBand: ScoreBand;
  totalGain: number;
  steps: RoadmapStep[];
}

interface Candidate {
  title: string;
  why: string;
  action: string;
  timeline: string;
  priority: "critical" | "high" | "medium";
  applies: (i: ScoringInput) => boolean;
  improve: (i: ScoringInput) => ScoringInput;
}

const CANDIDATES: Candidate[] = [
  {
    title: "Clear past defaults",
    why: "Loan defaults are the single biggest drag on your score.",
    action: "Negotiate settlements with lenders and obtain no-dues certificates for every defaulted account.",
    timeline: "3-12 months",
    priority: "critical",
    applies: (i) => num(i.loan_defaults_ever) > 0,
    improve: (i) => ({ ...i, loan_defaults_ever: 0 }),
  },
  {
    title: "Stop missing payments",
    why: "Each missed EMI in the last year reduces your score.",
    action: "Set up auto-debit for every EMI and credit-card due so nothing is ever late.",
    timeline: "3-6 months",
    priority: "high",
    applies: (i) => num(i.missed_payments_12m) > 0,
    improve: (i) => ({ ...i, missed_payments_12m: 0 }),
  },
  {
    title: "Lower your credit utilisation",
    why: "Using a large share of your limit signals repayment stress.",
    action: "Keep credit-card usage under 30% of your total limit, ideally by paying mid-cycle.",
    timeline: "1-2 months",
    priority: "high",
    applies: (i) => num(i.credit_utilization_pct, 50) > 30,
    improve: (i) => ({ ...i, credit_utilization_pct: 25 }),
  },
  {
    title: "Reduce your EMI burden",
    why: "Your EMIs take up too much of your income (high FOIR).",
    action: "Pay off your smallest loan first to bring EMIs below 40% of monthly income.",
    timeline: "6-18 months",
    priority: "high",
    applies: (i) => {
      const m = num(i.monthly_net_income);
      return m > 0 && num(i.total_emi_monthly) / m > 0.4;
    },
    improve: (i) => ({
      ...i,
      total_emi_monthly: Math.round(num(i.monthly_net_income) * 0.3),
    }),
  },
  {
    title: "Space out credit applications",
    why: "Frequent enquiries in a short window look risky to lenders.",
    action: "Avoid new loan or card applications for the next 6 months.",
    timeline: "6 months",
    priority: "medium",
    applies: (i) => num(i.credit_enquiries_6m) > 2,
    improve: (i) => ({ ...i, credit_enquiries_6m: 0 }),
  },
  {
    title: "Build your digital footprint",
    why: "Consistent digital payments are alternative proof of reliability.",
    action: "Pay utilities, rent and subscriptions digitally via UPI/NEFT every month.",
    timeline: "3-6 months",
    priority: "medium",
    applies: (i) => num(i.digital_footprint_score, 50) < 70,
    improve: (i) => ({ ...i, digital_footprint_score: 85 }),
  },
  {
    title: "File your taxes regularly",
    why: "A longer tax-filing history strengthens income verification.",
    action: "File your income-tax return on time this year and keep the streak going.",
    timeline: "Annual",
    priority: "medium",
    applies: (i) => num(i.tax_filing_years) < 3,
    improve: (i) => ({ ...i, tax_filing_years: num(i.tax_filing_years) + 2 }),
  },
];

/**
 * Build an explainable roadmap. Each step's "points" is the real score delta
 * obtained by re-running the deterministic engine with that one change applied.
 */
export function buildRoadmap(app: RiskApplication): Roadmap {
  const base = computeScore(app);
  const currentScore = Math.round(base.arthsetu_score);

  const steps: RoadmapStep[] = [];
  for (const c of CANDIDATES) {
    if (!c.applies(app)) continue;
    const improved = computeScore(c.improve(app));
    const points = Math.round(improved.arthsetu_score - base.arthsetu_score);
    if (points <= 0) continue;
    steps.push({
      title: c.title,
      why: c.why,
      action: c.action,
      timeline: c.timeline,
      points,
      priority: c.priority,
    });
  }

  steps.sort((a, b) => b.points - a.points);

  // Projected score = engine re-run with ALL applicable improvements together.
  let combined: ScoringInput = { ...app };
  for (const c of CANDIDATES) {
    if (c.applies(app)) combined = c.improve(combined);
  }
  const projectedScore = Math.round(computeScore(combined).arthsetu_score);

  return {
    currentScore,
    currentBand: getScoreBand(currentScore),
    projectedScore,
    projectedBand: getScoreBand(projectedScore),
    totalGain: Math.max(0, projectedScore - currentScore),
    steps,
  };
}
