import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, MasteryBar, StatusBadge } from "@/components/ui-states";
import {
  analyzeSocraticAnswer,
  generateSocraticQuestion,
  submitSocraticDefense,
} from "@/lib/socratic.functions";
import { useSocraticHistory, useStudentMisconceptions } from "@/lib/socratic-data";
import { errorMessage, useProfile, useTopicProgress } from "@/lib/data";
import type {
  DefenseEvaluationResult,
  InitialAnalysisResult,
  SocraticSession,
  SocraticStrictness,
} from "@/lib/socratic/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/socratic")({
  validateSearch: (search: Record<string, unknown>): { topic?: string | undefined } => ({
    topic: typeof search["topic"] === "string" ? search["topic"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Socratic Challenge Arena — EduPilot" },
      {
        name: "description",
        content: "Test your true conceptual understanding through AI Socratic challenges, defenses, and adaptive mastery recalibration.",
      },
    ],
  }),
  component: SocraticArenaPage,
});

const DEFAULT_TOPICS = [
  "Binary Search",
  "Recursion & Backtracking",
  "Time & Space Complexity",
  "Dynamic Programming",
  "Graph Traversal (BFS & DFS)",
  "Sorting Algorithms",
  "Trees & Binary Search Trees",
  "Hash Tables & Collisions",
];

