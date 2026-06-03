import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogOut, LayoutDashboard } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader() {
  const { session, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const dashHref = role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            to="/compliance"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Compliance
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to={dashHref}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
