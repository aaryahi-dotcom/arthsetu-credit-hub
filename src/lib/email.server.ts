// Server-only email helper. Sends the branded credit report through the
// Lovable transactional email pipeline. Until an email domain is verified +
// the transactional template is scaffolded, this safely no-ops (logs only),
// so the admin decision flow never breaks.
import { getRequest } from "@tanstack/react-start/server";

interface CreditReportArgs {
  to: string;
  fullName: string;
  applicationId: string;
  score: number;
  band: string;
  decision: string;
  creditLimit: number;
  interestRate: number;
  recommendations: { title: string; action: string }[];
  overrideApplied: boolean;
  customSubject?: string;
  customMessage?: string;
  includeFullReport?: boolean;
  report?: {
    defaultProbability: number;
    interestRate: number;
    annualIncome: number;
    monthlyIncome: number;
    netWorth: number;
    cibilScore: number;
    loanRequested: number;
    purpose: string;
  };
}

function getOrigin(): string | null {
  try {
    const req = getRequest();
    const url = req?.url ? new URL(req.url) : null;
    if (url) return url.origin;
    const host = req?.headers.get("x-forwarded-host") ?? req?.headers.get("host");
    const proto = req?.headers.get("x-forwarded-proto") ?? "https";
    return host ? `${proto}://${host}` : null;
  } catch {
    return null;
  }
}

export async function sendCreditReportEmail(args: CreditReportArgs): Promise<void> {
  const origin = getOrigin();
  const req = getRequest();
  const authHeader = req?.headers.get("authorization") ?? "";

  if (!origin) {
    console.warn("[email] No origin available; skipping credit report email.");
    return;
  }

  const payload = {
    templateName: "credit-report",
    recipientEmail: args.to,
    idempotencyKey: `credit-report-${args.applicationId}-${args.decision}-${Date.now()}`,
    templateData: {
      fullName: args.fullName,
      applicationId: args.applicationId,
      score: Math.round(args.score),
      band: args.band,
      decision: args.decision,
      creditLimit: args.creditLimit,
      interestRate: args.interestRate,
      recommendations: args.recommendations.slice(0, 4),
      overrideApplied: args.overrideApplied,
      customMessage: args.customMessage ?? null,
      includeFullReport: args.includeFullReport ?? true,
      report: args.report ?? null,
    },
    ...(args.customSubject ? { subject: args.customSubject } : {}),
  };

  const res = await fetch(`${origin}/lovable/email/transactional/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${text}`);
  }
}
