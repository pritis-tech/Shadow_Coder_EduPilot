import { z } from "zod";

// --- Document Types ---
export type DocumentFileType = "syllabus" | "pyq";

export type UploadedDocumentInput = {
  fileName: string;
  fileType: DocumentFileType;
  pyqYear?: number | null | undefined;
  text: string;
};

// --- Syllabus Extraction Schema ---
export const SyllabusTopicSchema = z.object({
  unit_name: z.string().min(1).default("Unit 1"),
  chapter_name: z.string().nullable().optional(),
  topic: z.string().min(1),
  subtopics: z.array(z.string()).default([]),
  weightage: z.number().nullable().optional(),
});

export const SyllabusExtractionResultSchema = z.object({
  subject: z.string().default("Computer Science"),
  units: z.array(
    z.object({
      unit_name: z.string(),
      chapters: z.array(
        z.object({
          chapter_name: z.string(),
          topics: z.array(
            z.object({
              topic: z.string(),
              subtopics: z.array(z.string()).default([]),
              weightage: z.number().nullable().optional(),
            }),
          ),
        }),
      ),
    }),
  ),
  flat_topics: z.array(SyllabusTopicSchema),
});

export type SyllabusExtractionResult = z.infer<typeof SyllabusExtractionResultSchema>;
export type SyllabusTopicItem = z.infer<typeof SyllabusTopicSchema>;

// --- PYQ Extraction Schema ---
export const PyqQuestionSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  question_text: z.string().min(3),
  marks: z.number().nullable().optional(),
  question_type: z.enum(["short", "long", "numerical", "conceptual"]).default("long"),
  suggested_topic: z.string().min(1),
  tested_concept: z.string().min(1),
});

export const PyqExtractionResultSchema = z.object({
  year: z.number().int(),
  total_questions: z.number().int().default(0),
  questions: z.array(PyqQuestionSchema),
});

export type PyqExtractionResult = z.infer<typeof PyqExtractionResultSchema>;
export type PyqQuestionItem = z.infer<typeof PyqQuestionSchema>;

// --- Topic Analysis & Priority Classification ---
export const PriorityTierSchema = z.enum(["high", "medium", "low"]);
export type PriorityTier = z.infer<typeof PriorityTierSchema>;

export const RepeatPatternSchema = z.enum([
  "repeated_both_years",
  "high_frequency",
  "single_year",
  "not_in_pyq",
]);
export type RepeatPattern = z.infer<typeof RepeatPatternSchema>;

export const TopicAnalysisItemSchema = z.object({
  topic: z.string(),
  unit_name: z.string().default("Unit 1"),
  pyq_count: z.number().int().default(0),
  years_appeared: z.array(z.number().int()).default([]),
  repeat_pattern: RepeatPatternSchema,
  priority: PriorityTierSchema,
  priority_reason: z.string(),
  evidence: z.array(z.string()).default([]),
  estimated_difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  related_pyqs: z.array(PyqQuestionSchema).default([]),
});

export type TopicAnalysisItem = z.infer<typeof TopicAnalysisItemSchema>;

export const ComprehensiveAnalysisResultSchema = z.object({
  topics: z.array(TopicAnalysisItemSchema),
  high_priority_count: z.number().int(),
  medium_priority_count: z.number().int(),
  low_priority_count: z.number().int(),
  pyq_years_covered: z.array(z.number().int()),
  has_pyq_data: z.boolean().default(false),
  overall_observations: z.array(z.string()).default([]),
});

export type ComprehensiveAnalysisResult = z.infer<typeof ComprehensiveAnalysisResultSchema>;

// --- Personalized Study Plan Schema ---
export const StudyActivitySchema = z.object({
  id: z.string(),
  type: z.enum(["concept_review", "pyq_practice", "socratic_challenge", "revision"]),
  title: z.string(),
  description: z.string(),
  completed: z.boolean().default(false),
  pyq_reference: z.string().nullable().optional(),
});

export const StudyDayPlanSchema = z.object({
  day_number: z.number().int(),
  date: z.string(),
  topic: z.string(),
  priority: PriorityTierSchema,
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  activities: z.array(StudyActivitySchema),
});

export const PersonalizedStudyPlanSchema = z.object({
  days_until_exam: z.number().int(),
  exam_date: z.string(),
  daily_hours_target: z.number().default(2),
  schedule: z.array(StudyDayPlanSchema),
  summary: z.string(),
  has_pyq_data: z.boolean().default(false),
});

export type StudyActivity = z.infer<typeof StudyActivitySchema>;
export type StudyDayPlan = z.infer<typeof StudyDayPlanSchema>;
export type PersonalizedStudyPlan = z.infer<typeof PersonalizedStudyPlanSchema>;

// --- "Study Now" Recommendation Schema ---
export const StudyNowRecommendationSchema = z.object({
  topic: z.string(),
  unit_name: z.string().default("Unit 1"),
  priority: PriorityTierSchema,
  pyq_frequency: z.number().int(),
  years_appeared: z.array(z.number().int()),
  current_mastery: z.number(),
  urgency_score: z.number(),
  reason: z.string(),
  suggested_action: z.string(),
  relevant_pyq_sample: z.string().nullable().optional(),
  is_selected_goal: z.boolean().default(false),
});

export type StudyNowRecommendation = z.infer<typeof StudyNowRecommendationSchema>;

// --- Exam Entity Interfaces ---
export type ExamRecord = {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  exam_date: string;
  target_score: number | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ExamDashboardData = {
  exam: ExamRecord;
  days_until_exam: number;
  overall_mastery: number;
  topics_mastered_count: number;
  topics_improving_count: number;
  topics_attention_count: number;
  total_selected_topics: number;
  has_pyq_data: boolean;
  study_now: StudyNowRecommendation | null;
  high_priority_topics: Array<{
    topic: string;
    unit_name: string;
    priority: PriorityTier;
    pyq_count: number;
    years_appeared: number[];
    mastery: number;
    selected: boolean;
    evidence: string[];
    repeat_pattern: RepeatPattern;
  }>;
  all_topics: Array<{
    topic: string;
    unit_name: string;
    priority: PriorityTier;
    pyq_count: number;
    years_appeared: number[];
    mastery: number;
    selected: boolean;
    evidence: string[];
    repeat_pattern: RepeatPattern;
  }>;
  pyqs: Array<{
    id: string;
    year: number;
    question_text: string;
    marks: number | null;
    question_type: string;
    mapped_topic: string | null;
  }>;
  study_plan: PersonalizedStudyPlan | null;
};
