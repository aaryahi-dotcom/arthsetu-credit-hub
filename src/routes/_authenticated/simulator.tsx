import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, FileText, SlidersHorizontal, RotateCcw } from "lucide-react";
import { getMyApplications } from "@/lib/applications.functions";
import { computeScore, BAND_LABELS, type ScoringInput } from "@/lib/scoring";
import { predictDefault } from "@/lib/germanModel";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/simulator")({
  component: SimulatorPage,
});

const num = (v: unknown, f = 0) => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return v === null || v === undefined || Number.isNaN(n) ? f : n;
};

interface Knobs {
  monthly_net_income: number;
  total_emi_monthly: number;
  credit_utilization_pct: number;
  missed_payments_12m: number;
  loan_defaults_ever: number;
  cibil_score: number;
}

function SimulatorPage() {
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

  const base = latest as unknown as ScoringInput | undefined;

  const initial: Knobs | null = useMemo(
    () =>
      base
        ? {
            monthly_net_income: num(base.monthly_net_income),
            total_emi_monthly: num(base.total_emi_monthly),
            credit_utilization_pct: num(base.credit_utilization_pct, 50),
            missed_payments_12m: num(base.missed_payments_12m),
            loan_defaults_ever: num(base.loan_defaults_ever),
            cibil_score: num(base.cibil_score, 650),
          }
        : null,
    [base],
  );

  const [knobs, setKnobs] = useState<Knobs | null>(initial);
  useEffect(() => setKnobs(initial), [initial]);

  if (isLoading) {
    return (
      <div className="mt-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!decided || !base || !knobs || !initial) {
    return (
      <div>
        <BackLink />
        <div className="mt-10 rounded-3xl border border-border/60 bg-gradient-surface p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-display text-xl font-semibold">No profile to simulate</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            The credit simulator uses your reviewed application as a starting point. Apply first to
            unlock it.
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

  const simInput: ScoringInput = { ...base, ...knobs };
  const result = computeScore(simInput);
  const model = predictDefault(simInput);

  const baseResult = computeScore(base);
  const scoreDelta = Math.round(result.arthsetu_score - baseResult.arthsetu_score);

  const set = (k: keyof Knobs, v: number) => setKnobs((s) => (s ? { ...s, [k]: v } : s));
  const reset = () => setKnobs(initial);

  return (
    <div>
      <BackLink />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
            <SlidersHorizontal className="h-7 w-7 text-primary" /> Credit simulator
          </h1>
          <p className="mt-1 text-muted-foreground">
            Move the sliders to see how each change affects your score and default risk — recomputed
            live by the same engine, no black box.
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Result */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-3xl border border-border/60 bg-gradient-surface p-8"
        >
          <ScoreGauge score={result.arthsetu_score} band={result.score_band} />
          <p className="mt-4 text-sm text-muted-foreground">{BAND_LABELS[result.score_band]}</p>
          {scoreDelta !== 0 && (
            <p
              className={`mt-1 font-display text-lg font-bold ${
                scoreDelta > 0 ? "text-success" : "text-destructive"
              }`}
            >
              {scoreDelta > 0 ? "+" : ""}
              {scoreDelta} vs your current score
            </p>
          )}
          <div className="mt-6 grid w-full grid-cols-2 gap-3 text-center text-sm">
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <p className="text-muted-foreground">Engine PD</p>
              <p className="font-display text-lg font-bold">
                {(result.default_probability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <p className="text-muted-foreground">Model PD</p>
              <p className="font-display text-lg font-bold">
                {(model.defaultProbability * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Model PD comes from the logistic-regression model trained on the German Credit dataset.
          </p>
        </motion.div>

        {/* Sliders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 rounded-3xl border border-border/60 bg-gradient-surface p-6 lg:col-span-2"
        >
          <Knob
            label="Monthly net income"
            value={knobs.monthly_net_income}
            min={0}
            max={300000}
            step={1000}
            fmt={(v) => `₹${v.toLocaleString("en-IN")}`}
            onChange={(v) => set("monthly_net_income", v)}
          />
          <Knob
            label="Monthly EMIs"
            value={knobs.total_emi_monthly}
            min={0}
            max={150000}
            step={500}
            fmt={(v) => `₹${v.toLocaleString("en-IN")}`}
            onChange={(v) => set("total_emi_monthly", v)}
          />
          <Knob
            label="Credit utilisation"
            value={knobs.credit_utilization_pct}
            min={0}
            max={100}
            step={1}
            fmt={(v) => `${v}%`}
            onChange={(v) => set("credit_utilization_pct", v)}
          />
          <Knob
            label="CIBIL score"
            value={knobs.cibil_score}
            min={300}
            max={900}
            step={1}
            fmt={(v) => String(v)}
            onChange={(v) => set("cibil_score", v)}
          />
          <Knob
            label="Missed payments (12m)"
            value={knobs.missed_payments_12m}
            min={0}
            max={12}
            step={1}
            fmt={(v) => String(v)}
            onChange={(v) => set("missed_payments_12m", v)}
          />
          <Knob
            label="Past loan defaults"
            value={knobs.loan_defaults_ever}
            min={0}
            max={5}
            step={1}
            fmt={(v) => String(v)}
            onChange={(v) => set("loan_defaults_ever", v)}
          />
        </motion.div>
      </div>
    </div>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  fmt,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="font-display text-sm font-bold text-primary">{fmt(value)}</span>
      </div>
      <Slider
        className="mt-3"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
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
