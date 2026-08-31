import { Link } from "@tanstack/react-router";
import { Brain, CheckCircle2, Flame, GraduationCap, ShieldCheck, Sparkles, Target } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeContent?: React.ReactNode;
}

const HIGHLIGHTS = [
  {
    icon: Brain,
    title: "AI Knowledge Gap Detection",
    description: "Identifies precise conceptual gaps instead of generic percentage scores.",
  },
  {
    icon: Sparkles,
    title: "Socratic Challenge Arena",
    description: "Exposes rote memorization through interactive AI logic defenses.",
  },
  {
    icon: Target,
    title: "Exam Mastery Planner",
    description: "Evidence-based preparation powered by your syllabus and optional PYQs.",
  },
  {
    icon: ShieldCheck,
    title: "Adaptive Roadmaps",
    description: "Your daily study path updates automatically as you master new topics.",
  },
];

export function AuthLayout({ children, title, subtitle, badgeContent }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      {/* Ambient background glows */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
        <div className="absolute -top-32 left-1/4 h-[550px] w-[550px] rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
        <div className="absolute bottom-10 right-10 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute top-1/2 left-10 h-[350px] w-[350px] rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />
      </div>

      {/* Main Split Layout Grid */}
      <div className="relative z-10 flex min-h-screen min-h-dvh flex-col lg:grid lg:grid-cols-12">
        {/* ================= LEFT COLUMN: Value Proposition & Branding (Desktop) ================= */}
        <aside className="relative hidden flex-col justify-between border-r border-border bg-gradient-to-br from-card via-card to-secondary/50 p-8 lg:col-span-6 lg:flex xl:col-span-7 xl:p-12 2xl:p-16">
          <div className="space-y-8">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 transition-transform hover:scale-[1.02]">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-primary to-cyan-500 shadow-md shadow-primary/25">
                <GraduationCap className="size-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold tracking-tight text-foreground">EduPilot</span>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  AI Socratic Platform
                </span>
              </div>
            </Link>

            {/* Hero Value Prop */}
            <div className="space-y-3 pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                <Sparkles className="size-3.5" /> Next-Gen Adaptive Learning
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl xl:text-5xl leading-tight">
                Stop studying everything.
                <br />
                <span className="bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 dark:from-primary dark:via-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Start studying what you need.
                </span>
              </h2>
              <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
                EduPilot analyzes your knowledge gaps with adaptive diagnostics, generates an evidence-based roadmap for your upcoming exams, and tests deep understanding with Socratic challenges.
              </p>
            </div>

            {/* 4 Core AI Highlights */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="surface p-4.5 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Live Proof Card */}
          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-destructive animate-pulse" />
                <span className="text-xs font-semibold text-foreground">Built for Mastery & Exam Success</span>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">v2.0 Active</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Evidence-based topic prioritization, Socratic logic interrogation, and dynamic exam countdowns.
            </p>
          </div>
        </aside>

        {/* ================= RIGHT COLUMN: Auth Form Area ================= */}
        <main className="relative flex flex-1 flex-col justify-between p-4 sm:p-6 md:p-8 lg:col-span-6 xl:col-span-5 pt-safe pb-safe">
          {/* Top Bar with Brand (Mobile only) & ThemeToggle (All screens) */}
          <div className="flex items-center justify-between pb-4 sm:pb-6">
            <div className="lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                  <GraduationCap className="size-4" />
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground">EduPilot</span>
              </Link>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>

          {/* Centered Auth Card */}
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-2 sm:py-6">
            <div className="surface p-6 sm:p-8">
              {/* Header Title */}
              <div className="mb-6 space-y-2 text-left">
                {badgeContent && <div className="mb-2">{badgeContent}</div>}
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Form Content Slot */}
              <div>{children}</div>
            </div>
          </div>

          {/* Footer Copyright */}
          <footer className="pt-4 text-center text-xs text-muted-foreground">
            EduPilot AI Socratic Platform &copy; {new Date().getFullYear()} · All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
