import { Sparkles } from "lucide-react";

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      {withText && (
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          ArthSetu
        </span>
      )}
    </div>
  );
}
