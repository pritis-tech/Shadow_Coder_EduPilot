import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Flame,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  ListCheck,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Square,
  Star,
  Target,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, LoadingState, MasteryBar, StatusBadge } from "@/components/ui-states";
import { useExamDashboard } from "@/lib/exam-planner-data";
import {
  createExamSetup,
  processExamMaterials,
  regenerateStudyPlan,
  toggleTopicSelection,
} from "@/lib/exam-planner.functions";
import type {
  ExamDashboardData,
  PriorityTier,
  RepeatPattern,
  StudyDayPlan,
} from "@/lib/exam-planner/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/exam-planner")({
  head: () => ({
    meta: [
      { title: "Exam Mastery Planner — EduPilot" },
      {
        name: "description",
        content:
          "Evidence-based exam preparation: analyze your syllabus and optional PYQs, choose topics you want to master, track dynamic countdown, and practice Socratic challenges.",
      },
    ],
  }),
  component: ExamPlannerPage,
});

function ExamPlannerPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: dashboard, isLoading, refetch } = useExamDashboard();
  const [activeTab, setActiveTab] = useState<"overview" | "syllabus" | "pyqs" | "plan">("overview");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggleSelectionFn = useServerFn(toggleTopicSelection);
  const refreshPlanFn = useServerFn(regenerateStudyPlan);

  async function handleToggleTopic(topic: string, currentSelected: boolean) {
    if (!dashboard?.exam.id) return;
    try {
      await toggleSelectionFn({
        data: {
          examId: dashboard.exam.id,
          topic,
          selected: !currentSelected,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["exam-dashboard"] });
      toast.success(`${topic} ${!currentSelected ? "added to" : "removed from"} your master target list.`);
    } catch {
      toast.error("Failed to update topic selection.");
    }
  }

  async function handleSelectAllTopics(select: boolean) {
    if (!dashboard?.exam.id || !dashboard.all_topics) return;
    startTransition(async () => {
      try {
        for (const t of dashboard.all_topics) {
          if (t.selected !== select) {
            await toggleSelectionFn({
              data: {
                examId: dashboard.exam.id,
                topic: t.topic,
                selected: select,
              },
            });
          }
        }
        await refreshPlanFn({ data: { examId: dashboard.exam.id } });
        queryClient.invalidateQueries({ queryKey: ["exam-dashboard"] });
        toast.success(select ? "All topics selected for mastery!" : "All topics deselected.");
      } catch {
        toast.error("Failed to update topic selections.");
      }
    });
  }

  async function handleRegeneratePlan() {
    if (!dashboard?.exam.id) return;
    startTransition(async () => {
      try {
        await refreshPlanFn({ data: { examId: dashboard.exam.id } });
        queryClient.invalidateQueries({ queryKey: ["exam-dashboard"] });
        toast.success("Study plan regenerated with your latest selections!");
      } catch {
        toast.error("Failed to regenerate study plan.");
      }
    });
  }

  if (isLoading) return <LoadingState />;

  if (!dashboard || !dashboard.exam) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Exam Mastery Planner</h1>
          <p className="mt-1 text-muted-foreground">
            Upload your syllabus (and optional PYQs) to choose the topics you want to master and generate a personalized preparation roadmap.
          </p>
        </div>

        <EmptyState
          title="No Active Exam Setup"
          description="Prepare for your upcoming exam. Provide your syllabus, optionally upload previous-year question papers (PYQs), select topics you want to master, and let EduPilot build your evidence-based study plan."
          action={
            <Button onClick={() => setIsSetupOpen(true)}>
              <Sparkles className="size-4 mr-1.5" /> Setup Exam & Upload Materials
            </Button>
          }
        />

        <ExamSetupModal
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          onSuccess={() => {
            setIsSetupOpen(false);
            refetch();
          }}
        />
      </div>
    );
  }

  const {
    exam,
    days_until_exam,
    overall_mastery,
    topics_mastered_count,
    topics_improving_count,
    topics_attention_count,
    has_pyq_data,
    study_now,
    high_priority_topics,
    all_topics,
    pyqs,
    study_plan,
  } = dashboard;

  const selectedCount = all_topics.filter((t) => t.selected).length;

  const filteredTopics = all_topics.filter((t) => {
    if (selectedPriorityFilter !== "all" && t.priority !== selectedPriorityFilter) return false;
    if (searchQuery.trim() && !t.topic.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{exam.name}</h1>
            <Badge variant="outline" className="text-xs">
              {exam.subject}
            </Badge>
            {has_pyq_data ? (
              <Badge variant="default" className="text-xs bg-primary/20 text-primary border border-primary/40">
                <Flame className="size-3 mr-1 inline text-destructive" /> Syllabus + PYQ Intelligence
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="size-3 mr-1 inline" /> Syllabus & Mastery Target Plan
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Target Exam Date: {new Date(exam.exam_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsSetupOpen(true)}>
            <Upload className="size-4 mr-1.5" /> Upload / New Exam
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarCheck className="inline-block size-4 mr-1.5" /> Dashboard & Countdown
        </button>
        <button
          onClick={() => setActiveTab("syllabus")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === "syllabus"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="inline-block size-4 mr-1.5" /> Choose Topics to Master ({selectedCount}/{all_topics.length})
        </button>
        <button
          onClick={() => setActiveTab("pyqs")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === "pyqs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <BookOpen className="inline-block size-4 mr-1.5" /> PYQ Archive ({pyqs.length})
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            activeTab === "plan"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <ListCheck className="inline-block size-4 mr-1.5" /> Personalized Study Plan
        </button>
      </div>

      {/* TAB 1: OVERVIEW & DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Hero Countdown & Progress Banner */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/30">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Exam Countdown
                </span>
                <Clock className="size-4 text-primary animate-pulse" />
              </div>
              <p className="mt-3 text-3xl font-extrabold text-primary">
                {days_until_exam === 0 ? "TODAY!" : `${days_until_exam} DAYS LEFT`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {days_until_exam === 0
                  ? "Good luck on your exam today!"
                  : `Target: ${new Date(exam.exam_date).toLocaleDateString()}`}
              </p>
            </div>

            <div className="surface p-5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Overall Target Mastery
              </span>
              <p className="mt-3 text-3xl font-bold text-foreground">{overall_mastery}%</p>
              <div className="mt-2">
                <MasteryBar value={overall_mastery} />
              </div>
            </div>

            <div className="surface p-5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Selected Goals
              </span>
              <p className="mt-3 text-3xl font-bold text-primary">
                {selectedCount} <span className="text-sm font-normal text-muted-foreground">/ {all_topics.length}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Topics prioritized in your study plan
              </p>
            </div>

            <div className="surface p-5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Mastery Breakdown
              </span>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-success font-medium">✓ {topics_mastered_count} Mastered</span>
                <span className="text-warning font-medium">~ {topics_improving_count} Improving</span>
                <span className="text-destructive font-medium">! {topics_attention_count} Needs Work</span>
              </div>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-success"
                  style={{ width: `${(topics_mastered_count / Math.max(1, all_topics.length)) * 100}%` }}
                />
                <div
                  className="bg-warning"
                  style={{ width: `${(topics_improving_count / Math.max(1, all_topics.length)) * 100}%` }}
                />
                <div
                  className="bg-destructive"
                  style={{ width: `${(topics_attention_count / Math.max(1, all_topics.length)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* "WHAT SHOULD I STUDY NOW?" Action Card */}
          {study_now && (
            <section className="surface p-6 border-l-4 border-l-primary bg-card/70 relative overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Zap className="size-5 text-primary" />
                    <span className="text-xs uppercase font-bold tracking-wider text-primary">
                      Recommended Focus Right Now
                    </span>
                    <PriorityBadge priority={study_now.priority} />
                    {study_now.is_selected_goal && (
                      <Badge variant="secondary" className="text-xs">
                        ★ Your Mastery Goal
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    Study {study_now.topic} Now
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Why? </span>
                    {study_now.reason}
                  </p>
                  {study_now.relevant_pyq_sample && (
                    <div className="mt-2 rounded-md bg-secondary/60 p-3 text-xs font-mono text-muted-foreground border border-border">
                      <span className="font-bold text-foreground">Sample PYQ: </span>
                      "{study_now.relevant_pyq_sample.slice(0, 120)}..."
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Current Mastery: <span className="text-foreground font-bold">{study_now.current_mastery}%</span>
                  </div>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link to="/socratic" search={{ topic: study_now.topic }}>
                      <Sparkles className="size-4 mr-1.5" /> Practice Socratic Challenge →
                    </Link>
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* High Priority Topics Matrix */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Flame className="size-5 text-destructive" /> Top Priority Preparation Areas
                </h2>
                <p className="text-xs text-muted-foreground">
                  {has_pyq_data
                    ? "High-probability topics backed by multi-year recurrence in uploaded question papers."
                    : "High-impact foundational topics based on syllabus structure and learning dependencies."}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("syllabus")}>
                View All Topics & Select Goals →
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {high_priority_topics.slice(0, 6).map((item) => (
                <div key={item.topic} className="surface p-5 flex flex-col justify-between space-y-4 border-destructive/20 hover:border-destructive/40 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground truncate">{item.unit_name}</span>
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground">{item.topic}</h3>
                      {item.selected && (
                        <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                          ✓ Target
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {has_pyq_data ? (
                        <>
                          <RepeatBadge pattern={item.repeat_pattern} years={item.years_appeared} />
                          <Badge variant="secondary" className="text-xs">
                            {item.pyq_count} PYQ question{item.pyq_count === 1 ? "" : "s"}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Syllabus Core Concept
                        </Badge>
                      )}
                    </div>
                    {item.evidence.length > 0 && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        "{item.evidence[0]}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Mastery</span>
                      <span className="font-bold">{item.mastery}%</span>
                    </div>
                    <MasteryBar value={item.mastery} />
                    <Button asChild size="sm" variant="outline" className="w-full mt-2">
                      <Link to="/socratic" search={{ topic: item.topic }}>
                        <Sparkles className="size-3.5 mr-1" /> Socratic Defense →
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Today's Daily Schedule snippet */}
          {study_plan && study_plan.schedule.length > 0 && study_plan.schedule[0] && (
            <section className="surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  <h2 className="text-base font-bold">Upcoming Plan: Day {study_plan.schedule[0].day_number}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("plan")}>
                  Full Day-by-Day Schedule →
                </Button>
              </div>

              <div className="rounded-lg border border-border divide-y divide-border">
                {study_plan.schedule[0].activities.map((act) => (
                  <div key={act.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex items-start gap-3">
                      <ActivityIcon type={act.type} />
                      <div>
                        <p className="font-semibold text-foreground">{act.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                      </div>
                    </div>
                    {act.type === "socratic_challenge" && study_plan.schedule[0] && (
                      <Button size="sm" asChild>
                        <Link to="/socratic" search={{ topic: study_plan.schedule[0].topic }}>
                          Launch Challenge
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* TAB 2: CHOOSE TOPICS YOU WANT TO MASTER */}
      {activeTab === "syllabus" && (
        <div className="space-y-6">
          <div className="surface p-5 bg-gradient-to-r from-primary/5 via-card to-card border border-primary/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Target className="size-5 text-primary" /> Choose Topics You Want to Master
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select the topics you want to focus on. EduPilot will prioritize them in your study plan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary bg-primary/10">
                  Selected topics: {selectedCount} of {all_topics.length}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegeneratePlan}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <RefreshCw className="size-4 mr-1.5" />}
                  Create My Mastery Plan
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAllTopics(true)}
                disabled={isPending}
                className="text-xs h-7 px-2.5"
              >
                <CheckSquare className="size-3.5 mr-1" /> Select All ({all_topics.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAllTopics(false)}
                disabled={isPending}
                className="text-xs h-7 px-2.5"
              >
                <Square className="size-3.5 mr-1" /> Deselect All
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search topic or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant={selectedPriorityFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPriorityFilter("all")}
              >
                All ({all_topics.length})
              </Button>
              <Button
                variant={selectedPriorityFilter === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPriorityFilter("high")}
              >
                🔥 High ({all_topics.filter((t) => t.priority === "high").length})
              </Button>
              <Button
                variant={selectedPriorityFilter === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPriorityFilter("medium")}
              >
                ⭐⭐⭐ Medium ({all_topics.filter((t) => t.priority === "medium").length})
              </Button>
              <Button
                variant={selectedPriorityFilter === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPriorityFilter("low")}
              >
                ⭐ Lower ({all_topics.filter((t) => t.priority === "low").length})
              </Button>
            </div>
          </div>

          {/* Topics Table */}
          <div className="surface overflow-hidden border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-12">Master</th>
                    <th className="py-3 px-4">Topic & Unit</th>
                    <th className="py-3 px-4">Priority & Recurrence</th>
                    <th className="py-3 px-4">Evidence Basis</th>
                    <th className="py-3 px-4 w-32">Mastery</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTopics.map((t) => (
                    <tr key={t.topic} className={cn("hover:bg-secondary/30 transition-colors", t.selected && "bg-primary/5")}>
                      <td className="py-3.5 px-4 align-top">
                        <input
                          type="checkbox"
                          checked={t.selected}
                          onChange={() => handleToggleTopic(t.topic, t.selected)}
                          className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer mt-1"
                        />
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-foreground">{t.topic}</p>
                          {t.selected && (
                            <Badge variant="outline" className="text-xs border-primary/40 text-primary py-0 px-1.5">
                              Target
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.unit_name}</p>
                      </td>
                      <td className="py-3.5 px-4 align-top space-y-1">
                        <div>
                          <PriorityBadge priority={t.priority} />
                        </div>
                        {has_pyq_data ? (
                          <div>
                            <RepeatBadge pattern={t.repeat_pattern} years={t.years_appeared} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Syllabus Structure</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs text-muted-foreground max-w-xs">
                        {t.evidence.map((ev, i) => (
                          <p key={i} className="mb-0.5">• {ev}</p>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center justify-between text-xs mb-1 font-medium">
                          <span>{t.mastery}%</span>
                        </div>
                        <MasteryBar value={t.mastery} />
                      </td>
                      <td className="py-3.5 px-4 align-top text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/socratic" search={{ topic: t.topic }}>
                            <Sparkles className="size-3 mr-1" /> Practice
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PYQ QUESTION ARCHIVE */}
      {activeTab === "pyqs" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Extracted Previous-Year Questions (PYQs)</h2>
              <p className="text-xs text-muted-foreground">
                Verbatim questions extracted directly from your uploaded exam papers. Practice answering them with AI Socratic defense.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsSetupOpen(true)}>
              <Plus className="size-4 mr-1.5" /> Upload PYQs
            </Button>
          </div>

          {!has_pyq_data || pyqs.length === 0 ? (
            <div className="surface p-8 text-center space-y-3 border-dashed">
              <History className="size-10 text-muted-foreground mx-auto" />
              <h3 className="font-bold text-base">No Previous-Year Question Papers Uploaded</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Your study plan and priority rankings are currently guided by your curriculum syllabus and your selected mastery targets. You can upload past papers anytime to unlock question-level recurrence analysis.
              </p>
              <Button size="sm" onClick={() => setIsSetupOpen(true)}>
                <Upload className="size-4 mr-1.5" /> Upload PYQ Papers (Optional)
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pyqs.map((q, idx) => (
                <div key={q.id || idx} className="surface p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="font-mono">
                        {q.year} Exam Paper
                      </Badge>
                      {q.mapped_topic && (
                        <Badge variant="outline">
                          Topic: {q.mapped_topic}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="capitalize font-mono">{q.question_type} Question</span>
                      {q.marks && <span className="font-bold text-foreground">· {q.marks} Marks</span>}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {q.question_text}
                  </p>

                  <div className="flex items-center justify-end pt-2 border-t border-border">
                    <Button size="sm" asChild>
                      <Link to="/socratic" search={{ topic: q.mapped_topic || undefined }}>
                        <Sparkles className="size-3.5 mr-1.5" /> Solve with Socratic Defense
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PERSONALIZED STUDY PLAN */}
      {activeTab === "plan" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Personalized Day-by-Day Study Roadmap</h2>
              <p className="text-xs text-muted-foreground">
                {study_plan?.summary || "Tailored schedule based on your exam countdown and target topics."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegeneratePlan}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <RefreshCw className="size-4 mr-1.5" />}
              Regenerate Plan
            </Button>
          </div>

          {!study_plan || study_plan.schedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">No study plan generated yet.</p>
          ) : (
            <div className="space-y-4">
              {study_plan.schedule.map((day) => (
                <div key={day.day_number} className="surface p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        D{day.day_number}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">
                          Day {day.day_number}: {day.topic}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <PriorityBadge priority={day.priority} />
                  </div>

                  <div className="space-y-2 pt-1">
                    {day.activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-md bg-secondary/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <ActivityIcon type={act.type} />
                          <div>
                            <p className="font-semibold text-foreground">{act.title}</p>
                            <p className="text-muted-foreground mt-0.5">{act.description}</p>
                          </div>
                        </div>
                        {act.type === "socratic_challenge" && (
                          <Button size="sm" asChild>
                            <Link to="/socratic" search={{ topic: day.topic }}>
                              Launch Challenge →
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup Modal */}
      <ExamSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onSuccess={() => {
          setIsSetupOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

// --- Helper UI Components ---

function PriorityBadge({ priority }: { priority: PriorityTier }) {
  if (priority === "high") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 text-xs font-semibold">
        🔥 HIGH PRIORITY
      </Badge>
    );
  }
  if (priority === "medium") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-semibold">
        ⭐⭐⭐ MEDIUM
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
      ⭐ LOWER PRIORITY
    </Badge>
  );
}

function RepeatBadge({ pattern, years }: { pattern: RepeatPattern; years: number[] }) {
  if (pattern === "repeated_both_years") {
    return (
      <Badge variant="default" className="text-xs bg-primary/20 text-primary border border-primary/40">
        Repeated in Both Years ({years.join(" & ")})
      </Badge>
    );
  }
  if (pattern === "high_frequency") {
    return (
      <Badge variant="secondary" className="text-xs">
        High Frequency in PYQs
      </Badge>
    );
  }
  if (pattern === "single_year") {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Appeared in {years[0]}
      </Badge>
    );
  }
  return null;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "concept_review") return <BookOpen className="size-4 text-primary shrink-0 mt-0.5" />;
  if (type === "pyq_practice") return <FileText className="size-4 text-amber-500 shrink-0 mt-0.5" />;
  if (type === "socratic_challenge") return <Sparkles className="size-4 text-emerald-500 shrink-0 mt-0.5" />;
  return <Target className="size-4 text-muted-foreground shrink-0 mt-0.5" />;
}

// --- Setup & Upload Dialog Component ---

function ExamSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [examName, setExamName] = useState("Data Structures & Algorithms Exam");
  const [subject, setSubject] = useState("Computer Science");
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 25);
    return d.toISOString().split("T")[0];
  });
  const [syllabusFileName, setSyllabusFileName] = useState("");
  const [syllabusContent, setSyllabusContent] = useState("");

  const [pyqFiles, setPyqFiles] = useState<Array<{ fileName: string; year: number; content: string }>>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");

  const createExamFn = useServerFn(createExamSetup);
  const processMaterialsFn = useServerFn(processExamMaterials);

  function handleSyllabusFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSyllabusFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setSyllabusContent(res);
    };
    reader.readAsDataURL(file);
  }

  function handlePyqFileChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      setPyqFiles((prev) => {
        const next = [...prev];
        const current = next[index];
        const yr = current ? current.year : 2024;
        next[index] = { fileName: file.name, year: yr, content: res };
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function addPyqSlot() {
    setPyqFiles((prev) => [...prev, { fileName: "", year: 2024 - prev.length, content: "" }]);
  }

  function removePyqSlot(index: number) {
    setPyqFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!examName.trim()) {
      toast.error("Please enter the exam name.");
      return;
    }
    if (!examDate) {
      toast.error("Please select the upcoming exam date.");
      return;
    }

    // Default sample syllabus text if student didn't upload a PDF
    const finalSyllabusContent =
      syllabusContent ||
      `Data Structures Syllabus:
Unit 1: Linear Data Structures - Arrays, Linked Lists, Stacks, Queues, Binary Search, Two Pointers.
Unit 2: Non-Linear Data Structures - Trees, Binary Search Trees, AVL Trees, Traversals (Preorder, Inorder, Postorder).
Unit 3: Graph Algorithms - BFS, DFS, Dijkstra's Shortest Path, Topological Sort, Minimum Spanning Trees.
Unit 4: Advanced Concepts - Hash Tables, Collision Resolution, Dynamic Programming, Memoization.`;

    const finalSyllabusName = syllabusFileName || "Data_Structures_Syllabus.txt";

    // Filter only valid uploaded PYQ files (0 PYQs is 100% allowed)
    const validPyqs: Array<{ fileName: string; year: number; content: string }> = pyqFiles.filter(
      (p) => p.content.length > 0 && p.fileName.length > 0,
    );

    setIsProcessing(true);
    try {
      setProcessingStatus("Creating exam profile...");
      const exam = await createExamFn({
        data: {
          name: examName,
          subject,
          examDate,
          targetScore: 90,
        },
      });

      setProcessingStatus(
        validPyqs.length > 0
          ? `Extracting syllabus structure & analyzing ${validPyqs.length} PYQ paper(s)...`
          : "Analyzing syllabus structure and building mastery roadmap...",
      );

      await processMaterialsFn({
        data: {
          examId: exam.id,
          subject,
          examDate,
          syllabusDoc: {
            fileName: finalSyllabusName,
            content: finalSyllabusContent,
          },
          pyqDocs: validPyqs,
        },
      });

      toast.success(
        validPyqs.length > 0
          ? "Exam materials analyzed and study plan created!"
          : "Syllabus analyzed and personalized mastery plan created!",
      );
      onSuccess();
    } catch (err) {
      toast.error(`Error processing materials: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" /> Setup Exam Mastery Planner
          </DialogTitle>
          <DialogDescription>
            Upload your syllabus and optional previous-year question papers (PYQs) to choose the topics you want to master and generate your preparation plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="examName">Exam Name</Label>
              <Input
                id="examName"
                placeholder="e.g. Data Structures & Algorithms End-Sem"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Computer Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="examDate">Upcoming Exam Date</Label>
            <Input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>

          {/* Syllabus Upload (REQUIRED) */}
          <div className="space-y-2 rounded-lg border border-border p-4 bg-secondary/20">
            <div className="flex items-center justify-between">
              <Label className="font-bold flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-primary" /> Syllabus Document <span className="text-primary text-xs font-normal">(Required)</span>
              </Label>
              <span className="text-xs text-muted-foreground">PDF, JPG, PNG, or Text</span>
            </div>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={handleSyllabusFileChange}
            />
            {syllabusFileName ? (
              <p className="text-xs text-success font-medium">Selected: {syllabusFileName}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave unselected to use standard comprehensive {subject} syllabus.
              </p>
            )}
          </div>

          {/* PYQ Papers Upload (OPTIONAL) */}
          <div className="space-y-3 rounded-lg border border-border p-4 bg-secondary/20">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div>
                <Label className="font-bold flex items-center gap-1.5">
                  <History className="size-4 text-amber-500" /> Previous-Year Question Papers (Optional)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upload PYQs if you want exam-pattern and recurrence analysis. You can continue with the syllabus alone.
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground italic">You can skip this section</span>
            </div>

            {pyqFiles.length === 0 ? (
              <div className="p-3 bg-secondary/30 rounded-md text-xs text-muted-foreground flex items-center justify-between">
                <span>No PYQ papers added yet (Optional).</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPyqSlot}
                  className="text-xs h-7"
                >
                  <Plus className="size-3 mr-1" /> Add PYQ Paper
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {pyqFiles.map((pyq, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="2000"
                        max="2099"
                        value={pyq.year}
                        onChange={(e) => {
                          const yr = parseInt(e.target.value, 10) || 2024;
                          setPyqFiles((prev) => {
                            const next = [...prev];
                            const cur = next[idx] ?? { fileName: "", year: yr, content: "" };
                            next[idx] = { ...cur, year: yr };
                            return next;
                          });
                        }}
                        placeholder="Year"
                      />
                    </div>
                    <div className="col-span-8">
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        onChange={(e) => handlePyqFileChange(idx, e)}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removePyqSlot(idx)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                        title="Remove paper"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addPyqSlot}
                  className="text-xs"
                >
                  <Plus className="size-3 mr-1" /> Add Another PYQ Year
                </Button>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="p-3 bg-primary/10 rounded-md flex items-center gap-3 text-sm text-primary animate-pulse">
              <Loader2 className="size-4 animate-spin" />
              <span>{processingStatus || "Processing documents with AI..."}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" /> Analyzing Materials...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-1.5" /> Create My Mastery Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
