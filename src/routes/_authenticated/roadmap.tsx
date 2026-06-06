import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  TrendingUp,
  Target,
  FileText,
  Sparkles,
} from "lucide-react";
import { getMyApplications } from "@/lib/applications.functions";
import { buildRoadmap, type RiskApplication } from "@/lib/risk";
import { BAND_LABELS } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/roadmap")({
  component: RoadmapPage,
});

const priorityCls: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-primary/15 text-primary border-primary/30",
};

function RoadmapPage() {
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
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <div className="mt-10 rounded-3xl border border-border/60 bg-gradient-surface p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">No roadmap yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Your personalised credit-improvement roadmap unlocks once you have a reviewed
            application.
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

  const roadmap = buildRoadmap(latest as unknown as RiskApplication);
  const span = Math.max(1, 900 - 300);
  const currentPct = ((roadmap.currentScore - 300) / span) * 100;
  const projectedPct = ((roadmap.projectedScore - 300) / span) * 100;

  return (
    <div>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="mt-4">
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
          <Sparkles className="h-7 w-7 text-primary" /> Credit improvement roadmap
        </h1>
        <p className="mt-1 text-muted-foreground">
          Explainable, step-by-step actions. Each projected gain is calculated by re-running the
          ArthSetu engine with that change applied — no black box.
        </p>
      </div>

      {/* Projection card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-3xl border border-border/60 bg-gradient-surface p-8"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Current score</p>
            <p className="font-display text-4xl font-bold">{roadmap.currentScore}</p>
            <p className="text-sm text-muted-foreground">{BAND_LABELS[roadmap.currentBand]}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <TrendingUp className="h-7 w-7 text-success" />
            <p className="mt-1 font-display text-2xl font-bold text-success">
              +{roadmap.totalGain}
            </p>
            <p className="text-xs text-muted-foreground">potential gain</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">Projected score</p>
            <p className="font-display text-4xl font-bold text-primary">{roadmap.projectedScore}</p>
            <p className="text-sm text-muted-foreground">{BAND_LABELS[roadmap.projectedBand]}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-card">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary"
              style={{ width: `${Math.min(100, currentPct)}%` }}
            />
            <div
              className="absolute inset-y-0 rounded-full bg-success/40"
              style={{
                left: `${Math.min(100, currentPct)}%`,
                width: `${Math.max(0, Math.min(100, projectedPct) - currentPct)}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>300</span>
            <span>900</span>
          </div>
        </div>
      </motion.div>

      {/* Steps */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold">Your action plan</h2>
        {roadmap.steps.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-6 text-success">
            <Target className="h-6 w-6" />
            <p className="mt-2 font-semibold">You're in great shape!</p>
            <p className="mt-1 text-sm">
              We couldn't find any high-impact improvements right now. Keep paying on time and
              maintaining low utilisation to hold your score.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {roadmap.steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-gradient-surface p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary ring-1 ring-primary/20">
                      {i + 1}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        <Badge variant="outline" className={`capitalize ${priorityCls[step.priority]}`}>
                          {step.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{step.why}</p>
                      <p className="mt-2 text-sm">{step.action}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        Typical timeline: {step.timeline}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-bold text-success">+{step.points}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
                <Progress value={Math.min(100, (step.points / Math.max(1, roadmap.totalGain)) * 100)} className="mt-4 h-1.5" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
