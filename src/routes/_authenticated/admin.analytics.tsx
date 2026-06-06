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
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { listApplications } from "@/lib/admin.functions";
import {
  computePortfolioRisk,
  detectAnomalies,
  fraudRisk,
  type RiskApplication,
} from "@/lib/risk";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AnalyticsPage,
});

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

const BAND_COLORS: Record<string, string> = {
  EXCELLENT: "oklch(0.74 0.15 165)",
  VERY_GOOD: "oklch(0.78 0.13 192)",
  GOOD: "oklch(0.62 0.16 235)",
  FAIR: "oklch(0.8 0.14 80)",
  POOR: "oklch(0.7 0.18 40)",
  VERY_POOR: "oklch(0.62 0.21 18)",
};

const riskMeta: Record<string, { label: string; cls: string }> = {
  elevated: { label: "Elevated", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  review: { label: "Review", cls: "bg-warning/15 text-warning border-warning/30" },
  clear: { label: "Clear", cls: "bg-success/15 text-success border-success/30" },
};

function AnalyticsPage() {
  const { role, loading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, role, navigate]);

  const listFn = useServerFn(listApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => listFn(),
    enabled: !!session && role === "admin",
  });

  if (loading || role !== "admin") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        {role && role !== "admin" ? (
          <ShieldAlert className="h-10 w-10 text-warning" />
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const apps = (data?.applications ?? []) as unknown as RiskApplication[];
  const risk = computePortfolioRisk(apps);

  // Flagged applications, most severe first.
  const flagged = apps
    .map((a) => ({ app: a, flags: detectAnomalies(a) }))
    .filter((x) => x.flags.length > 0)
    .map((x) => ({ ...x, risk: fraudRisk(x.flags) }))
    .sort((a, b) => {
      const order = { elevated: 0, review: 1, clear: 2 };
      return order[a.risk] - order[b.risk] || b.flags.length - a.flags.length;
    });

  const cards = [
    { label: "Total exposure", value: risk.exposure, prefix: "₹" },
    { label: "Expected loss", value: Math.round(risk.expectedLoss), prefix: "₹" },
    { label: "Weighted default prob.", value: risk.weightedDefaultProb * 100, suffix: "%", decimals: 1 },
    { label: "Avg. FOIR", value: risk.avgFoir * 100, suffix: "%", decimals: 0 },
  ];

  return (
    <div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to console
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Risk &amp; fraud analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Portfolio-level exposure, concentration and rule-based anomaly detection.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Risk KPIs */}
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
                  <AnimatedCounter
                    value={c.value}
                    prefix={c.prefix ?? ""}
                    suffix={c.suffix ?? ""}
                    decimals={c.decimals ?? 0}
                  />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Secondary risk tiles */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <RiskTile
              icon={TrendingDown}
              tone="warning"
              value={risk.highRiskCount}
              label="High-risk applicants"
              hint="Poor band or default probability over 40%"
            />
            <RiskTile
              icon={AlertTriangle}
              tone="destructive"
              value={risk.elevatedCount}
              label="Elevated fraud flags"
              hint="At least one high-severity anomaly"
            />
            <RiskTile
              icon={ShieldCheck}
              tone="primary"
              value={risk.flaggedCount}
              label="Applications needing review"
              hint="One or more consistency checks failed"
            />
          </div>

          {/* Exposure by band */}
          <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-surface p-6">
            <h2 className="font-display text-lg font-semibold">Exposure concentration by band</h2>
            <p className="text-sm text-muted-foreground">
              Approved credit limit grouped by score band — watch concentration in weaker bands.
            </p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={risk.bandExposure}>
                  <XAxis
                    dataKey="band"
                    tick={{ fill: "oklch(0.7 0.02 230)", fontSize: 11 }}
                    tickFormatter={(v) => v.replace("_", " ")}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.7 0.02 230)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${inr(Number(v))}`}
                    width={70}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.78 0.13 192 / 0.08)" }}
                    formatter={(v: number) => [`₹${inr(Number(v))}`, "Exposure"]}
                    contentStyle={{
                      background: "oklch(0.2 0.028 244)",
                      border: "1px solid oklch(0.3 0.03 244)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.006 220)",
                    }}
                  />
                  <Bar dataKey="exposure" radius={[6, 6, 0, 0]}>
                    {risk.bandExposure.map((d) => (
                      <Cell key={d.band} fill={BAND_COLORS[d.band] ?? "oklch(0.78 0.13 192)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top exposures */}
          {risk.topExposures.length > 0 && (
            <div className="mt-6 rounded-2xl border border-border/60 bg-gradient-surface p-6">
              <h2 className="font-display text-lg font-semibold">Largest single exposures</h2>
              <div className="mt-4 space-y-2">
                {risk.topExposures.map((t) => (
                  <Link
                    key={t.id}
                    to="/admin/$id"
                    params={{ id: t.id }}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-card/30 px-4 py-3 transition-colors hover:bg-card/60"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        PD {(t.defaultProb * 100).toFixed(1)}%
                      </span>
                      <span className="font-display font-bold">₹{inr(t.exposure)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Fraud & anomaly detection */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Fraud &amp; anomaly detection</h2>
            <p className="text-sm text-muted-foreground">
              Deterministic consistency checks. Every flag explains exactly which values disagree.
            </p>
            {flagged.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-6 text-success">
                <ShieldCheck className="h-6 w-6" />
                <p className="mt-2 font-semibold">No anomalies detected</p>
                <p className="mt-1 text-sm">All applications pass the consistency checks.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {flagged.map(({ app, flags, risk: r }, i) => (
                  <motion.div
                    key={String(app.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border border-border/60 bg-gradient-surface p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{app.full_name}</span>
                        <Badge variant="outline" className={riskMeta[r].cls}>
                          {riskMeta[r].label}
                        </Badge>
                      </div>
                      <Link
                        to="/admin/$id"
                        params={{ id: String(app.id) }}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        Review <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {flags.map((f) => (
                        <li
                          key={f.code}
                          className="flex items-start gap-2 rounded-xl border border-border/40 bg-card/30 p-3 text-sm"
                        >
                          <AlertTriangle
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              f.severity === "high"
                                ? "text-destructive"
                                : f.severity === "medium"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }`}
                          />
                          <span>
                            <span className="font-medium">{f.label}.</span>{" "}
                            <span className="text-muted-foreground">{f.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RiskTile({
  icon: Icon,
  tone,
  value,
  label,
  hint,
}: {
  icon: React.ElementType;
  tone: "warning" | "destructive" | "primary";
  value: number;
  label: string;
  hint: string;
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-surface p-5">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${toneCls}`} />
        <span className={`font-display text-2xl font-bold ${toneCls}`}>{value}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
