import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  MessageSquareText,
  Route as RouteIcon,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduPilot — Your AI-Powered Learning Guide" },
      {
        name: "description",
        content:
          "EduPilot finds your knowledge gaps with an AI diagnostic, builds a personalised study roadmap, and adapts it as you learn.",
      },
      { property: "og:title", content: "EduPilot — Your AI-Powered Learning Guide" },
      {
        property: "og:description",
        content: "Stop studying everything. Start studying what you actually need, with an adaptive AI learning guide.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "AI Diagnostic Assessment",
    body: "A 10-question adaptive diagnostic built for your subject and level, evaluating every core topic.",
  },
  {
    icon: BrainCircuit,
    title: "Knowledge Gap Detection",
    body: "Topic-level analysis that names the exact concept you're missing — not just a raw percentage score.",
  },
  {
    icon: Sparkles,
    title: "Socratic Challenge Arena",
    body: "Interrogates logical reasoning and exposes rote memorization through interactive AI defenses.",
  },
  {
    icon: RouteIcon,
    title: "Personalized Roadmap",
    body: "A day-by-day plan weighted towards your weak areas, your upcoming exam date, and study hours.",
  },
  {
    icon: MessageSquareText,
    title: "AI Tutor",
    body: "Ask anything about your current topic. Explanations, analogies, and worked examples tuned to your level.",
  },
  {
    icon: LineChart,
    title: "Mastery & Progress Tracking",
    body: "Real-time mastery per topic, misconception alerts, and clear view of what still needs attention.",
  },
];

const STEPS = [
  { n: "01", t: "Assess", d: "Take the 10-question AI diagnostic for your subject." },
  { n: "02", t: "Analyze", d: "See concept-level strengths and detected knowledge gaps." },
  { n: "03", t: "Plan", d: "Get an evidence-based roadmap built around your weak areas." },
  { n: "04", t: "Challenge", d: "Defend your understanding in the Socratic Arena." },
  { n: "05", t: "Test", d: "Take short mastery checks to verify progress." },
  { n: "06", t: "Adapt", d: "Your roadmap dynamically recalculates as you improve." },
];

function Landing() {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-primary to-cyan-500 shadow-md shadow-primary/25">
              <GraduationCap className="size-5 text-white" />
            </div>
            <span className="text-lg font-extrabold text-foreground">EduPilot</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="btn-lift font-semibold">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
              <Sparkles className="size-3.5" /> Your AI-Powered Learning Guide
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground leading-[1.08] sm:text-5xl lg:text-6xl">
              Stop studying everything.
              <br />
              <span className="bg-gradient-to-r from-primary via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                Start studying what you need.
              </span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              EduPilot finds your knowledge gaps with adaptive AI diagnostics, builds a day-by-day exam roadmap, and tests conceptual logic in the Socratic Arena.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <Button asChild size="lg" className="btn-lift font-semibold shadow-md">
                <Link to="/signup">
                  Start Learning <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-lift">
                <a href="#how-it-works">How It Works</a>
              </Button>
            </div>
            <dl className="grid max-w-md grid-cols-3 gap-4 pt-4 border-t border-border">
              {[
                ["10", "diagnostic questions"],
                ["6", "step learning cycle"],
                ["100%", "personalized roadmap"],
              ].map(([v, l]) => (
                <div key={l} className="space-y-0.5">
                  <dt className="text-2xl font-extrabold text-foreground">{v}</dt>
                  <dd className="text-xs text-muted-foreground leading-tight">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero Gap Analysis Showcase Card */}
          <div className="surface p-6 sm:p-7 card-hover">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sample Knowledge Gap Detection</p>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Live Preview</span>
            </div>
            <div className="mt-5 space-y-4">
              {[
                ["Arrays & Two Pointers", 90, "bg-success", "Mastered"],
                ["Linked Lists", 80, "bg-success", "Mastered"],
                ["Binary Trees & BST", 55, "bg-warning", "Needs Practice"],
                ["Graph Algorithms (BFS/DFS)", 35, "bg-destructive", "Critical Gap"],
                ["Dynamic Programming", 20, "bg-destructive", "Critical Gap"],
              ].map(([topic, score, tone, badge]) => (
                <div key={topic as string} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-foreground">{topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">{badge}</span>
                      <span className="font-bold text-foreground">{score}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">💡 Socratic Recommendation: </span>
              “Dynamic Programming is your primary gap. Start with overlapping subproblems and memoization before attempting state optimization.”
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-y border-border bg-card/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">How EduPilot Works</h2>
            <p className="max-w-2xl mx-auto text-sm text-muted-foreground">
              A continuous adaptive cycle: assess, analyze, plan, challenge, test, and adapt.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:shadow-xs">
                <span className="text-xs font-extrabold text-primary font-mono">{s.n}</span>
                <h3 className="mt-2 text-base font-bold text-foreground">{s.t}</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Everything You Need to Close Knowledge Gaps
          </h2>
          <p className="max-w-xl mx-auto text-sm text-muted-foreground">
            Built from learning science principles to ensure real conceptual mastery.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface p-6 transition-all hover:border-primary/40 hover:shadow-md">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="border-t border-border bg-card/70 py-16 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 sm:px-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Zap className="size-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Find out what you actually need to study
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
            Take the diagnostic, get your personalized study roadmap, and let EduPilot adapt as you master each concept.
          </p>
          <Button asChild size="lg" className="btn-lift font-semibold shadow-md">
            <Link to="/signup">
              Start Learning Now <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-8 text-xs text-muted-foreground pb-safe">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} EduPilot · AI Socratic Learning Platform</span>
          <span>Adaptive EdTech Engine</span>
        </div>
      </footer>
    </div>
  );
}
