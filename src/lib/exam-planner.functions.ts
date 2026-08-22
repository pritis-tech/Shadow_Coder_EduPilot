import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ExamPlannerService } from "./exam-planner/examPlannerService";
import type { ExamDashboardData, ExamRecord, PersonalizedStudyPlan } from "./exam-planner/types";

export const createExamSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(120),
        subject: z.string().min(1).max(100),
        examDate: z.string().min(4).max(30),
        targetScore: z.number().min(0).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ExamRecord> => {
    const { supabase, userId } = context;
    return await ExamPlannerService.createExam({
      supabase,
      userId,
      name: data.name,
      subject: data.subject,
      examDate: data.examDate,
      targetScore: data.targetScore,
    });
  });

export const processExamMaterials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        examId: z.string().uuid(),
        subject: z.string().min(1).max(100),
        examDate: z.string().min(4).max(30),
        syllabusDoc: z.object({
          fileName: z.string().min(1),
          content: z.string().min(10),
        }),
        pyqDocs: z
          .array(
            z.object({
              fileName: z.string().min(1),
              year: z.number().int().min(2000).max(2100),
              content: z.string().min(10),
            }),
          )
          .default([]),
        initialSelectedTopics: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ExamDashboardData> => {
    const { supabase, userId } = context;
    return await ExamPlannerService.processAndAnalyzeExamDocuments({
      supabase,
      userId,
      examId: data.examId,
      subject: data.subject,
      examDate: data.examDate,
      syllabusDoc: data.syllabusDoc,
      pyqDocs: data.pyqDocs,
      initialSelectedTopics: data.initialSelectedTopics,
    });
  });

export const getExamDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ examId: z.string().uuid().optional() }).optional().parse(input),
  )
  .handler(async ({ data, context }): Promise<ExamDashboardData> => {
    const { supabase, userId } = context;
    return await ExamPlannerService.getExamDashboardData({
      supabase,
      userId,
      examId: data?.examId,
    });
  });

export const toggleTopicSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        examId: z.string().uuid(),
        topic: z.string().min(1),
        selected: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ success: boolean }> => {
    const { supabase, userId } = context;
    await ExamPlannerService.toggleTopicSelection({
      supabase,
      userId,
      examId: data.examId,
      topic: data.topic,
      selected: data.selected,
    });
    return { success: true };
  });

export const regenerateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ examId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PersonalizedStudyPlan> => {
    const { supabase, userId } = context;
    return await ExamPlannerService.regenerateStudyPlan({
      supabase,
      userId,
      examId: data.examId,
    });
  });