function SocraticArenaPage() {
  const { topic: searchTopic } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: progress = [], isLoading: loadingProgress } = useTopicProgress();

  const generateQ = useServerFn(generateSocraticQuestion);
  const analyzeAns = useServerFn(analyzeSocraticAnswer);
  const submitDef = useServerFn(submitSocraticDefense);

  // Available topics
  const topics = Array.from(
    new Set([
      ...(searchTopic ? [searchTopic] : []),
      ...(progress.map((p) => p.topic)),
      ...DEFAULT_TOPICS,
    ]),
  ).filter(Boolean);

  const [topic, setTopic] = useState(searchTopic ?? topics[0] ?? "Binary Search");
  const [strictness, setStrictness] = useState<SocraticStrictness>("balanced");

  // Misconceptions for chosen topic
  const { data: misconceptionsData } = useStudentMisconceptions(topic);
  const activeMisconceptions = misconceptionsData?.active ?? [];

  // Socratic History
  const { data: history = [], refetch: refetchHistory } = useSocraticHistory(10);

  // Current session state
  const [questionData, setQuestionData] = useState<{
    question: string;
    options: string[];
    correctIndex: number;
    expectedConcept: string;
    explanation: string;
  } | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [defense, setDefense] = useState("");

  const [activeSession, setActiveSession] = useState<SocraticSession | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState<InitialAnalysisResult | null>(null);
  const [defenseEvaluation, setDefenseEvaluation] = useState<DefenseEvaluationResult | null>(null);

  const [step, setStep] = useState<"question" | "analyzing" | "challenge" | "evaluating" | "result">("question");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingDefense, setLoadingDefense] = useState(false);

  const currentTopicRecord = progress.find((p) => p.topic === topic);
  const currentMastery = currentTopicRecord ? Number(currentTopicRecord.mastery_score) : 50;

  // Auto-load question on topic change or start
  useEffect(() => {
    if (!questionData && topic && profile) {
      void loadNewQuestion(topic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, profile?.subject]);

  async function loadNewQuestion(targetTopic: string) {
    setLoadingQuestion(true);
    setQuestionData(null);
    setSelectedOption(null);
    setReasoning("");
    setDefense("");
    setActiveSession(null);
    setInitialAnalysis(null);
    setDefenseEvaluation(null);
    setStep("question");

    try {
      const res = await generateQ({
        data: {
          subject: profile?.subject || "Computer Science",
          level: profile?.current_level || "Intermediate",
          topic: targetTopic,
          mastery: currentMastery,
        },
      });
      setQuestionData(res);
    } catch (e) {
      toast.error(errorMessage(e, "Could not generate conceptual question."));
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function handleAnalyzeAnswer() {
    if (!questionData) return;
    if (selectedOption === null) {
      toast.error("Please select an answer option first.");
      return;
    }
    if (!reasoning.trim()) {
      toast.error("Please explain your reasoning. The AI needs your logic to evaluate your understanding.");
      return;
    }
    if (reasoning.trim().length < 8) {
      toast.error("Please write a slightly more detailed explanation of your reasoning.");
      return;
    }

    setLoadingAnalysis(true);
    setStep("analyzing");

    try {
      const chosenText = questionData.options[selectedOption] || "Option";
      const result = await analyzeAns({
        data: {
          topic,
          subject: profile?.subject || "Computer Science",
          level: profile?.current_level || "Intermediate",
          question: questionData.question,
          expectedConcept: questionData.expectedConcept,
          studentAnswer: chosenText,
          studentReasoning: reasoning.trim(),
          strictness,
        },
      });

      setActiveSession(result.session);
      setInitialAnalysis(result.initialAnalysis);
      setStep("challenge");
      toast.success("Reasoning analyzed! Review the Socratic Challenge below.");
    } catch (e) {
      toast.error(errorMessage(e, "AI analysis failed. Please try again."));
      setStep("question");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function handleSubmitDefense() {
    if (!activeSession) return;
    if (!defense.trim()) {
      toast.error("Please provide your defense or explanation to the Socratic challenge.");
      return;
    }

    setLoadingDefense(true);
    setStep("evaluating");

    try {
      const result = await submitDef({
        data: {
          sessionId: activeSession.id,
          studentDefense: defense.trim(),
          strictness,
        },
      });

      setActiveSession(result.session);
      setDefenseEvaluation(result.defenseEvaluation);
      setStep("result");
      await queryClient.invalidateQueries();
      void refetchHistory();
      toast.success("Defense evaluated! Topic mastery updated.");
    } catch (e) {
      toast.error(errorMessage(e, "Defense evaluation failed. Please try again."));
      setStep("challenge");
    } finally {
      setLoadingDefense(false);
    }
  }

  if (loadingProgress) return <LoadingState label="Loading Socratic Arena…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <h1 className="text-2xl font-bold sm:text-3xl">Socratic Challenge Arena</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Evaluate deep reasoning, confront counterexamples, defend your understanding, and recalibrate your mastery.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadNewQuestion(topic)}
            disabled={loadingQuestion || loadingAnalysis || loadingDefense}
          >
            <RefreshCw className={cn("size-4", loadingQuestion && "animate-spin")} />
            New Question
          </Button>
        </div>

        {/* Controls bar: Topic & Strictness */}
        <div className="surface mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic</label>
            <Select
              value={topic}
              onValueChange={(val) => {
                setTopic(val);
                void loadNewQuestion(val);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge Strictness</label>
            <div className="flex rounded-lg border border-border bg-muted p-0.5">
              {(["gentle", "balanced", "strict"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setStrictness(mode)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    strictness === mode
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Topic Mastery</p>
              <p className="text-lg font-bold text-primary">{Math.round(currentMastery)}%</p>
            </div>
            <StatusBadge mastery={currentMastery} />
          </div>
        </div>

        {/* Active Misconception Warning Banner if present */}
        {activeMisconceptions.length > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning-foreground">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <div className="text-sm">
              <span className="font-semibold">Active Misconception Detected: </span>
              <span>{activeMisconceptions[0]?.misconception}</span>
              <span className="ml-2 rounded-sm bg-warning/20 px-1.5 py-0.5 text-xs font-mono">
                {activeMisconceptions[0]?.category}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                EduPilot has adapted the Socratic interrogation to target and resolve this misconception.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Socratic Workflow Container */}
      <div className="space-y-6">
        {/* Loading Question Skeleton */}
        {loadingQuestion && (
          <div className="surface p-8 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium">Generating conceptual challenge on {topic}…</p>
          </div>
        )}

        {/* Phase 1: Conceptual Question & Reasoning Input */}
        {questionData && !loadingQuestion && (
          <section className="surface space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Step 1 · Conceptual Question
              </span>
              <span className="text-xs text-muted-foreground">Concept: {questionData.expectedConcept}</span>
            </div>

            <div className="text-base font-semibold leading-relaxed sm:text-lg">
              {questionData.question}
            </div>

            {/* MCQ Options */}
            <div className="grid gap-3">
              {questionData.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={step !== "question"}
                  onClick={() => setSelectedOption(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all",
                    selectedOption === i
                      ? "border-primary bg-primary/10 font-medium text-foreground ring-1 ring-primary"
                      : "border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                    step !== "question" && "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      selectedOption === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            {/* Step 1.2: Student Reasoning Textarea */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Why is this correct? Explain your reasoning:
                </label>
                <span className="text-xs text-muted-foreground">Required for Socratic analysis</span>
              </div>
              <Textarea
                placeholder="Explain the step-by-step logic, mechanism, or principle behind your choice..."
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                disabled={step !== "question"}
                rows={4}
                className="resize-none text-sm leading-relaxed"
              />
            </div>

            {step === "question" && (
              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={() => void handleAnalyzeAnswer()}
                  disabled={selectedOption === null || !reasoning.trim() || loadingAnalysis}
                >
                  {loadingAnalysis ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing Reasoning…
                    </>
                  ) : (
                    <>
                      Analyze Reasoning & Challenge Me <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </section>
        )}

        {/* Phase 2: AI Reasoning Analysis & Socratic Challenge */}
        {initialAnalysis && activeSession && (
          <section className="surface space-y-6 border-primary/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                Step 2 · AI Autonomous Interrogation & Socratic Challenge
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold uppercase tracking-wider text-xs",
                    initialAnalysis.answer_status === "correct"
                      ? "border-success/40 bg-success/10 text-success"
                      : initialAnalysis.answer_status === "partially_correct"
                        ? "border-warning/40 bg-warning/10 text-warning-foreground"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  Answer: {initialAnalysis.answer_status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* AI Decision Diagnostics Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Reasoning Quality</span>
                  <span className="font-semibold text-foreground">{initialAnalysis.reasoning_quality}%</span>
                </div>
                <div className="mt-2">
                  <MasteryBar value={initialAnalysis.reasoning_quality} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Conceptual Understanding</span>
                  <span className="font-semibold text-foreground">{initialAnalysis.conceptual_understanding}%</span>
                </div>
                <div className="mt-2">
                  <MasteryBar value={initialAnalysis.conceptual_understanding} />
                </div>
              </div>
            </div>

            {/* Misconception detected banner if any */}
            {initialAnalysis.misconception_detected && initialAnalysis.misconception && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4" />
                  <span>Misconception Identified: {initialAnalysis.misconception}</span>
                </div>
                <p className="mt-1 text-xs text-destructive/80">
                  Category: {initialAnalysis.misconception_category} · Severity: {initialAnalysis.misconception_severity}
                </p>
              </div>
            )}

            {/* Feedback Commentary */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              <span className="font-semibold text-foreground">AI Assessment: </span>
              <span className="text-muted-foreground">{initialAnalysis.feedback}</span>
            </div>

            {/* The Socratic Challenge Card */}
            <div className="rounded-xl border-2 border-primary/60 bg-primary/5 p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Brain className="size-5 text-primary" />
                  <span className="font-bold text-foreground">Socratic Challenge</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize font-medium">
                    Type: {initialAnalysis.challenge_type.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs capitalize font-semibold",
                      initialAnalysis.challenge_difficulty === "hard"
                        ? "border-destructive/40 text-destructive bg-destructive/10"
                        : initialAnalysis.challenge_difficulty === "medium"
                          ? "border-warning/40 text-warning-foreground bg-warning/10"
                          : "border-success/40 text-success bg-success/10",
                    )}
                  >
                    Difficulty: {initialAnalysis.challenge_difficulty}
                  </Badge>
                </div>
              </div>

              <p className="text-base font-semibold text-foreground leading-relaxed">
                "{initialAnalysis.challenge}"
              </p>
            </div>

            {/* Step 3: Defense Input (if in challenge state) */}
            {step === "challenge" && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">
                      Step 3 · Defend your reasoning against the challenge:
                    </label>
                    <span className="text-xs text-muted-foreground">Address the edge case / comparison</span>
                  </div>
                  <Textarea
                    placeholder="Explain why your logic holds, how the counterexample is resolved, or clarify your principle..."
                    value={defense}
                    onChange={(e) => setDefense(e.target.value)}
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={() => void handleSubmitDefense()}
                    disabled={!defense.trim() || loadingDefense}
                  >
                    {loadingDefense ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Evaluating Defense…
                      </>
                    ) : (
                      <>
                        Submit Defense & Recalibrate Mastery <ShieldCheck className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Phase 4: Defense Evaluation & Recalibrated Mastery Result */}
        {defenseEvaluation && activeSession && (
          <section className="surface space-y-6 border-success/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                Step 4 · Defense Evaluation & Recalibrated Mastery
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "font-semibold text-xs",
                  defenseEvaluation.misconception_status === "resolved"
                    ? "border-success/40 bg-success/10 text-success"
                    : defenseEvaluation.misconception_status === "persists"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                Misconception: {defenseEvaluation.misconception_status.toUpperCase()}
              </Badge>
            </div>

            {/* Defense Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="surface p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Defense Quality</p>
                <p className="mt-1 text-2xl font-bold text-primary">{defenseEvaluation.defense_quality}%</p>
              </div>

              <div className="surface p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Logical Consistency</p>
                <p className="mt-1 text-2xl font-bold">{defenseEvaluation.logical_consistency}%</p>
              </div>

              <div className="surface p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recalibrated Mastery</p>
                <div className="mt-1 flex items-center justify-center gap-1 text-2xl font-bold text-foreground">
                  <span>{activeSession.mastery_after}%</span>
                  {activeSession.mastery_after > activeSession.mastery_before ? (
                    <TrendingUp className="size-5 text-success" />
                  ) : activeSession.mastery_after < activeSession.mastery_before ? (
                    <TrendingDown className="size-5 text-destructive" />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Feedback & Recommendation */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
                <p className="font-semibold text-foreground">Evaluator Feedback:</p>
                <p className="mt-1 text-muted-foreground">{defenseEvaluation.feedback}</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
                <p className="font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="size-4" /> Next Recommendation:
                </p>
                <p className="mt-1 text-foreground">{defenseEvaluation.next_recommendation}</p>
              </div>
            </div>

            {/* Next Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link to="/progress">View In Progress & Mastery</Link>
              </Button>
              <Button size="lg" onClick={() => void loadNewQuestion(topic)}>
                Next Socratic Challenge <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* Socratic History Log Drawer */}
      <section className="surface p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Your Recent Socratic Interrogations</h2>
          </div>
          <span className="text-xs text-muted-foreground">{history.length} logged interactions</span>
        </div>

        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No previous Socratic sessions yet. Complete your first challenge above to start building your reasoning transcript.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {history.slice(0, 6).map((session) => (
              <div key={session.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{session.topic}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {session.challenge_type || "why"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {session.strictness}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Mastery: {session.mastery_before}% → {session.mastery_after}%
                    </span>
                    <span>·</span>
                    <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1">
                  <strong className="text-foreground">Q: </strong> {session.question}
                </p>
                {session.challenge && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    <strong className="text-primary">Challenge: </strong> {session.challenge}
                  </p>
                )}
                {session.defense_evaluation && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    <strong className="text-success">Feedback: </strong> {session.defense_evaluation.feedback}
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
