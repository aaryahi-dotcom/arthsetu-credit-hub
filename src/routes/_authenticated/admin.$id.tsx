import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  ShieldAlert,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { getApplicationDetail, reviewApplication } from "@/lib/admin.functions";
import { ScoreGauge } from "@/components/ScoreGauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  component: AdminDetailPage,
});

const inr = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

const FIELD_GROUPS: { title: string; fields: [string, string][] }[] = [
  {
    title: "Income & employment",
    fields: [
      ["monthly_net_income", "Monthly net income"],
      ["annual_income", "Annual income"],
      ["employment_tenure_months", "Tenure (months)"],
      ["loan_amount_requested", "Loan requested"],
    ],
  },
  {
    title: "Assets & liabilities",
    fields: [
      ["bank_balance", "Bank balance"],
      ["fixed_deposits", "Fixed deposits"],
      ["property_value", "Property"],
      ["vehicle_value", "Vehicle"],
      ["gold_value", "Gold"],
      ["total_liabilities", "Liabilities"],
      ["net_worth", "Net worth"],
    ],
  },
  {
    title: "Credit behaviour",
    fields: [
      ["total_emi_monthly", "Monthly EMIs"],
      ["existing_loan_count", "Existing loans"],
      ["credit_utilization_pct", "Utilization %"],
      ["missed_payments_12m", "Missed (12m)"],
      ["loan_defaults_ever", "Defaults"],
      ["credit_enquiries_6m", "Enquiries (6m)"],
      ["cibil_score", "CIBIL"],
      ["tax_filing_years", "Tax years"],
      ["digital_footprint_score", "Digital score"],
    ],
  },
];

function AdminDetailPage() {
  const { id } = Route.useParams();
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detailFn = useServerFn(getApplicationDetail);
  const reviewFn = useServerFn(reviewApplication);

  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [newScore, setNewScore] = useState("");
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (!loading && role && role !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, role, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-application", id],
    queryFn: () => detailFn({ data: { id } }),
    enabled: role === "admin",
  });

  if (loading || (role && role !== "admin")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const app = data.application;
  const profile = data.profile;
  const decided = app.status !== "pending";

  const handleReview = async (decision: "approved" | "rejected") => {
    if (override && reason.trim().length < 5) {
      toast.error("Please give a reason (min 5 chars) for the override.");
      return;
    }
    setBusy(decision);
    try {
      const res = await reviewFn({
        data: {
          id,
          decision,
          override,
          reason: override ? reason : undefined,
          new_score: override && newScore ? Number(newScore) : undefined,
        },
      });
      toast.success(
        res.emailSent
          ? `Decision saved. Report emailed to the applicant.`
          : `Decision saved. (Email pending email-domain setup.)`,
      );
      qc.invalidateQueries({ queryKey: ["admin-application", id] });
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to console
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{app.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.email} · Submitted {new Date(app.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {app.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Score + decision */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-3xl border border-border/60 bg-gradient-surface p-8"
          >
            <ScoreGauge score={Number(app.arthsetu_score)} band={app.score_band ?? undefined} />
            <div className="mt-6 grid w-full grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-muted-foreground">Default prob.</p>
                <p className="font-display text-lg font-bold">
                  {(Number(app.default_probability) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-muted-foreground">Limit</p>
                <p className="font-display text-lg font-bold">
                  ₹{inr(Number(app.recommended_credit_limit ?? 0))}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Review panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
          >
            <h2 className="font-display text-lg font-semibold">Officer decision</h2>

            {decided && (
              <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                Already reviewed. Re-deciding will send a new report email.
              </div>
            )}
            {app.override_applied && app.override_reason && (
              <div className="mt-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-warning">
                  <AlertTriangle className="h-4 w-4" /> Override on record
                </p>
                <p className="mt-1 text-muted-foreground">{app.override_reason}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-3">
              <div>
                <p className="text-sm font-medium">Override the AI</p>
                <p className="text-xs text-muted-foreground">Adjust score / decision manually</p>
              </div>
              <Switch checked={override} onCheckedChange={setOverride} />
            </div>

            {override && (
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>New score (optional, 300–900)</Label>
                  <Input
                    type="number"
                    min={300}
                    max={900}
                    value={newScore}
                    onChange={(e) => setNewScore(e.target.value)}
                    placeholder={String(Math.round(Number(app.arthsetu_score)))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason for override (required)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you overriding the model's output?"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleReview("approved")}
                disabled={busy !== null}
                className="bg-success text-success-foreground hover:opacity-90"
              >
                {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Approve
              </Button>
              <Button
                onClick={() => handleReview("rejected")}
                disabled={busy !== null}
                variant="destructive"
              >
                {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </Button>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> An email report is sent to the applicant on decision.
            </p>
          </motion.div>
        </div>

        {/* Applicant data */}
        <div className="space-y-6 lg:col-span-2">
          {FIELD_GROUPS.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * gi }}
              className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
            >
              <h2 className="font-display text-lg font-semibold">{group.title}</h2>
              <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.fields.map(([key, label]) => {
                  const raw = (app as Record<string, unknown>)[key];
                  const isMoney = ["income", "balance", "deposits", "property", "vehicle", "gold", "liabilities", "worth", "emi", "requested"].some((m) =>
                    key.includes(m),
                  );
                  const val = Number(raw ?? 0);
                  return (
                    <div key={key} className="flex justify-between border-b border-border/30 pb-2 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">
                        {isMoney ? `₹${inr(val)}` : raw === null || raw === undefined ? "—" : String(raw)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {Array.isArray(app.recommendations) && app.recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
            >
              <h2 className="font-display text-lg font-semibold">AI recommendations</h2>
              <div className="mt-4 space-y-3">
                {(app.recommendations as { title: string; action: string }[]).map((r) => (
                  <div key={r.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
                    <p className="font-medium">{r.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.action}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
