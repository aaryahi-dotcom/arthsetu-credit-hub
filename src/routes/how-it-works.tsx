import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhoItsFor } from "@/components/sections/WhoItsFor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — ArthSetu Alternate Credit Scoring" },
      {
        name: "description",
        content:
          "See how ArthSetu scores thin-file applicants: complete your profile, get a 300–900 score with per-factor contribution, and improve with personalized recommendations.",
      },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <SiteHeader />
      <main className="pt-28">
        <section className="px-5 text-center">
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold sm:text-6xl">
            From application to <span className="text-gradient">decision.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            A transparent, three-step journey — with a bank worker reviewing every outcome before
            it reaches you.
          </p>
        </section>
        <HowItWorks />
        <WhoItsFor />
        <section className="px-5 pb-24 text-center">
          <Button
            asChild
            size="lg"
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Link to="/auth" search={{ mode: "signup" }}>
              Apply for a score <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
