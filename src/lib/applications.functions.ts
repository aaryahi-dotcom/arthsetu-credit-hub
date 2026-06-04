import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { computeScore, type ScoringInput } from "./scoring";
import { dbError } from "./safe-error";

const num = (max = 1_000_000_000) => z.coerce.number().min(0).max(max);

const applicationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(18).max(80),
  occupation_type: z.string().trim().min(1).max(40),
  purpose_of_credit: z.string().trim().max(120).optional().default(""),
  loan_amount_requested: num(),
  monthly_net_income: num(),
  annual_income: num(),
  employment_tenure_months: z.coerce.number().int().min(0).max(720),
  bank_balance: num(),
  fixed_deposits: num(),
  property_value: num(),
  vehicle_value: num(),
  gold_value: num(),
  total_liabilities: num(),
  total_emi_monthly: num(),
  existing_loan_count: z.coerce.number().int().min(0).max(50),
  credit_utilization_pct: z.coerce.number().min(0).max(100),
  missed_payments_12m: z.coerce.number().int().min(0).max(60),
  loan_defaults_ever: z.coerce.number().int().min(0).max(50),
  credit_enquiries_6m: z.coerce.number().int().min(0).max(50),
  cibil_score: z.coerce.number().int().min(0).max(900),
  tax_filing_years: z.coerce.number().int().min(0).max(50),
  digital_footprint_score: z.coerce.number().min(0).max(100),
});

export type ApplicationFormValues = z.input<typeof applicationSchema>;

export const submitApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => applicationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const result = computeScore(data as ScoringInput);

    const { data: row, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        ...data,
        arthsetu_score: result.arthsetu_score,
        score_band: result.score_band,
        default_probability: result.default_probability,
        recommended_credit_limit: result.recommended_credit_limit,
        recommended_interest_rate: result.recommended_interest_rate,
        net_worth: result.net_worth,
        factors: result.factors as unknown as Record<string, never>,
        recommendations: result.recommendations as unknown as Record<string, never>,
        model_version: result.model_version,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { application: row };
  });

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { applications: data ?? [] };
  });
