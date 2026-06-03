import { Lock, Users, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const features = [
  {
    icon: Lock,
    title: "Immutable audit trail",
    body: "Every score, override and email is logged append-only.",
  },
  {
    icon: Users,
    title: "Human override with reason",
    body: "Bank workers can adjust AI decisions — reason mandatory, change tracked forever.",
  },
  {
    icon: ShieldCheck,
    title: "No protected attributes",
    body: "Gender, religion, caste and marital status are never used by the model.",
  },
];

export function Compliance() {
  return (
    <section className="relative px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="grid items-center gap-12 rounded-3xl border border-border/60 bg-gradient-surface p-8 md:grid-cols-2 md:p-14">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
                <ShieldCheck className="h-4 w-4" /> Compliance-first
              </span>
              <h2 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
                Built around the rules that matter.
              </h2>
              <p className="mt-5 leading-relaxed text-muted-foreground">
                Aligned with RBI's Digital Lending Guidelines, Master Direction on KYC, and the
                Fair Practices Code. Bias-audited factors, immutable audit trail, and customer
                right-to-explanation.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.1}>
                  <div className="flex gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
