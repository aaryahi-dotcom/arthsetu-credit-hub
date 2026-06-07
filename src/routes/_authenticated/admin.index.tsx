import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { Loader2, ShieldAlert, ArrowRight, AlertTriangle, BarChart3, Workflow } from "lucide-react";
import { getAdminStats, listApplications } from "@/lib/admin.functions";
import { detectAnomalies, fraudRisk, type RiskApplication } from "@/lib/risk";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminPage,
});

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Approved", cls: "bg-success/15 text-success border-success/30" },
  override_approved: { label: "Override ✓", cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  override_rejected: { label: "Override ✕", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const BAND_COLORS: Record<string, string> = {
  EXCELLENT: "oklch(0.74 0.15 165)",
  VERY_GOOD: "oklch(0.78 0.13 192)",
  GOOD: "oklch(0.62 0.16 235)",
  FAIR: "oklch(0.8 0.14 80)",
  POOR: "oklch(0.7 0.18 40)",
  VERY_POOR: "oklch(0.62 0.21 18)",
};

function AdminPage() {
  const { role, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, role, navigate]);

  const statsFn = useServerFn(getAdminStats);
  const listFn = useServerFn(listApplications);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
    enabled: !!session && role === "admin",
  });
  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => listFn(),
    enabled: !!session && role === "admin",
  });

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

  const apps = list?.applications ?? [];
  const cards = [
    { label: "Total applications", value: stats?.total_applications ?? 0 },
    { label: "Pending review", value: stats?.pending_count ?? 0 },
    { label: "Approval rate", value: stats?.approval_rate ?? 0, suffix: "%", decimals: 1 },
    { label: "Overrides applied", value: stats?.override_count ?? 0 },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Officer console</h1>
          <p className="mt-1 text-muted-foreground">
            Review applications, override AI decisions, and trigger applicant reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/workflow"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-card/70"
          >
            <Workflow className="h-4 w-4 text-primary" /> Approval automation
          </Link>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-card/70"
          >
            <BarChart3 className="h-4 w-4 text-primary" /> Risk &amp; fraud analytics
          </Link>
        </div>
      </div>

      {statsLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-gradient-surface p-6"
              >
                <div className="font-display text-3xl font-bold text-primary">
                  <AnimatedCounter value={c.value} suffix={c.suffix ?? ""} decimals={c.decimals ?? 0} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-surface p-6">
            <h2 className="font-display text-lg font-semibold">Score-band distribution</h2>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.distribution ?? []}>
                  <XAxis
                    dataKey="band"
                    tick={{ fill: "oklch(0.7 0.02 230)", fontSize: 11 }}
                    tickFormatter={(v) => v.replace("_", " ")}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: "oklch(0.7 0.02 230)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "oklch(0.78 0.13 192 / 0.08)" }}
                    contentStyle={{
                      background: "oklch(0.2 0.028 244)",
                      border: "1px solid oklch(0.3 0.03 244)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.006 220)",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(stats?.distribution ?? []).map((d) => (
                      <Cell key={d.band} fill={BAND_COLORS[d.band] ?? "oklch(0.78 0.13 192)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Applications</h2>
        {listLoading ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : apps.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
            <div className="hidden grid-cols-12 gap-2 border-b border-border/60 bg-card/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <span className="col-span-4">Applicant</span>
              <span className="col-span-2">Score</span>
              <span className="col-span-2">Band</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2 text-right">Action</span>
            </div>
            {apps.map((a) => {
              const flags = detectAnomalies(a as unknown as RiskApplication);
              const risk = fraudRisk(flags);
              return (
              <Link
                key={a.id}
                to="/admin/$id"
                params={{ id: a.id }}
                className="grid grid-cols-2 items-center gap-2 border-b border-border/40 bg-card/20 px-5 py-4 transition-colors last:border-0 hover:bg-card/50 sm:grid-cols-12"
              >
                <div className="col-span-4">
                  <p className="flex items-center gap-1.5 font-medium">
                    {a.full_name}
                    {flags.length > 0 && (
                      <span
                        title={`${flags.length} anomaly flag(s)`}
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                          risk === "elevated"
                            ? "border-destructive/30 bg-destructive/15 text-destructive"
                            : "border-warning/30 bg-warning/15 text-warning"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" /> {flags.length}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="col-span-2 font-display text-lg font-bold">
                  {Math.round(Number(a.arthsetu_score))}
                </span>
                <span className="col-span-2 text-sm text-muted-foreground">
                  {a.score_band?.replace("_", " ")}
                </span>
                <span className="col-span-2">
                  <Badge variant="outline" className={statusMeta[a.status]?.cls ?? ""}>
                    {statusMeta[a.status]?.label ?? a.status}
                  </Badge>
                </span>
                <span className="col-span-2 hidden items-center justify-end text-primary sm:flex">
                  Review <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
