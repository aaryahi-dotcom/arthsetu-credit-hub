// Smart repayment insights — deterministic amortisation maths.
// Pure and explainable: standard reducing-balance EMI formulas, no black box.

import type { ScoringInput } from "./scoring";

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return v === null || v === undefined || Number.isNaN(n) ? fallback : n;
};

export interface RepaymentApplication extends ScoringInput {
  recommended_credit_limit?: number | string | null;
  recommended_interest_rate?: number | string | null;
}

/** Monthly EMI for a reducing-balance loan. */
export function emiFor(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

/** Months needed to repay a principal at a given EMI (for prepayment maths). */
function monthsForEmi(principal: number, annualRatePct: number, emi: number): number {
  const r = annualRatePct / 12 / 100;
  if (r === 0) return Math.ceil(principal / emi);
  const minEmi = principal * r;
  if (emi <= minEmi) return Infinity; // EMI doesn't even cover interest
  const n = Math.log(emi / (emi - principal * r)) / Math.log(1 + r);
  return Math.ceil(n);
}

export interface TenureScenario {
  months: number;
  emi: number;
  totalInterest: number;
  totalPaid: number;
  affordable: boolean;
  recommended: boolean;
}

export interface PrepaymentScenario {
  extraPct: number; // % extra paid on top of the recommended EMI
  newMonths: number;
  monthsSaved: number;
  interestSaved: number;
}

export interface RepaymentPlan {
  principal: number;
  annualRate: number;
  affordableEmi: number; // max EMI that keeps FOIR ≤ 40%
  scenarios: TenureScenario[];
  recommendedMonths: number;
  prepayments: PrepaymentScenario[];
  hasLoan: boolean;
}

const TENURES = [12, 24, 36, 48, 60];

export function buildRepaymentPlan(app: RepaymentApplication): RepaymentPlan {
  const principal = num(app.recommended_credit_limit);
  const annualRate = num(app.recommended_interest_rate, 12);
  const monthly = num(app.monthly_net_income);
  const existingEmi = num(app.total_emi_monthly);

  // Disposable EMI room: keep total obligations within 40% of net income.
  const affordableEmi = Math.max(0, monthly * 0.4 - existingEmi);

  const scenarios: TenureScenario[] = TENURES.map((months) => {
    const emi = emiFor(principal, annualRate, months);
    const totalPaid = emi * months;
    return {
      months,
      emi: Math.round(emi),
      totalInterest: Math.round(totalPaid - principal),
      totalPaid: Math.round(totalPaid),
      affordable: affordableEmi <= 0 ? true : emi <= affordableEmi,
      recommended: false,
    };
  });

  // Recommend the shortest affordable tenure (least interest while staying within FOIR).
  let recommended = scenarios.find((s) => s.affordable);
  if (!recommended) recommended = scenarios[scenarios.length - 1]; // longest if nothing fits
  recommended.recommended = true;
  const recommendedMonths = recommended.months;
  const baseInterest = recommended.totalInterest;

  // Prepayment: paying extra each month shortens the loan and cuts interest.
  const prepayments: PrepaymentScenario[] = [5, 10, 20].map((extraPct) => {
    const boostedEmi = recommended!.emi * (1 + extraPct / 100);
    const newMonths = monthsForEmi(principal, annualRate, boostedEmi);
    const newInterest = Number.isFinite(newMonths)
      ? boostedEmi * newMonths - principal
      : baseInterest;
    return {
      extraPct,
      newMonths: Number.isFinite(newMonths) ? newMonths : recommendedMonths,
      monthsSaved: Number.isFinite(newMonths) ? Math.max(0, recommendedMonths - newMonths) : 0,
      interestSaved: Math.max(0, Math.round(baseInterest - newInterest)),
    };
  });

  return {
    principal,
    annualRate,
    affordableEmi: Math.round(affordableEmi),
    scenarios,
    recommendedMonths,
    prepayments,
    hasLoan: principal > 0,
  };
}
