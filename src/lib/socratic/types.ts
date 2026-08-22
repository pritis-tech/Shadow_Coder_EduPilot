import { z } from "zod";

export type SocraticStrictness = "gentle" | "balanced" | "strict";

export const CHALLENGE_TYPES = [
  "why",
  "how",
  "counterexample",
  "comparison",
  "edge_case",
  "alternative_scenario",
  "prediction",
  "explain_difference",
  "assumption_challenge",
  "consequence_question",
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const MISCONCEPTION_CATEGORIES = [
  "conceptual_misunderstanding",
  "incorrect_assumption",
  "missing_prerequisite",
  "terminology_confusion",
  "logical_reasoning_error",
  "partial_understanding",
  "overgeneralization",
] as const;
export type MisconceptionCategory = (typeof MISCONCEPTION_CATEGORIES)[number];

export const InitialAnalysisSchema = z.object({
  answer_status: z.enum(["correct", "partially_correct", "incorrect", "unclear"]),
  reasoning_quality: z.number().min(0).max(100),
  conceptual_understanding: z.number().min(0).max(100),
  misconception_detected: z.boolean(),
  misconception: z.string().nullable().optional(),
  misconception_category: z.enum(MISCONCEPTION_CATEGORIES).nullable().optional(),
  misconception_severity: z.enum(["low", "medium", "high"]).nullable().optional(),
  challenge_type: z.enum(CHALLENGE_TYPES),
  challenge: z.string().min(5),
  challenge_difficulty: z.enum(["easy", "medium", "hard"]),
  confidence: z.number().min(0).max(100).default(80),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  feedback: z.string().min(5),
  expected_core_concept: z.string().default(""),
});

export type InitialAnalysisResult = z.infer<typeof InitialAnalysisSchema>;

export const DefenseEvaluationSchema = z.object({
  defense_quality: z.number().min(0).max(100),
  conceptual_understanding: z.number().min(0).max(100),
  logical_consistency: z.number().min(0).max(100),
  addressed_challenge: z.boolean(),
  misconception_status: z.enum(["resolved", "persists", "none"]),
  mastery_score: z.number().min(0).max(100),
  mastery_delta: z.number().min(-100).max(100),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  feedback: z.string().min(5),
  next_recommendation: z.string().min(5),
  suggested_next_difficulty: z.enum(["easy", "medium", "hard"]),
});

export type DefenseEvaluationResult = z.infer<typeof DefenseEvaluationSchema>;

export type SocraticSession = {
  id: string;
  user_id: string;
  topic: string;
  question_id: string | null;
  question: string;
  expected_concept: string | null;
  student_answer: string;
  student_reasoning: string;
  initial_analysis: InitialAnalysisResult;
  challenge: string | null;
  challenge_type: ChallengeType | null;
  challenge_difficulty: "easy" | "medium" | "hard" | null;
  student_defense: string | null;
  defense_evaluation: DefenseEvaluationResult | null;
  misconception: string | null;
  mastery_before: number;
  mastery_after: number;
  strictness: SocraticStrictness;
  status: "pending_defense" | "completed" | "abandoned";
  created_at: string;
  updated_at: string;
};

export type StudentMisconception = {
  id: string;
  user_id: string;
  topic: string;
  concept: string;
  misconception: string;
  category: MisconceptionCategory;
  severity: "low" | "medium" | "high";
  resolved: boolean;
  frequency: number;
  first_detected_at: string;
  last_detected_at: string;
  resolved_at: string | null;
  session_id: string | null;
};

export type SocraticContext = {
  question: string;
  expectedConcept?: string | undefined;
  studentAnswer: string;
  studentReasoning: string;
  topic: string;
  subject: string;
  level: string;
  currentMastery: number;
  strictness: SocraticStrictness;
  previousSessions?: Array<{
    question: string;
    studentAnswer: string;
    studentReasoning: string;
    challenge: string;
    studentDefense: string;
    masteryAfter: number;
    misconception?: string | null | undefined;
  }> | undefined;
  activeMisconceptions?: Array<{
    concept: string;
    misconception: string;
    category: string;
    frequency: number;
  }> | undefined;
  examContext?: {
    examName?: string | undefined;
    unitName?: string | undefined;
    relevantPyqs?: Array<{ year: number; question: string; marks?: number | null | undefined }> | undefined;
    priorityTier?: string | undefined;
  } | undefined;
};

export type InstructorAnalyticsData = {
  commonMisconceptions: Array<{
    topic: string;
    concept: string;
    misconception: string;
    category: string;
    studentCount: number;
    resolvedCount: number;
    severity: "low" | "medium" | "high";
  }>;
  difficultConcepts: Array<{
    topic: string;
    avgMastery: number;
    avgDefenseQuality: number;
    misconceptionRate: number;
    totalChallenges: number;
  }>;
  memorizationVsUnderstanding: {
    totalEvaluations: number;
    correctAnswerWithStrongReasoning: number;
    correctAnswerWithWeakReasoning: number;
    incorrectWithMisconception: number;
    memorizationRatio: number; // % of correct answers that had weak reasoning
  };
  recentSessions: SocraticSession[];
};
