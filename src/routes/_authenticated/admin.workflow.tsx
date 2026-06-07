import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Workflow,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { listApplications } from "@/lib/admin.functions";
import { evaluateWorkflow, DEFAULT_POLICY, ACTION_META, type WorkflowAction } from "@/lib/workflow";
import type { RiskApplication } from "@/lib/risk";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/workflow")({
  component: WorkflowPage,
});

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function WorkflowPage() {
  const { role, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, role, navigate]);

  const listFn = useServerFn(listApplications);
  const { data: list, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => listFn(),
    enabled: !!session && role === "admin",
  });

  const apps = useMemo(() => list?.applications ?? [], [list]);

  const evaluated = useMemo(
    () =>
      apps
        .filter((a) => a.status === "pending")
        .map((a) => ({ app: a, result: evaluateWorkflow(a as unknown as RiskApplication) })),
    [apps],
  );

  const counts = useMemo(() => {
    const c: Record<WorkflowAction, number> = {
      auto_approve: 0,
      auto_reject: 0,
      manual_review: 0,
    };
    evaluated.forEach((e) => (c[e.result.action] += 1));
    return c;
  }, [evaluated]);

  if (loading || role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        {role && role !== "admin" ? (
          <div className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
            <p className="mt-3 text-muted-foreground">Administrator access required.</p>
          </div>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to console
      </Link>

      <div className="mt-4">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
          <Workflow className="h-7 w-7 text-primary" /> Approval-workflow automation
        </h1>
        <p className="mt-1 text-muted-foreground">
          A transparent rule engine pre-sorts pending applications. Every recommendation lists the
          exact rules that fired — you keep the final decision.
        </p>
      </div>

      {/* Policy card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-3xl border border-border/60 bg-gradient-surface p-6"
      >
        <h2 className="font-display text-lg font-semibold">Active policy</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <PolicyCol
            tone="success"
            title="Auto-approve when ALL hold"
            items={[
              `Band: ${DEFAULT_POLICY.approveBands.map((b) => b.replace("_", " ").toLowerCase()).join(" / ")}`,
              `Default prob. ≤ ${pct(DEFAULT_POLICY.approveMaxPd)}`,
              `Repayment burden (FOIR) ≤ ${pct(DEFAULT_POLICY.approveMaxFoir)}`,
              "No anomaly flags",
            ]}
          />
          <PolicyCol
            tone="destructive"
            title="Auto-reject when ANY holds"
            items={[
              `Band: ${DEFAULT_POLICY.rejectBands.map((b) => b.replace("_", " ").toLowerCase()).join(" / ")}`,
              `Default prob. ≥ ${pct(DEFAULT_POLICY.rejectMinPd)}`,
            ]}
          />
          <PolicyCol
            tone="warning"
            title="Always manual review"
            items={[
              "Any high-severity fraud flag",
              "Anything that is neither auto-approve nor auto-reject",
            ]}
          />
        </div>
      </motion.div>

      {/* Counts */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <CountCard icon={CheckCircle2} tone="success" label="Recommended approve" value={counts.auto_approve} />
        <CountCard icon={XCircle} tone="destructive" label="Recommended reject" value={counts.auto_reject} />
        <CountCard icon={Eye} tone="warning" label="Needs manual review" value={counts.manual_review} />
      </div>

      {/* Queue */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Pending queue</h2>
        {isLoading ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : evaluated.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No pending applications to triage. 🎉</p>
        ) : (
          <div className="mt-4 space-y-3">
            {evaluated.map(({ app, result }, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border/60 bg-gradient-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{app.full_name}</p>
                      <Badge variant="outline" className={ACTION_META[result.action].cls}>
                        {ACTION_META[result.action].label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Score {Math.round(Number(app.arthsetu_score))} ·{" "}
                      {result.band.replace("_", " ").toLowerCase()} · PD {pct(result.pd)} · FOIR{" "}
                      {pct(result.foir)}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {result.reasons.map((r) => (
                        <li key={r} className="flex items-start gap-1.5">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to="/admin/$id"
                    params={{ id: app.id }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-card/70"
                  >
                    Review &amp; decide <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const toneCls: Record<string, string> = {
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
};

function PolicyCol({ tone, title, items }: { tone: string; title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
      <p className={`text-sm font-semibold ${toneCls[tone]}`}>{title}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-1.5">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneCls[tone]} bg-current`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ElementType;
  tone: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-surface p-6">
      <div className={`flex items-center gap-2 ${toneCls[tone]}`}>
        <Icon className="h-5 w-5" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}
