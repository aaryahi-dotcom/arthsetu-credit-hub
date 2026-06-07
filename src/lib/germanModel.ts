// Real, data-trained credit-risk model.
//
// This is a logistic-regression probability-of-default model trained on the
// UCI Statlog "German Credit" dataset (1,000 labelled loans). Training was done
// offline with scikit-learn; only the learned coefficients are shipped here, so
// scoring stays pure, fast and fully explainable (every output traces back to a
// feature × weight contribution). 5-fold cross-validated ROC-AUC: 0.77.
//
// Because logistic regression is linear in log-odds, each feature's signed
// contribution (coef × standardised value) is a transparent reason code — the
// opposite of a black-box model.

import type { ScoringInput } from "./scoring";

export const GERMAN_MODEL = {
  dataset: "UCI Statlog German Credit (1,000 loans)",
  algorithm: "Logistic Regression (class-balanced)",
  cv_auc: 0.7745,
  n: 1000,
  feature_names: [
    "credit_history_quality",
    "liquidity",
    "savings",
    "emp_years",
    "installment_rate",
    "loan_amount_log",
    "duration_months",
    "age",
    "existing_loans",
  ] as const,
  mean: [1.585, 1.577, 0.6475, 4.164, 2.973, 7.789243689091287, 20.903, 35.546, 1.407],
  std: [
    1.0033817817760038, 1.2570087509639636, 0.882889432488572, 3.7027157600874725,
    1.1181551770662197, 0.7756862398173346, 12.05278353742406, 11.36977941738536,
    0.5773655687690415,
  ],
  coef: [
    -0.47921270488699563, -0.7256430874208353, -0.29026361045550103,
    -0.17245493121727642, 0.22009758011418046, 0.08612236380861908,
    0.3899192184683515, -0.10423637751634066, 0.20074623022615773,
  ],
  intercept: -0.25042132370761955,
};

const FEATURE_LABELS: Record<string, string> = {
  credit_history_quality: "Credit history quality",
  liquidity: "Account liquidity",
  savings: "Savings buffer",
  emp_years: "Employment stability",
  installment_rate: "Repayment burden",
  loan_amount_log: "Loan size",
  duration_months: "Loan duration",
  age: "Age",
  existing_loans: "Existing loans",
};

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return v === null || v === undefined || Number.isNaN(n) ? fallback : n;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Translate an ArthSetu application into the same feature space the model was
 * trained on. App values (INR, CIBIL, etc.) are mapped onto the dataset's
 * ordinal / scaled ranges so the trained weights stay valid.
 */
function mapFeatures(app: ScoringInput): number[] {
  const monthly = num(app.monthly_net_income);
  const annual = num(app.annual_income, monthly * 12);
  const loan = num(app.loan_amount_requested);
  const emi = num(app.total_emi_monthly);
  const cibil = num(app.cibil_score);
  const defaults = num(app.loan_defaults_ever);
  const missed = num(app.missed_payments_12m);

  // 1. Credit-history quality (0–3): bureau score adjusted by adverse events.
  let hist: number;
  if (cibil >= 750) hist = 3;
  else if (cibil >= 700) hist = 2.5;
  else if (cibil >= 650) hist = 2;
  else if (cibil >= 580) hist = 1;
  else if (cibil > 0) hist = 0.5;
  else hist = 1; // unknown bureau → neutral
  hist = clamp(hist - defaults * 1.5 - missed * 0.3, 0, 3);

  // 2. Liquidity (0–3): bank balance relative to monthly income.
  const liqRatio = monthly > 0 ? num(app.bank_balance) / monthly : num(app.bank_balance) / 50000;
  const liquidity = liqRatio >= 3 ? 3 : liqRatio >= 2 ? 2 : liqRatio >= 1 ? 1.5 : liqRatio >= 0.5 ? 1 : 0;

  // 3. Savings (0–3): fixed deposits.
  const fd = num(app.fixed_deposits);
  const savings = fd >= 500000 ? 3 : fd >= 200000 ? 2 : fd >= 50000 ? 1.5 : fd > 0 ? 1 : 0;

  // 4. Employment stability (years).
  const empYears = num(app.employment_tenure_months) / 12;

  // 5. Repayment burden / installment rate (1–4) from FOIR.
  const foir = monthly > 0 ? emi / monthly : 0;
  const installment = foir >= 0.5 ? 4 : foir >= 0.35 ? 3 : foir >= 0.2 ? 2 : 1;

  // 6. Loan size mapped onto the dataset's amount range, then log1p.
  const relSize = clamp(loan / Math.max(annual * 0.8, 1), 0, 1);
  const syntheticAmount = 250 + relSize * 17750;
  const loanAmountLog = Math.log1p(syntheticAmount);

  // 7. Loan duration (months) approximated from loan vs repayment capacity.
  const duration = monthly > 0 && loan > 0 ? clamp(loan / (monthly * 0.3), 6, 72) : 24;

  // 8. Age.
  const age = num(app.age, 30);

  // 9. Existing loans (dataset minimum is 1).
  const existing = Math.max(1, num(app.existing_loan_count, 1));

  return [hist, liquidity, savings, empYears, installment, loanAmountLog, duration, age, existing];
}

export interface ModelContribution {
  feature: string;
  label: string;
  impact: number; // signed log-odds contribution (+ raises default risk)
}

export interface ModelPrediction {
  defaultProbability: number; // 0–1, model-calibrated PD
  contributions: ModelContribution[]; // sorted by absolute impact
  topRiskDrivers: ModelContribution[]; // positive (risk-increasing)
  topStrengths: ModelContribution[]; // negative (risk-reducing)
}

/**
 * Run the trained model on an application and return an explainable PD.
 */
export function predictDefault(app: ScoringInput): ModelPrediction {
  const x = mapFeatures(app);
  const { mean, std, coef, intercept, feature_names } = GERMAN_MODEL;

  let logit = intercept;
  const contributions: ModelContribution[] = [];
  for (let i = 0; i < coef.length; i++) {
    const z = std[i] !== 0 ? (x[i] - mean[i]) / std[i] : 0;
    const impact = coef[i] * z;
    logit += impact;
    contributions.push({
      feature: feature_names[i],
      label: FEATURE_LABELS[feature_names[i]] ?? feature_names[i],
      impact,
    });
  }

  const pd = 1 / (1 + Math.exp(-logit));
  contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    defaultProbability: Math.round(pd * 10000) / 10000,
    contributions,
    topRiskDrivers: contributions.filter((c) => c.impact > 0.02).slice(0, 4),
    topStrengths: contributions.filter((c) => c.impact < -0.02).slice(0, 4),
  };
}
