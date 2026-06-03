export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      {/* aurora glow orbs */}
      <div
        className="absolute -top-40 left-1/4 h-[34rem] w-[34rem] rounded-full opacity-50 blur-[120px] animate-aurora"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.16 235), transparent 70%)" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full opacity-40 blur-[120px] animate-float-slow"
        style={{ background: "radial-gradient(circle, oklch(0.78 0.13 192), transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full opacity-30 blur-[120px] animate-float"
        style={{ background: "radial-gradient(circle, oklch(0.74 0.15 165), transparent 70%)" }}
      />
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.78 0.13 192 / 0.08) 1px, transparent 1px), linear-gradient(90deg, oklch(0.78 0.13 192 / 0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black, transparent 75%)",
        }}
      />
    </div>
  );
}
