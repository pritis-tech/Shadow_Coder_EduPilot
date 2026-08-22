import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SocraticService } from "./socratic/socraticService";
import { getStudentMisconceptions } from "./socratic/misconceptionEngine";
import type {
  DefenseEvaluationResult,
  InitialAnalysisResult,
  InstructorAnalyticsData,
  SocraticSession,
  StudentMisconception,
} from "./socratic/types";
import type { MasteryCalculationResult } from "./socratic/masteryEngine";

export const generateSocraticQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        subject: z.string().min(1).max(80),
        level: z.string().min(1).max(30),
        topic: z.string().min(1).max(120),
        mastery: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{
    question: string;
    options: string[];
    correctIndex: number;
    expectedConcept: string;
    explanation: string;
  }> => {
    return await SocraticService.generateConceptualQuestionForTopic({
      subject: data.subject,
      level: data.level,
      topic: data.topic,
      mastery: data.mastery,
    });
  });

export const analyzeSocraticAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(1).max(120),
        subject: z.string().max(80).optional(),
        level: z.string().max(30).optional(),
        questionId: z.string().optional(),
        question: z.string().min(3).max(4000),
        expectedConcept: z.string().max(300).optional(),
        studentAnswer: z.string().min(1).max(4000),
        studentReasoning: z.string().min(1).max(4000),
        strictness: z.enum(["gentle", "balanced", "strict"]).default("balanced"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{
    session: SocraticSession;
    initialAnalysis: InitialAnalysisResult;
  }> => {
    const { supabase, userId } = context;
    return await SocraticService.analyzeAnswerAndGenerateChallenge({
      supabase,
      userId,
      topic: data.topic,
      subject: data.subject,
      level: data.level,
      questionId: data.questionId,
      question: data.question,
      expectedConcept: data.expectedConcept,
      studentAnswer: data.studentAnswer,
      studentReasoning: data.studentReasoning,
      strictness: data.strictness,
    });
  });

export const submitSocraticDefense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        studentDefense: z.string().min(1).max(4000),
        strictness: z.enum(["gentle", "balanced", "strict"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{
    session: SocraticSession;
    defenseEvaluation: DefenseEvaluationResult;
    masteryResult: MasteryCalculationResult;
  }> => {
    const { supabase, userId } = context;
    return await SocraticService.evaluateDefenseAndRecalibrateState({
      supabase,
      userId,
      sessionId: data.sessionId,
      studentDefense: data.studentDefense,
      strictness: data.strictness,
    });
  });

export const getSocraticHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional().parse(input),
  )
  .handler(async ({ data, context }): Promise<SocraticSession[]> => {
    const { supabase, userId } = context;
    return await SocraticService.getStudentHistory({
      supabase,
      userId,
      limit: data?.limit ?? 20,
    });
  });

export const getStudentMisconceptionsList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ topic: z.string().optional() }).optional().parse(input),
  )
  .handler(async ({ data, context }): Promise<{
    active: StudentMisconception[];
    resolved: StudentMisconception[];
  }> => {
    const { supabase, userId } = context;
    return await getStudentMisconceptions({
      supabase,
      userId,
      topic: data?.topic,
    });
  });

export const getInstructorAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InstructorAnalyticsData> => {
    const { supabase } = context;
    return await SocraticService.getInstructorAnalytics({ supabase });
  });
