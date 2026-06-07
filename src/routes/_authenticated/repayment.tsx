import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileText,
  Wallet,
  PiggyBank,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { getMyApplications } from "@/lib/applications.functions";
import { buildRepaymentPlan, type RepaymentApplication } from "@/lib/repayment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/repayment")({
  component: RepaymentPage,
});

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

function RepaymentPage() {
  const { session } = useAuth();
  const fetchApps = useServerFn(getMyApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => fetchApps(),
    enabled: !!session,
  });

  const apps = data?.applications ?? [];
  const latest = apps.find((a) => a.status !== "pending") ?? apps[0];
  const decided = latest && latest.status !== "pending";

  if (isLoading) {
    return (
      <div className="mt-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!decided) {
    return (
      <div>
        <BackLink />
        <div className="mt-10 rounded-3xl border border-border/60 bg-gradient-surface p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">No repayment plan yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Smart repayment insights unlock once you have a reviewed application with a
            recommended credit limit.
          </p>
          <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/apply">
              Apply for a score <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const plan = buildRepaymentPlan(latest as unknown as RepaymentApplication);

  if (!plan.hasLoan) {
    return (
      <div>
        <BackLink />
        <div className="mt-10 rounded-3xl border border-border/60 bg-gradient-surface p-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">No recommended credit limit</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Your latest assessment didn't include a credit offer, so there's no repayment plan to
            simulate yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <div className="mt-4">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
          <Wallet className="h-7 w-7 text-primary" /> Smart repayment insights
        </h1>
        <p className="mt-1 text-muted-foreground">
          Based on your ₹{inr(plan.principal)} recommended limit at {plan.annualRate}% p.a. Every
          figure uses standard reducing-balance maths — fully transparent.
        </p>
      </div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat icon={Wallet} label="Loan principal" value={`₹${inr(plan.principal)}`} />
        <Stat icon={PiggyBank} label="Affordable EMI (FOIR ≤ 40%)" value={`₹${inr(plan.affordableEmi)}/mo`} />
        <Stat icon={CalendarClock} label="Recommended tenure" value={`${plan.recommendedMonths} months`} />
      </div>

      {/* Tenure scenarios */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-3xl border border-border/60 bg-gradient-surface p-6"
      >
        <h2 className="font-display text-lg font-semibold">Tenure options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shorter tenures cost less interest but need a bigger EMI. We recommend the shortest tenure
          you can comfortably afford.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-semibold">Tenure</th>
                <th className="py-2 pr-4 font-semibold">Monthly EMI</th>
                <th className="py-2 pr-4 font-semibold">Total interest</th>
                <th className="py-2 pr-4 font-semibold">Total paid</th>
                <th className="py-2 font-semibold">Fit</th>
              </tr>
            </thead>
            <tbody>
              {plan.scenarios.map((s) => (
                <tr
                  key={s.months}
                  className={`border-b border-border/30 last:border-0 ${
                    s.recommended ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="py-3 pr-4 font-medium">
                    {s.months} mo
                    {s.recommended && (
                      <Badge variant="outline" className="ml-2 border-primary/30 bg-primary/10 text-primary">
                        Recommended
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4">₹{inr(s.emi)}</td>
                  <td className="py-3 pr-4 text-destructive">₹{inr(s.totalInterest)}</td>
                  <td className="py-3 pr-4">₹{inr(s.totalPaid)}</td>
                  <td className="py-3">
                    {s.affordable ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" /> Affordable
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Above budget</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Prepayment */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 rounded-3xl border border-border/60 bg-gradient-surface p-6"
      >
        <h2 className="font-display text-lg font-semibold">Prepayment power</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paying a little extra each month on your {plan.recommendedMonths}-month plan clears the
          loan sooner and saves interest.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {plan.prepayments.map((p) => (
            <div key={p.extraPct} className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <p className="font-display text-2xl font-bold text-primary">+{p.extraPct}%</p>
              <p className="text-xs text-muted-foreground">extra on each EMI</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <p>
                  Saves <span className="font-semibold text-success">₹{inr(p.interestSaved)}</span> in
                  interest
                </p>
                <p>
                  Finishes <span className="font-semibold">{p.monthsSaved} months</span> early
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to dashboard
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-surface p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
