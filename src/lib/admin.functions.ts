import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: administrator access required");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data, error } = await supabase
      .from("applications")
      .select("arthsetu_score, score_band, status, override_applied");
    if (error) throw new Error(error.message);

    const apps = data ?? [];
    const total = apps.length;
    const decided = apps.filter((a) =>
      ["approved", "override_approved", "rejected", "override_rejected"].includes(
        a.status as string,
      ),
    );
    const approved = apps.filter((a) =>
      ["approved", "override_approved"].includes(a.status as string),
    ).length;
    const rejected = apps.filter((a) =>
      ["rejected", "override_rejected"].includes(a.status as string),
    ).length;
    const overrides = apps.filter((a) => a.override_applied).length;
    const pending = apps.filter((a) => a.status === "pending").length;
    const scores = apps
      .map((a) => Number(a.arthsetu_score))
      .filter((s) => !Number.isNaN(s));
    const avg = scores.length
      ? Math.round((scores.reduce((x, y) => x + y, 0) / scores.length) * 10) / 10
      : 0;

    const bands = ["EXCELLENT", "VERY_GOOD", "GOOD", "FAIR", "POOR", "VERY_POOR"];
    const distribution = bands.map((band) => ({
      band,
      count: apps.filter((a) => a.score_band === band).length,
    }));

    return {
      total_applications: total,
      pending_count: pending,
      approved_count: approved,
      rejected_count: rejected,
      override_count: overrides,
      approval_rate: decided.length
        ? Math.round((approved / decided.length) * 1000) / 10
        : 0,
      average_score: avg,
      distribution,
    };
  });

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { applications: data ?? [] };
  });

export const getApplicationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: app, error } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Application not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, mobile")
      .eq("id", app.user_id)
      .maybeSingle();

    return { application: app, profile };
  });

const reviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  override: z.boolean().default(false),
  new_score: z.coerce.number().min(300).max(900).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const reviewApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reviewSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    if (data.override && (!data.reason || data.reason.length < 5)) {
      throw new Error("A reason (min 5 characters) is required to override the AI decision.");
    }

    const { data: app, error: fetchErr } = await supabase
      .from("applications")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!app) throw new Error("Application not found");

    const before = {
      arthsetu_score: app.arthsetu_score,
      score_band: app.score_band,
      status: app.status,
    };

    const status = data.override
      ? data.decision === "approved"
        ? "override_approved"
        : "override_rejected"
      : data.decision;

    const update: Record<string, unknown> = {
      status,
      decision: data.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    };
    if (data.override) {
      update.override_applied = true;
      update.override_admin_id = userId;
      update.override_reason = data.reason;
      update.override_timestamp = new Date().toISOString();
      if (data.new_score !== undefined) {
        update.override_new_score = data.new_score;
        update.arthsetu_score = data.new_score;
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from("applications")
      .update(update)
      .eq("id", data.id)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);

    const req = getRequest();
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await supabase.from("audit_logs").insert({
      action: data.override ? "OVERRIDE_APPLIED" : "DECISION_MADE",
      resource_type: "application",
      resource_id: data.id,
      actor_id: userId,
      actor_role: "admin",
      details: {
        decision: data.decision,
        override: data.override,
        reason: data.reason ?? null,
        ip,
      } as unknown as Record<string, never>,
      data_before: before as unknown as Record<string, never>,
      data_after: { status, new_score: data.new_score ?? null } as unknown as Record<
        string,
        never
      >,
    });

    // Fetch customer email then send the report
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", app.user_id)
      .maybeSingle();

    let emailSent = false;
    if (profile?.email) {
      try {
        const { sendCreditReportEmail } = await import("./email.server");
        await sendCreditReportEmail({
          to: profile.email,
          fullName: app.full_name ?? profile.full_name ?? "Applicant",
          applicationId: data.id,
          score: Number(updated.arthsetu_score ?? 0),
          band: String(updated.score_band ?? ""),
          decision: data.decision,
          creditLimit: Number(updated.recommended_credit_limit ?? 0),
          interestRate: Number(updated.recommended_interest_rate ?? 0),
          recommendations: (updated.recommendations as unknown as {
            title: string;
            action: string;
          }[]) ?? [],
          overrideApplied: data.override,
        });
        emailSent = true;
        await supabase.from("applications").update({ email_sent: true }).eq("id", data.id);
      } catch (e) {
        console.error("Email send failed:", e);
      }
    }

    return { application: updated, emailSent };
  });

export const getAuditTrail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });
