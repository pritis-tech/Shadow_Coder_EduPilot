import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardSkeletons, EmptyState, MasteryBar, StatusBadge } from "@/components/ui-states";
import {
  daysUntil,
  studyStreak,
  useLatestAssessment,
  useLatestPlan,
  useProfile,
  useQuizResults,
  useTopicProgress,
} from "@/lib/data";
import { useExamDashboard } from "@/lib/exam-planner-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduPilot" },
      { name: "description", content: "Your mastery, streak, today's goal and your next adaptive recommendation." },
      { property: "og:title", content: "Dashboard — EduPilot" },
      { property: "og:description", content: "Your mastery, streak, today's goal and next recommendation." },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const { data: profile } = useProfile();
  const { data: assessment, isLoading: loadingAssessment } = useLatestAssessment();
  const { data: progress = [], isLoading: loadingProgress } = useTopicProgress();
  const { data: quizzes = [] } = useQuizResults(10);
  const { data: plan } = useLatestPlan();
  const { data: examDashboard } = useExamDashboard();

  const loading = loadingAssessment || loadingProgress;

  const overall =
    progress.length > 0
      ? Math.round(progress.reduce((sum, p) => sum + Number(p.mastery_score), 0) / progress.length)
      : 0;
  const streak = studyStreak(quizzes);
  const weakest = [...progress].sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))[0];
  const strong = progress.filter((p) => Number(p.mastery_score) >= 80);
  const weak = progress.filter((p) => Number(p.mastery_score) < 60);
  const days = daysUntil(profile?.exam_date);
  const today = plan?.plan_data?.days?.[0];
  const latestFeedback = quizzes[0]?.feedback;

  // Determine top recommendation
  const primaryTopic = examDashboard?.study_now?.topic || weakest?.topic || today?.topic || "Foundational Concepts";
  const primaryReason =
    examDashboard?.study_now?.reason ||
    latestFeedback?.recommendation ||
    (weakest
      ? `Identified as your lowest mastery concept (${Math.round(Number(weakest.mastery_score))}%) needing reinforcement.`
      : "Complete your diagnostic to unlock personalized study recommendations.");

  const currentTopicRecord = progress.find((p) => p.topic.toLowerCase() === primaryTopic.toLowerCase());
  const currentTopicMastery = currentTopicRecord ? Math.round(Number(currentTopicRecord.mastery_score)) : (weakest ? Math.round(Number(weakest.mastery_score)) : 50);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />
        <CardSkeletons count={4} />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome, {profile?.name || "Student"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Take a 10-question diagnostic to find your knowledge gaps and generate your tailored roadmap.
          </p>
        </div>
        <EmptyState
          title="Start with your AI Diagnostic"
          description={`We'll evaluate core topics for ${profile?.subject ?? "your subject"} to pinpoint exactly what you need to study.`}
          action={
            <Button asChild size="lg" className="btn-lift">
              <Link to="/assessment">
                Start diagnostic <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {profile?.name || "Student"}
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-semibold border-primary/30 text-primary">
              {profile?.current_level || "Student"} Level
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{profile?.subject}</span>
            {days !== null && (
              <span> · <span className="text-primary font-bold">{days} day{days === 1 ? "" : "s"}</span> until target exam</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="btn-lift shadow-sm">
            <Link to="/socratic" search={{ topic: primaryTopic }}>
              <Sparkles className="size-4 mr-1.5" /> Launch Socratic Challenge
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 1. PRIMARY HIERARCHY: "WHAT SHOULD I STUDY NOW?" HERO CARD */}
      {/* ========================================================== */}
      <section className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs">
                <Zap className="size-3.5 fill-current" /> What Should I Study Now?
              </span>
              {examDashboard?.exam && (
                <Badge variant="outline" className="text-xs border-border bg-card font-medium text-muted-foreground">
                  <Clock className="size-3 mr-1 inline text-primary" />
                  {examDashboard.days_until_exam === 0 ? "Exam Today!" : `${examDashboard.days_until_exam} days left`}
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Focus on: <span className="text-primary underline decoration-primary/40 underline-offset-4">{primaryTopic}</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1">
                <strong className="text-foreground font-semibold">Why this topic? </strong>
                {primaryReason}
              </p>
            </div>

            {/* Quick stats for this topic */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Current Mastery:</span>
                <span className="font-bold text-foreground">{currentTopicMastery}%</span>
                <div className="w-20">
                  <MasteryBar value={currentTopicMastery} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Launch Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <Button asChild size="lg" className="btn-lift shadow-md font-semibold text-white bg-primary hover:bg-primary/90">
              <Link to="/socratic" search={{ topic: primaryTopic }}>
                <Sparkles className="size-4 mr-2" /> Socratic Challenge
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 btn-lift">
                <Link to="/tutor" search={{ topic: primaryTopic }}>
                  <MessageSquareText className="size-3.5 mr-1" /> AI Tutor
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 btn-lift">
                <Link to="/quiz" search={{ topic: primaryTopic }}>
                  <Target className="size-3.5 mr-1" /> Mini Quiz
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 2. SECONDARY HIERARCHY: MASTERY METRICS & PROGRESS MATRIX */}
      {/* ========================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Overall Mastery"
          value={`${overall}%`}
          hint="Aggregate across all topics"
        >
          <MasteryBar value={overall} />
        </StatCard>

        <StatCard
          icon={<Clock className="size-4" />}
          label="Days Until Exam"
          value={days !== null ? `${days}` : "Set date"}
          hint={profile?.exam_date ? `Target: ${new Date(profile.exam_date).toLocaleDateString()}` : "Configure in profile"}
        />

        <StatCard
          icon={<Flame className="size-4 text-amber-500" />}
          label="Learning Streak"
          value={`${streak} day${streak === 1 ? "" : "s"}`}
          hint="Consecutive quiz & practice days"
        />

        <StatCard
          icon={<Sparkles className="size-4" />}
          label="Diagnostic Score"
          value={`${Math.round(assessment.score)}%`}
          hint={new Date(assessment.created_at).toLocaleDateString()}
        />
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Topic Mastery List */}
        <section className="surface p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Topic Mastery Breakdown</h2>
              <span className="text-xs text-muted-foreground font-mono">{progress.length} topics tracked</span>
            </div>
            <div className="mt-4 space-y-4">
              {progress.slice(0, 6).map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="truncate font-semibold text-foreground">{p.topic}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge mastery={Number(p.mastery_score)} status={p.status} />
                      <span className="font-bold text-foreground">{Math.round(Number(p.mastery_score))}%</span>
                    </div>
                  </div>
                  <MasteryBar value={Number(p.mastery_score)} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Keep testing to improve mastery</span>
            <Button asChild variant="ghost" size="sm">
              <Link to="/progress">Full Progress Report →</Link>
            </Button>
          </div>
        </section>

        {/* Right: Strong vs. Needs Work & Recent Quizzes */}
        <div className="space-y-6">
          <section className="surface p-6">
            <h2 className="text-base font-bold text-foreground">Strengths vs Knowledge Gaps</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-success/30 dark:bg-success/5 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-success">
                  <CheckCircle2 className="size-4" /> Strong Concepts (≥80%)
                </div>
                <ul className="mt-2.5 space-y-1.5 text-xs">
                  {strong.length ? (
                    strong.map((p) => (
                      <li key={p.id} className="font-medium text-foreground flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-success" />
                        {p.topic}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground italic">None yet. Keep practicing!</li>
                  )}
                </ul>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:border-destructive/30 dark:bg-destructive/5 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-destructive">
                  <Zap className="size-4" /> Needs Work (&lt;60%)
                </div>
                <ul className="mt-2.5 space-y-1.5 text-xs">
                  {weak.length ? (
                    weak.map((p) => (
                      <li key={p.id} className="font-medium text-foreground flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-destructive" />
                        {p.topic}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground italic">All concepts are in good shape!</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Recent Quiz Scores */}
          <section className="surface p-6">
            <h2 className="text-base font-bold text-foreground">Recent Quiz Activity</h2>
            {quizzes.length === 0 ? (
              <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
                No quizzes completed yet. Take a quick quiz to recalibrate topic mastery.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {quizzes.slice(0, 4).map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-3 py-2.5 text-xs sm:text-sm">
                    <span className="truncate font-medium text-foreground">{q.topic}</span>
                    <span className="shrink-0 font-semibold text-muted-foreground">
                      {Math.round(Number(q.score))}% · <span className="font-normal text-[11px]">{new Date(q.created_at).toLocaleDateString()}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 3. TERTIARY HIERARCHY: EXAM MASTERY PLANNER & ROADMAP      */}
      {/* ========================================================== */}
      {examDashboard?.exam && (
        <section className="surface border-primary/30 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Exam Mastery Planner · {examDashboard.exam.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Evidence-based preparation with {examDashboard.all_topics.length} topics mapped.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary bg-primary/10">
                <Clock className="size-3 mr-1 inline" />
                {examDashboard.days_until_exam === 0 ? "EXAM TODAY!" : `${examDashboard.days_until_exam} DAYS LEFT`}
              </Badge>
              {examDashboard.has_pyq_data ? (
                <Badge variant="default" className="text-xs bg-primary/20 text-primary border border-primary/40">
                  PYQ Insights Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Syllabus Plan Mode
                </Badge>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/exam-planner">Open Full Planner →</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Current Roadmap Overview */}
      {plan?.plan_data?.days?.length ? (
        <section className="surface p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Your Personalized Study Roadmap</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/roadmap">Full Roadmap →</Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.plan_data.days.slice(0, 6).map((d) => (
              <div key={d.day} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Day {d.day}</span>
                  {d.minutes && <span className="text-[10px] text-muted-foreground">{d.minutes} min</span>}
                </div>
                <p className="mt-1.5 text-sm font-semibold text-foreground truncate">{d.topic}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.focus}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No Study Roadmap Generated Yet"
          description="Transform your diagnostic into a day-by-day roadmap tailored to your weakest concepts."
          action={
            <Button asChild>
              <Link to="/assessment-results">Generate Roadmap</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface p-5 transition-all hover:shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2.5 truncate text-2xl sm:text-3xl font-extrabold text-foreground">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
