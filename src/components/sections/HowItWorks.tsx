import { FileCheck2, BarChart3, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const steps = [
  {
    icon: FileCheck2,
    title: "1. Complete your profile",
    body: "Income, employment, assets, liabilities and digital activity — all in one streamlined application.",
  },
  {
    icon: BarChart3,
    title: "2. Get scored",
    body: "Our deterministic engine produces a 300–900 score with per-factor contribution. No protected attributes used.",
  },
  {
    icon: TrendingUp,
    title: "3. Improve & re-apply",
    body: "Personalized recommendations show exactly which actions lift your score the most.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-4xl font-bold sm:text-5xl">
            How ArthSetu works
          </h2>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div className="group h-full rounded-2xl border border-border/60 bg-gradient-surface p-8 transition-all hover:-translate-y-1 hover:shadow-elegant">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-colors group-hover:bg-primary/20">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
