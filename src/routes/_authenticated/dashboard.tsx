import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { ArrowRight, Clock, FileText, IndianRupee, Percent, Loader2, Download } from "lucide-react";
import { getMyApplications } from "@/lib/applications.functions";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { downloadApplicationReport, type ReportApplication } from "@/lib/report";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-success/15 text-success border-success/30" },
  override_approved: { label: "Approved (reviewed)", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Not approved", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  override_rejected: { label: "Not approved (reviewed)", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

function DashboardPage() {
  const { role, session } = useAuth();
  const fetchApps = useServerFn(getMyApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => fetchApps(),
    enabled: !!session,
  });

  const apps = data?.applications ?? [];
  const latest = apps[0];
  const decided = latest && latest.status !== "pending";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Your dashboard</h1>
          <p className="mt-1 text-muted-foreground">Track your ArthSetu credit assessment.</p>
        </div>
        {role !== "admin" && (
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/apply">
              New application <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !latest ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-border/60 bg-gradient-surface p-12 text-center"
        >
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">No applications yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Apply for your first ArthSetu score. We'll analyze your income, assets and digital
            footprint, then a bank officer reviews the result before it reaches you.
          </p>
          <Button asChild className="mt-6 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Link to="/apply">
              Apply for a score <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-gradient-surface p-8"
          >
            {decided ? (
              <ScoreGauge score={Number(latest.arthsetu_score)} band={latest.score_band ?? undefined} />
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <Clock className="h-12 w-12 text-warning" />
                <p className="mt-4 font-display text-lg font-semibold">Under review</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A bank officer is verifying your application. You'll get an email with your score
                  and decision shortly.
                </p>
              </div>
            )}
            <Badge variant="outline" className={`mt-5 ${statusMeta[latest.status]?.cls ?? ""}`}>
              {statusMeta[latest.status]?.label ?? latest.status}
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border/60 bg-gradient-surface p-8 lg:col-span-2"
          >
            <h2 className="font-display text-xl font-semibold">Latest application</h2>
            {decided ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Metric icon={IndianRupee} label="Recommended credit limit" value={`₹${inr(Number(latest.recommended_credit_limit ?? 0))}`} />
                <Metric icon={Percent} label="Indicative interest rate" value={`${latest.recommended_interest_rate ?? "—"}% p.a.`} />
                <Metric icon={FileText} label="Probability of default" value={`${((Number(latest.default_probability ?? 0)) * 100).toFixed(1)}%`} />
                <Metric icon={Clock} label="Reviewed" value={latest.reviewed_at ? new Date(latest.reviewed_at).toLocaleDateString() : "—"} />
              </div>
            ) : (
              <p className="mt-4 text-muted-foreground">
                Submitted on {new Date(latest.created_at).toLocaleDateString()}. Your detailed
                report unlocks after officer review.
              </p>
            )}

            {decided && Array.isArray(latest.recommendations) && latest.recommendations.length > 0 && (
              <div className="mt-7">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  How to improve
                </h3>
                <div className="mt-3 space-y-3">
                  {(latest.recommendations as { title: string; action: string }[]).slice(0, 4).map((r) => (
                    <div key={r.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
                      <p className="font-medium">{r.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{r.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {apps.length > 1 && (
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">History</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
            {apps.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between border-b border-border/40 bg-card/30 px-5 py-4 last:border-0"
              >
                <div>
                  <p className="font-medium">{new Date(a.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.status === "pending" ? "Awaiting review" : `Score ${Math.round(Number(a.arthsetu_score))}`}
                  </p>
                </div>
                <Badge variant="outline" className={statusMeta[a.status]?.cls ?? ""}>
                  {statusMeta[a.status]?.label ?? a.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
