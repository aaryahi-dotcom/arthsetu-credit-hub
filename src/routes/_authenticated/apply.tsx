import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Loader2, ArrowRight } from "lucide-react";
import { submitApplication } from "@/lib/applications.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/apply")({
  component: ApplyPage,
});

const OCCUPATIONS = [
  "salaried",
  "self_employed",
  "business",
  "freelancer",
  "gig_worker",
  "farmer",
  "retired",
  "student",
];

interface FieldDef {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}

const sections: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Income & employment",
    fields: [
      { name: "monthly_net_income", label: "Monthly net income (₹)", type: "number", placeholder: "45000" },
      { name: "annual_income", label: "Annual income (₹)", type: "number", placeholder: "540000" },
      { name: "employment_tenure_months", label: "Employment / business tenure (months)", type: "number", placeholder: "36" },
      { name: "loan_amount_requested", label: "Loan amount requested (₹)", type: "number", placeholder: "200000" },
    ],
  },
  {
    title: "Assets & liabilities",
    fields: [
      { name: "bank_balance", label: "Bank balance (₹)", type: "number", placeholder: "80000" },
      { name: "fixed_deposits", label: "Fixed deposits (₹)", type: "number", placeholder: "100000" },
      { name: "property_value", label: "Property value (₹)", type: "number", placeholder: "0" },
      { name: "vehicle_value", label: "Vehicle value (₹)", type: "number", placeholder: "0" },
      { name: "gold_value", label: "Gold value (₹)", type: "number", placeholder: "0" },
      { name: "total_liabilities", label: "Total liabilities (₹)", type: "number", placeholder: "50000" },
    ],
  },
  {
    title: "Credit behaviour",
    fields: [
      { name: "total_emi_monthly", label: "Total EMIs / month (₹)", type: "number", placeholder: "8000" },
      { name: "existing_loan_count", label: "Existing loans", type: "number", placeholder: "1" },
      { name: "credit_utilization_pct", label: "Credit utilization (%)", type: "number", placeholder: "35", max: 100 },
      { name: "missed_payments_12m", label: "Missed payments (12m)", type: "number", placeholder: "0" },
      { name: "loan_defaults_ever", label: "Loan defaults (ever)", type: "number", placeholder: "0" },
      { name: "credit_enquiries_6m", label: "Credit enquiries (6m)", type: "number", placeholder: "1" },
      { name: "cibil_score", label: "CIBIL score (if known)", type: "number", placeholder: "300–900", max: 900 },
    ],
  },
  {
    title: "Alternate data",
    fields: [
      { name: "tax_filing_years", label: "Years of tax filing", type: "number", placeholder: "2" },
      { name: "digital_footprint_score", label: "Digital / UPI activity score (0–100)", type: "number", placeholder: "70", max: 100 },
    ],
  },
];

const allFieldNames = sections.flatMap((s) => s.fields.map((f) => f.name));

function ApplyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const submit = useServerFn(submitApplication);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    full_name: "",
    age: "",
    occupation_type: "",
  });

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Record<string, string | number> = {
        full_name: values.full_name,
        age: Number(values.age || 0),
        occupation_type: values.occupation_type,
        purpose_of_credit: values.purpose_of_credit ?? "",
      };
      for (const name of allFieldNames) {
        payload[name] = Number(values[name] || 0);
      }
      const res = await submit({ data: payload as never });
      toast.success("Application submitted! It's now pending bank-officer review.");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      navigate({ to: "/dashboard" });
      void res;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Apply for a credit score</h1>
      <p className="mt-1 text-muted-foreground">
        Your answers feed the ArthSetu engine. No gender, religion, caste or marital status is ever
        collected or used.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
        >
          <h2 className="font-display text-lg font-semibold">About you</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={values.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="As per PAN"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                type="number"
                value={values.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="32"
                min={18}
                max={80}
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Occupation type</Label>
              <Select value={values.occupation_type} onValueChange={(v) => set("occupation_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select occupation" />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {sections.map((section, si) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (si + 1) }}
            className="rounded-3xl border border-border/60 bg-gradient-surface p-6"
          >
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type ?? "text"}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    min={f.min ?? 0}
                    max={f.max}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <Button
          type="submit"
          disabled={submitting || !user}
          size="lg"
          className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Submit application
        </Button>
      </form>
    </div>
  );
}
