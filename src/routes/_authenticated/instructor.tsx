import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  GraduationCap,
  Layers,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, MasteryBar } from "@/components/ui-states";
import { useInstructorAnalytics } from "@/lib/socratic-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/instructor")({
  head: () => ({
    meta: [
      { title: "Instructor & Socratic Analytics — EduPilot" },
      {
        name: "description",
        content: "Instructor dashboard for conceptual misconceptions, concept difficulty rankings, and memorization vs understanding diagnostics.",
      },
    ],
  }),
  component: InstructorAnalyticsPage,
});

function InstructorAnalyticsPage() {
  const { data: analytics, isLoading, refetch, isRefetching } = useInstructorAnalytics();
  const [filterTopic, setFilterTopic] = useState("");

  if (isLoading) return <LoadingState label="Loading instructor analytics…" />;

  const {
    commonMisconceptions = [],
    difficultConcepts = [],
    memorizationVsUnderstanding = {
      totalEvaluations: 0,
      correctAnswerWithStrongReasoning: 0,
      correctAnswerWithWeakReasoning: 0,
      incorrectWithMisconception: 0,
      memorizationRatio: 0,
    },
    recentSessions = [],
  } = analytics ?? {};

  const filteredMisconceptions = filterTopic
    ? commonMisconceptions.filter(
        (m) =>
          m.topic.toLowerCase().includes(filterTopic.toLowerCase()) ||
          m.misconception.toLowerCase().includes(filterTopic.toLowerCase()),
      )
    : commonMisconceptions;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="size-5" />
            </span>
            <h1 className="text-2xl font-bold sm:text-3xl">Instructor & Socratic Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregate student diagnostics: detect common misconceptions, rank concept difficulty, and expose rote memorization.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("size-4", isRefetching && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Socratic Interrogations</p>
          <p className="text-3xl font-bold text-primary">{memorizationVsUnderstanding.totalEvaluations}</p>
          <p className="text-xs text-muted-foreground">Across all enrolled topics</p>
        </div>

        <div className="surface p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Misconceptions</p>
          <p className="text-3xl font-bold text-destructive">
            {commonMisconceptions.reduce((acc, m) => acc + (m.studentCount - m.resolvedCount), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Identified & tracked</p>
        </div>

        <div className="surface p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Memorization Vulnerability</p>
          <p className="text-3xl font-bold text-warning">
            {memorizationVsUnderstanding.memorizationRatio}%
          </p>
          <p className="text-xs text-muted-foreground">Correct answers with weak reasoning</p>
        </div>

        <div className="surface p-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Misconception Resolution Rate</p>
          <p className="text-3xl font-bold text-success">
            {commonMisconceptions.length > 0
              ? Math.round(
                  (commonMisconceptions.reduce((acc, m) => acc + m.resolvedCount, 0) /
                    Math.max(1, commonMisconceptions.reduce((acc, m) => acc + m.studentCount, 0))) *
                    100,
                )
              : 100}
            %
          </p>
          <p className="text-xs text-muted-foreground">Resolved through defense</p>
        </div>
      </div>

      {/* Memorization vs Deep Understanding Section */}
      <section className="surface p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold">Memorization vs. Genuine Conceptual Understanding</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analysis of whether students are producing correct answers through deep conceptual grasp or superficial keyword recall.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-success/30 bg-success/5 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-success">Genuine Mastery</span>
              <CheckCircle2 className="size-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {memorizationVsUnderstanding.correctAnswerWithStrongReasoning}
            </p>
            <p className="text-xs text-muted-foreground">
              Correct final answer backed by rigorous, logically consistent reasoning and successful defense.
            </p>
          </div>

          <div className="rounded-xl border border-warning/40 bg-warning/5 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-warning">Surface Memorizers</span>
              <AlertTriangle className="size-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {memorizationVsUnderstanding.correctAnswerWithWeakReasoning}
            </p>
            <p className="text-xs text-muted-foreground">
              Correct final answer, but flunked the Socratic challenge due to missing causal steps or false assumptions.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-destructive">Active Misconceptions</span>
              <Brain className="size-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {memorizationVsUnderstanding.incorrectWithMisconception}
            </p>
            <p className="text-xs text-muted-foreground">
              Explicit conceptual misunderstanding or flawed mental model requiring targeted pedagogical remediation.
            </p>
          </div>
        </div>
      </section>

      {/* Difficult Concepts Ranked by Low Defense Quality & High Misconception Frequency */}
      <section className="surface p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-bold">Concept Difficulty & Defense Vulnerability Index</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked topics based on lowest student defense quality and highest misconception frequency.
          </p>
        </div>

        {difficultConcepts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No topic difficulty data available yet. Have students complete Socratic challenges in the Arena.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3 font-semibold">Topic</th>
                  <th className="pb-3 font-semibold">Avg Mastery</th>
                  <th className="pb-3 font-semibold">Avg Defense Quality</th>
                  <th className="pb-3 font-semibold">Misconception Rate</th>
                  <th className="pb-3 font-semibold">Total Challenges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {difficultConcepts.map((concept, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="py-3 font-medium text-foreground">{concept.topic}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-xs">{concept.avgMastery}%</span>
                        <div className="w-20">
                          <MasteryBar value={concept.avgMastery} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "font-semibold text-xs",
                          concept.avgDefenseQuality < 50
                            ? "text-destructive"
                            : concept.avgDefenseQuality < 70
                              ? "text-warning"
                              : "text-success",
                        )}
                      >
                        {concept.avgDefenseQuality}%
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-mono",
                          concept.misconceptionRate > 40
                            ? "border-destructive/40 text-destructive bg-destructive/10"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {concept.misconceptionRate}%
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{concept.totalChallenges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Common Misconceptions Table */}
      <section className="surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Frequently Detected Misconceptions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Specific misunderstandings surfaced by the AI Socratic engine across the student cohort.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by topic or concept…"
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {filteredMisconceptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No misconceptions found matching your filter.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filteredMisconceptions.map((item, idx) => (
              <div key={idx} className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{item.topic}</span>
                    <span className="text-xs text-muted-foreground">({item.concept})</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {item.category.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        item.severity === "high"
                          ? "border-destructive/40 text-destructive bg-destructive/10"
                          : item.severity === "medium"
                            ? "border-warning/40 text-warning-foreground bg-warning/10"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {item.severity} severity
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Frequency: <strong className="text-foreground">{item.studentCount}x</strong>
                    </span>
                    <span className="text-success font-medium">
                      Resolved: {item.resolvedCount}x
                    </span>
                  </div>
                </div>

                <p className="text-sm font-medium text-destructive/90 bg-destructive/5 rounded-lg p-2.5 border border-destructive/20">
                  ⚠️ "{item.misconception}"
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Live Recent Socratic Sessions Audit Log */}
      <section className="surface p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent Live Socratic Interrogations Feed</h2>
          <span className="text-xs text-muted-foreground">{recentSessions.length} sessions</span>
        </div>

        {recentSessions.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No recent Socratic activity logged.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentSessions.map((session) => (
              <div key={session.id} className="py-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-semibold text-foreground text-sm">{session.topic}</span>
                  <span>
                    Mastery: {session.mastery_before}% → {session.mastery_after}% ·{" "}
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="line-clamp-1 text-muted-foreground">
                  <strong className="text-foreground">Question: </strong> {session.question}
                </p>
                {session.challenge && (
                  <p className="line-clamp-1 text-primary">
                    <strong>Socratic Challenge ({session.challenge_type}): </strong> {session.challenge}
                  </p>
                )}
                {session.defense_evaluation && (
                  <p className="line-clamp-1 text-success">
                    <strong>Defense Feedback ({session.defense_evaluation.defense_quality}%): </strong>{" "}
                    {session.defense_evaluation.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
