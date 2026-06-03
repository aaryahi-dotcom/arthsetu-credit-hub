import { Store, Bike, Briefcase, Sprout } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const segments = [
  { icon: Store, title: "Small businesses", body: "Kirana stores, traders and shopkeepers with steady cash flow but no formal credit record." },
  { icon: Briefcase, title: "MSMEs", body: "Micro, small & medium enterprises seeking working-capital limits priced to real risk." },
  { icon: Bike, title: "Gig workers", body: "Delivery riders, drivers and freelancers whose income lives in UPI and platforms." },
  { icon: Sprout, title: "First-time borrowers", body: "Thin-file applicants building a digital financial footprint from scratch." },
];

export function WhoItsFor() {
  return (
    <section className="relative px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Built for the thin-file
          </p>
          <h2 className="mt-3 text-center font-display text-4xl font-bold sm:text-5xl">
            Credit for the people banks miss
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {segments.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40">
                <s.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
