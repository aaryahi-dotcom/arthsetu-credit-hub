// ArthSetu deterministic scoring engine — ported from the Python demo_predict.
// Pure, framework-agnostic so it can run on the server safely.

export const MODEL_VERSION = "2.0.0";

export interface ScoringInput {
  age?: number;
  monthly_net_income?: number;
  annual_income?: number;
  employment_tenure_months?: number;
  bank_balance?: number;
  fixed_deposits?: number;
  property_value?: number;
  vehicle_value?: number;
  gold_value?: number;
  total_liabilities?: number;
  total_emi_monthly?: number;
  existing_loan_count?: number;
  credit_utilization_pct?: number;
  missed_payments_12m?: number;
  loan_defaults_ever?: number;
  credit_enquiries_6m?: number;
  cibil_score?: number;
  tax_filing_years?: number;
  digital_footprint_score?: number;
  loan_amount_requested?: number;
}

export type ScoreBand =
  | "EXCELLENT"
  | "VERY_GOOD"
  | "GOOD"
  | "FAIR"
  | "POOR"
  | "VERY_POOR";

export interface Recommendation {
  title: string;
  action: string;
  timeline: string;
  potential_gain: number;
  category: string;
  priority: string;
}

export interface ScoringResult {
  arthsetu_score: number;
  score_band: ScoreBand;
  default_probability: number;
  recommended_credit_limit: number;
  recommended_interest_rate: number;
  net_worth: number;
  factors: Record<string, number>;
  recommendations: Recommendation[];
  model_version: string;
}

const n = (v: number | undefined, fallback = 0) =>
  v === undefined || v === null || Number.isNaN(v) ? fallback : v;

export function getScoreBand(score: number): ScoreBand {
  if (score >= 800) return "EXCELLENT";
  if (score >= 740) return "VERY_GOOD";
  if (score >= 670) return "GOOD";
  if (score >= 580) return "FAIR";
  if (score >= 500) return "POOR";
  return "VERY_POOR";
}

const SCORE_MULT: Record<ScoreBand, number> = {
  EXCELLENT: 1.0,
  VERY_GOOD: 0.85,
  GOOD: 0.7,
  FAIR: 0.5,
  POOR: 0.3,
  VERY_POOR: 0.0,
};

const SPREADS: Record<ScoreBand, number> = {
  EXCELLENT: 2.5,
  VERY_GOOD: 3.5,
  GOOD: 4.5,
  FAIR: 6.5,
  POOR: 9.0,
  VERY_POOR: 12.0,
};

function computeTerms(
  score: number,
  app: ScoringInput,
): { credit_limit: number; interest_rate: number } {
  const band = getScoreBand(score);
  const monthlyNet = n(app.monthly_net_income);
  const totalEmi = n(app.total_emi_monthly);
  const loanRequested = n(app.loan_amount_requested);
  const availableForEmi = Math.max(0, monthlyNet * 0.4 - totalEmi);
  const mult = SCORE_MULT[band];
  const baseLimit = availableForEmi * 24 * mult;
  let creditLimit = loanRequested
    ? Math.min(baseLimit, loanRequested * mult)
    : baseLimit;
  creditLimit = Math.max(0, Math.round(creditLimit / 1000) * 1000);
  const interestRate = 6.5 + SPREADS[band];
  return { credit_limit: creditLimit, interest_rate: Math.round(interestRate * 100) / 100 };
}

const REC_TEMPLATES: Record<string, Recommendation> = {
  missed_payments_12m: {
    title: "Improve Payment History",
    action: "Set up auto-debit for all EMIs and credit card dues.",
    timeline: "3-6 months",
    potential_gain: 50,
    category: "payment_behaviour",
    priority: "high",
  },
  credit_utilization_pct: {
    title: "Reduce Credit Utilization",
    action: "Keep credit card usage below 30% of your total limit.",
    timeline: "1-2 months",
    potential_gain: 40,
    category: "credit_management",
    priority: "high",
  },
  loan_defaults_ever: {
    title: "Resolve Past Defaults",
    action: "Contact lenders for settlement agreements on defaulted accounts.",
    timeline: "3-12 months",
    potential_gain: 60,
    category: "credit_history",
    priority: "critical",
  },
  emi_to_income_ratio: {
    title: "Reduce Debt Burden",
    action: "Pay off smaller loans to bring EMI-to-income below 35%.",
    timeline: "6-18 months",
    potential_gain: 45,
    category: "debt_management",
    priority: "high",
  },
  digital_footprint_score: {
    title: "Build Digital Financial Footprint",
    action: "Pay utility bills and rent digitally via UPI/NEFT consistently.",
    timeline: "3-6 months",
    potential_gain: 30,
    category: "alternate_data",
    priority: "medium",
  },
};

