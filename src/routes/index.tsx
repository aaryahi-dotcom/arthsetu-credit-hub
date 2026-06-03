import { createFileRoute } from "@tanstack/react-router";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhoItsFor } from "@/components/sections/WhoItsFor";
import { Compliance } from "@/components/sections/Compliance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ArthSetu — Score the unscored | Alternate Credit Intelligence" },
      {
        name: "description",
        content:
          "Alternate credit scoring for small businesses, MSMEs and gig workers. Predict probability of default with explainable, bias-audited, human-reviewed decisions.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <WhoItsFor />
        <Compliance />
      </main>
      <SiteFooter />
    </div>
  );
}
