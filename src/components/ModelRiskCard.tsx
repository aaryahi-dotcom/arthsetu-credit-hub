import { motion } from "motion/react";
import { Database, TrendingUp, TrendingDown, Info } from "lucide-react";
import { predictDefault, GERMAN_MODEL } from "@/lib/germanModel";
import type { ScoringInput } from "@/lib/scoring";

/**
 * Explainable risk card driven by the model trained on the German Credit
 * dataset. Shows the model-calibrated probability of default plus the signed
 * reason codes (feature contributions) behind it.
 */
export function ModelRiskCard({ app, delay = 0 }: { app: ScoringInput; delay?: number }) {
  const pred = predictDefault(app);
  const pdPct = (pred.defaultProbability * 100).toFixed(1);

  const maxAbs = Math.max(0.0001, ...pred.contributions.map((c) => Math.abs(c.impact)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Database className="h-4 w-4 text-primary" /> Data-trained risk model
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Logistic regression · {GERMAN_MODEL.dataset} · cross-validated AUC{" "}
            {GERMAN_MODEL.cv_auc.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Model PD</p>
          <p className="font-display text-xl font-bold">{pdPct}%</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {pred.contributions.map((c) => {
          const positive = c.impact > 0; // raises default risk
          const widthPct = (Math.abs(c.impact) / maxAbs) * 100;
          return (
            <div key={c.feature} className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 text-muted-foreground">{c.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`absolute top-0 h-full rounded-full ${
                    positive ? "bg-destructive/70" : "bg-success/70"
                  }`}
                  style={{ width: `${Math.max(4, widthPct)}%` }}
                />
              </div>
              <span
                className={`flex w-16 shrink-0 items-center justify-end gap-1 font-medium ${
                  positive ? "text-destructive" : "text-success"
                }`}
              >
                {positive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {c.impact > 0 ? "+" : ""}
                {c.impact.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Each bar is a reason code: red raises default risk, green lowers it. Values are
        log-odds contributions, so the decision is fully traceable — not a black box.
      </p>
    </motion.div>
  );
}