export function computeScore(app: ScoringInput): ScoringResult {
  let score = 600.0;
  const monthlyNet = n(app.monthly_net_income);
  const totalEmi = n(app.total_emi_monthly);
  const cibil = n(app.cibil_score);
  const missed = n(app.missed_payments_12m);
  const defaults = n(app.loan_defaults_ever);
  const utilization = n(app.credit_utilization_pct, 50);
  const enquiries = n(app.credit_enquiries_6m);
  const tenure = n(app.employment_tenure_months);
  const age = n(app.age, 30);
  const digital = n(app.digital_footprint_score, 50);
  const taxYears = n(app.tax_filing_years);

  const totalAssets =
    n(app.property_value) +
    n(app.vehicle_value) +
    n(app.bank_balance) +
    n(app.fixed_deposits) +
    n(app.gold_value);
  const netWorth = totalAssets - n(app.total_liabilities);

  if (cibil > 0) score = score * 0.4 + cibil * 0.6;
  score -= missed * 25;
  score -= defaults * 60;
  if (monthlyNet > 0) {
    const foir = totalEmi / monthlyNet;
    if (foir < 0.3) score += 30;
    else if (foir < 0.4) score += 10;
    else if (foir > 0.6) score -= 40;
  }
  if (utilization < 30) score += 25;
  else if (utilization > 70) score -= 30;
  score -= enquiries * 10;
  if (tenure >= 24) score += 20;
  else if (tenure >= 12) score += 10;
  if (age >= 25 && age <= 55) score += 10;
  if (netWorth > 500000) score += 20;
  else if (netWorth > 100000) score += 10;
  score += (digital - 50) * 0.3;
  score += taxYears * 5;

  score = Math.max(300, Math.min(900, score));
  const defaultProb = (900 - score) / 600;
  const band = getScoreBand(score);
  const { credit_limit, interest_rate } = computeTerms(score, app);

  const factors: Record<string, number> = {
    cibil_score: cibil > 700 ? 0.3 : -0.2,
    missed_payments_12m: -0.15 * missed,
    credit_utilization_pct: utilization > 50 ? -0.1 : 0.1,
    employment_tenure_months: 0.08 * Math.min(tenure / 24, 1),
    net_worth: 0.05 * Math.min(netWorth / 1000000, 1),
    digital_footprint_score: 0.06 * ((digital - 50) / 50),
  };

  const recommendations: Recommendation[] = [];
  Object.entries(factors)
    .sort((a, b) => a[1] - b[1])
    .forEach(([feat, impact]) => {
      if (impact >= 0) return;
      const rec = REC_TEMPLATES[feat];
      if (rec && !recommendations.find((r) => r.title === rec.title)) {
        recommendations.push(rec);
      }
    });
  if (score < 580) {
    recommendations.push({
      title: "Start with a Secured Credit Card",
      action: "Apply for a secured credit card against a fixed deposit.",
      timeline: "6-12 months",
      potential_gain: 40,
      category: "credit_building",
      priority: "high",
    });
  }

  return {
    arthsetu_score: Math.round(score * 10) / 10,
    score_band: band,
    default_probability: Math.round(defaultProb * 10000) / 10000,
    recommended_credit_limit: credit_limit,
    recommended_interest_rate: interest_rate,
    net_worth: netWorth,
    factors,
    recommendations: recommendations.slice(0, 8),
    model_version: `${MODEL_VERSION}-deterministic`,
  };
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  EXCELLENT: "Excellent",
  VERY_GOOD: "Very Good",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  VERY_POOR: "Very Poor",
};
