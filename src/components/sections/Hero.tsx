import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const stats = [
  { label: "Score range", value: 900, prefix: "300–", display: "range" },
  { label: "Factors analyzed", value: 12 },
  { label: "Protected attributes used", value: 0 },
  { label: "Audit-trail coverage", value: 100, suffix: "%" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-5 pt-28 pb-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        RBI-aligned • Explainable • Bias-audited
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05 }}
        className="max-w-4xl font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl"
      >
        Score the <span className="text-gradient">unscored.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground"
      >
        ArthSetu turns thin-file small businesses, MSMEs and gig workers into bankable
        customers using alternate data — UPI activity, utility payments, rent, occupation
        and assets — and predicts probability of default with human-in-the-loop review.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Button
          asChild
          size="lg"
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Link to="/auth" search={{ mode: "signup" }}>
            Apply for a score <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="bg-card/40 backdrop-blur">
          <Link to="/how-it-works">See how it works</Link>
        </Button>
      </motion.div>

      <div className="mt-20 grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 + i * 0.08 }}
            className="glass rounded-2xl p-6"
          >
            <div className="font-display text-3xl font-bold text-primary">
              {s.display === "range" ? (
                <>
                  {s.prefix}
                  <AnimatedCounter value={s.value} />
                </>
              ) : (
                <AnimatedCounter value={s.value} suffix={s.suffix ?? ""} />
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
