import { createFileRoute, Link } from "@tanstack/react-router";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, MasteryBar, StatusBadge } from "@/components/ui-states";
import { useQuizResults, useTopicProgress } from "@/lib/data";
import { useSocraticHistory, useStudentMisconceptions } from "@/lib/socratic-data";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Socratic Mastery — EduPilot" },
      { name: "description", content: "Track overall mastery, topic mastery, conceptual misconceptions, and Socratic challenge history." },
      { property: "og:title", content: "Progress & Socratic Mastery — EduPilot" },
      { property: "og:description", content: "Track overall mastery, topic mastery, conceptual misconceptions, and Socratic challenge history." },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { data: progress = [], isLoading } = useTopicProgress();
  const { data: quizzes = [] } = useQuizResults(30);
  const { data: misconceptionsData } = useStudentMisconceptions();
  const { data: socraticHistory = [] } = useSocraticHistory(10);

  if (isLoading) return <LoadingState />;

  if (progress.length === 0)
    return (
      <EmptyState
        title="No progress yet"
        description="Take the diagnostic assessment to start tracking your topic mastery."
        action={
          <Button asChild>
            <Link to="/assessment">Take diagnostic</Link>
          </Button>
        }
      />
    );

  const overall = Math.round(progress.reduce((s, p) => s + Number(p.mastery_score), 0) / progress.length);
  const completed = progress.filter((p) => Number(p.mastery_score) >= 80);
  const improving = progress.filter((p) => Number(p.mastery_score) >= 60 && Number(p.mastery_score) < 80);
  const attention = progress.filter((p) => Number(p.mastery_score) < 60);

  const activeMisconceptions = misconceptionsData?.active ?? [];
  const resolvedMisconceptions = misconceptionsData?.resolved ?? [];

  const chartData = [...quizzes]
    .reverse()
    .map((q, i) => ({ n: i + 1, score: Math.round(Number(q.score)), topic: q.topic }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Progress & Mastery</h1>
          <p className="mt-1 text-muted-foreground">How your conceptual understanding and mastery have moved.</p>
        </div>
        <Button asChild size="sm">
          <Link to="/socratic" search={{ topic: undefined }}>
            <Sparkles className="size-4" /> Socratic Challenge Arena
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall mastery</p>
          <p className="mt-2 text-3xl font-bold text-primary">{overall}%</p>
          <div className="mt-3">
            <MasteryBar value={overall} />
          </div>
        </div>
        <Tile label="Completed topics" value={completed.length} />
        <Tile label="Active Misconceptions" value={activeMisconceptions.length} />
        <Tile label="Socratic Interrogations" value={socraticHistory.length} />
      </div>

      {/* Conceptual Misconceptions Tracker */}
      <section className="surface p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-warning" />
            <h2 className="text-sm font-semibold">Tracked Misconceptions ({activeMisconceptions.length} Active / {resolvedMisconceptions.length} Resolved)</h2>
          </div>
          {activeMisconceptions.length > 0 && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/socratic" search={{ topic: activeMisconceptions[0]?.topic }}>
                Resolve in Socratic Arena
              </Link>
            </Button>
          )}
        </div>

        {activeMisconceptions.length === 0 && resolvedMisconceptions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No misconceptions detected yet. Defend your logic in the Socratic Arena to test your understanding.</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {activeMisconceptions.map((m) => (
              <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{m.topic}</span>
                    <Badge variant="outline" className="text-xs font-mono border-destructive/40 text-destructive bg-destructive/10">
                      {m.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-destructive">⚠️ "{m.misconception}"</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/socratic" search={{ topic: m.topic }}>
                    Challenge Now →
                  </Link>
                </Button>
              </div>
            ))}
            {resolvedMisconceptions.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-3 text-sm opacity-70">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" />
                    <span className="font-medium text-foreground">{m.topic}</span>
                    <Badge variant="outline" className="text-xs text-success border-success/40 bg-success/10">
                      Resolved
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-through">"{m.misconception}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Topic Mastery */}
      <section className="surface p-6">
        <h2 className="text-sm font-semibold">Topic mastery</h2>
        <div className="mt-5 space-y-5">
          {progress.map((p) => (
            <div key={p.id}>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{p.topic}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge mastery={Number(p.mastery_score)} status={p.status} />
                  <span className="text-muted-foreground">{Math.round(Number(p.mastery_score))}%</span>
                </div>
              </div>
              <MasteryBar value={Number(p.mastery_score)} />
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {p.attempts} attempt{p.attempts === 1 ? "" : "s"}
                  {p.last_score !== null ? ` · last score ${Math.round(Number(p.last_score))}%` : ""}
                </span>
                <Link to="/socratic" search={{ topic: p.topic }} className="text-primary hover:underline">
                  Socratic Interrogate →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Socratic Challenge History */}
      {socraticHistory.length > 0 && (
        <section className="surface p-6">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h2 className="text-sm font-semibold">Recent Socratic Defense History</h2>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {socraticHistory.slice(0, 6).map((s) => (
              <li key={s.id} className="py-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.topic} ({s.challenge_type})</span>
                  <span className="text-xs text-muted-foreground">
                    Mastery: {s.mastery_before}% → {s.mastery_after}%
                  </span>
                </div>
                {s.challenge && <p className="text-xs text-muted-foreground line-clamp-1 font-mono">Challenge: {s.challenge}</p>}
                {s.defense_evaluation && (
                  <p className="text-xs text-success line-clamp-1">
                    Defense: {s.defense_evaluation.defense_quality}% · {s.defense_evaluation.feedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quiz History */}
      <section className="surface p-6">
        <h2 className="text-sm font-semibold">Quiz history</h2>
        {chartData.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Take a mini quiz to start building your history.</p>
        ) : (
          <>
            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="n" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, _n, item) => [`${value}%`, item.payload.topic]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-6 divide-y divide-border">
              {quizzes.slice(0, 10).map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="truncate font-medium">{q.topic}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {Math.round(Number(q.score))}% · {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
