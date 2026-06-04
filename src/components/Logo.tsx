import { UserLock } from "lucide-react";

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <UserLock 
          className="lucide lucide-sparkles h-5 w-5 text-primary-foreground bg-slate-100 border-slate-500 border-dotted shadow" 
          strokeWidth={2.5} 
        />
      </div>
      {withText && (
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          ArthSetu
        </span>
      )}
    </div>
  );
}
