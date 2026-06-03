import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signup" ? "signup" : "signin",
  }),
  component: AuthPage,
});

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});
const signupSchema = signinSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  useEffect(() => setIsSignup(mode === "signup"), [mode]);

  // redirect once authenticated + role known
  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/dashboard", replace: true });
    }
  }, [loading, session, role, navigate]);

  const handleForgotPassword = async () => {
    const email = form.email.trim();
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent — check your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignup) {
        const parsed = signupSchema.parse(form);
        const { error } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm, then sign in.");
        setIsSignup(false);
      } else {
        const parsed = signinSchema.parse(form);
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.email,
          password: parsed.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.issues[0].message
          : err instanceof Error
            ? err.message
            : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <AuroraBackground />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-border/60 bg-gradient-surface p-8 shadow-elegant backdrop-blur"
      >
        <Link to="/" className="flex justify-center">
          <Logo />
        </Link>
        <h1 className="mt-6 text-center font-display text-2xl font-bold">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isSignup
            ? "Apply for an ArthSetu credit score in minutes."
            : "Sign in to your ArthSetu dashboard."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {isSignup && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="As per your PAN"
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "New to ArthSetu?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="font-medium text-primary hover:underline"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
