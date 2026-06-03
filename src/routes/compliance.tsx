import { createFileRoute } from "@tanstack/react-router";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Compliance } from "@/components/sections/Compliance";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — ArthSetu | RBI-aligned, bias-audited credit" },
      {
        name: "description",
        content:
          "ArthSetu is aligned with RBI Digital Lending Guidelines and KYC norms: immutable audit trail, mandatory human-override reasons, and no protected attributes.",
      },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <SiteHeader />
      <main className="pt-28">
        <section className="px-5 text-center">
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-bold sm:text-6xl">
            Compliance you can <span className="text-gradient">audit.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Every decision is explainable, reviewable and permanently logged.
          </p>
        </section>
        <Compliance />
      </main>
      <SiteFooter />
    </div>
  );
}
