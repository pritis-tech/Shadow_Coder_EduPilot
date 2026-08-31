import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart3,
  Compass,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exam-planner", label: "Exam Planner", icon: GraduationCap },
  { to: "/socratic", label: "Socratic Arena", icon: Sparkles },
  { to: "/roadmap", label: "Roadmap", icon: Compass },
  { to: "/tutor", label: "AI Tutor", icon: MessageSquareText },
  { to: "/quiz", label: "Mini Quiz", icon: Target },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/instructor", label: "Instructor", icon: ShieldAlert },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Header with Safe Area support */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md transition-colors duration-200 pt-safe">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2.5 rounded-xl py-1 text-foreground transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-primary to-cyan-500 shadow-md shadow-primary/25 transition-shadow group-hover:shadow-lg group-hover:shadow-primary/40">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold tracking-tight text-foreground">EduPilot</span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-primary sm:inline-block">
                  AI Socratic Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden items-center gap-1 xl:gap-1.5 lg:flex">
            {NAV.map((item) => {
              const isActive = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-xs dark:bg-primary/20 dark:text-primary-foreground dark:border-transparent"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", isActive ? "text-primary dark:text-primary-foreground" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar: Theme Toggle + Sign Out + Mobile Menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="hidden h-9 items-center gap-1.5 rounded-xl text-xs font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:inline-flex"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </Button>

            {/* Mobile Menu Hamburger */}
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-xl lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={open}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {open && (
          <div className="border-t border-border bg-card/98 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 lg:hidden">
            <nav aria-label="Mobile Navigation" className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
              {NAV.map((item) => {
                const isActive = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-bold border border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-transparent"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t border-border" />

              <button
                type="button"
                onClick={signOut}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-5" />
                <span>Sign out</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8 pl-safe pr-safe pb-safe">
        {children}
      </main>
    </div>
  );
}
