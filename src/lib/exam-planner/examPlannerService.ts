import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { extractDocumentText } from "./documentExtractor";
import { parseSyllabusDocument } from "./syllabusParser";
import { parsePyqDocument } from "./pyqParser";
import { analyzeSyllabusAndPyqs } from "./pyqAnalysisEngine";
import { generatePersonalizedStudyPlan } from "./studyPlanEngine";
import { calculateWhatShouldIStudyNow } from "./studyNowEngine";
import {
  type ExamRecord,
  type ExamDashboardData,
  type TopicAnalysisItem,
  type PyqQuestionItem,
  type SyllabusTopicItem,
  type PersonalizedStudyPlan,
  type PriorityTier,
  type RepeatPattern,
} from "./types";

function formatSupabaseError(error: { message?: string; code?: string } | null, contextAction: string): string {
  if (!error) return `${contextAction} failed: Unknown error`;
  if (error.code === "PGRST205" || error.message?.includes("schema cache")) {
    return `${contextAction} failed: Supabase table not found in schema cache. Please execute 'supabase/COMPLETE_MIGRATION.sql' in your Supabase Dashboard SQL Editor to initialize the database tables.`;
  }
  return `${contextAction} failed: ${error.message || "Unknown error"}`;
}

export class ExamPlannerService {
  /**
   * Creates a new Exam record.
   */
  static async createExam(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    name: string;
    subject: string;
    examDate: string;
    targetScore?: number | null | undefined;
  }): Promise<ExamRecord> {
    const { supabase, userId, name, subject, examDate, targetScore = 90 } = params;

    if (!name.trim()) throw new Error("Exam name cannot be empty.");
    if (!subject.trim()) throw new Error("Subject cannot be empty.");
    if (!examDate) throw new Error("Exam date is required.");

    const { data, error } = await supabase
      .from("exams")
      .insert({
        user_id: userId,
        name: name.trim(),
        subject: subject.trim(),
        exam_date: examDate,
        target_score: targetScore,
        status: "active",
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(formatSupabaseError(error, "Failed to create exam"));
    }

    return data as unknown as ExamRecord;
  }

  /**
   * Processes uploaded syllabus and PYQ documents, performs AI analysis, and saves the full mastery planner structure.
   */
  static async processAndAnalyzeExamDocuments(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    examId: string;
    subject: string;
    examDate: string;
    syllabusDoc: { fileName: string; content: string };
    pyqDocs?: Array<{ fileName: string; year: number; content: string }> | undefined;
    initialSelectedTopics?: string[] | undefined;
  }): Promise<ExamDashboardData> {
    const { supabase, userId, examId, subject, examDate, syllabusDoc, pyqDocs = [], initialSelectedTopics } = params;

    if (!syllabusDoc || !syllabusDoc.content) {
      throw new Error("Syllabus document is required.");
    }

    // 1. Extract syllabus text
    const extractedSyllabus = await extractDocumentText({
      fileName: syllabusDoc.fileName,
      fileType: "syllabus",
      content: syllabusDoc.content,
    });

    // 2. Parse syllabus topics
    const parsedSyllabus = await parseSyllabusDocument({
      subject,
      rawText: extractedSyllabus.rawText,
    });

    // Save uploaded syllabus document
    const { error: docError } = await supabase.from("uploaded_documents").insert({
      exam_id: examId,
      user_id: userId,
      file_name: syllabusDoc.fileName,
      file_type: "syllabus",
      extracted_text: extractedSyllabus.rawText,
    });
    if (docError) throw new Error(formatSupabaseError(docError, "Saving syllabus document"));

    // Save syllabus topics
    const syllabusInserts = parsedSyllabus.flat_topics.map((t) => ({
      exam_id: examId,
      user_id: userId,
      unit_name: t.unit_name,
      chapter_name: t.chapter_name || null,
      topic: t.topic,
      subtopics: t.subtopics as unknown as never,
      weightage: t.weightage || null,
    }));

    if (syllabusInserts.length > 0) {
      const { error: sTopicsError } = await supabase.from("syllabus_topics").insert(syllabusInserts);
      if (sTopicsError) throw new Error(formatSupabaseError(sTopicsError, "Saving syllabus topics"));
    }

    // 3. Extract & parse all PYQs if provided
    const allExtractedPyqs: PyqQuestionItem[] = [];
    const yearsCovered: number[] = [];

    const validPyqs = (pyqDocs ?? []).filter((p) => p && p.content && p.content.trim().length > 0);

    for (const pyq of validPyqs) {
      try {
        const extractedPyq = await extractDocumentText({
          fileName: pyq.fileName,
          fileType: "pyq",
          pyqYear: pyq.year,
          content: pyq.content,
        });

        // Save uploaded PYQ document
        await supabase.from("uploaded_documents").insert({
          exam_id: examId,
          user_id: userId,
          file_name: pyq.fileName,
          file_type: "pyq",
          pyq_year: pyq.year,
          extracted_text: extractedPyq.rawText,
        });

        const parsedPyq = await parsePyqDocument({
          year: pyq.year,
          subject,
          rawText: extractedPyq.rawText,
          syllabusTopics: parsedSyllabus.flat_topics,
        });

        yearsCovered.push(pyq.year);
        allExtractedPyqs.push(...parsedPyq.questions);

        // Save pyq questions
        const pyqInserts = parsedPyq.questions.map((q) => ({
          exam_id: examId,
          user_id: userId,
          year: q.year,
          question_text: q.question_text,
          marks: q.marks || null,
          question_type: q.question_type,
          mapped_topic: q.suggested_topic,
        }));

        if (pyqInserts.length > 0) {
          await supabase.from("pyq_questions").insert(pyqInserts);
        }
      } catch (pyqErr) {
        console.warn(`Could not process PYQ paper ${pyq.fileName} (${pyq.year}):`, pyqErr);
      }
    }

    // 4. Run PYQ / Syllabus Analysis Engine
    const analysisResult = analyzeSyllabusAndPyqs({
      syllabusTopics: parsedSyllabus.flat_topics,
      pyqQuestions: allExtractedPyqs,
      yearsCovered,
    });

    // Save topic_pyq_analysis
    const analysisInserts = analysisResult.topics.map((t) => ({
      exam_id: examId,
      user_id: userId,
      topic: t.topic,
      unit_name: t.unit_name,
      pyq_count: t.pyq_count,
      years_appeared: t.years_appeared as unknown as never,
      repeat_pattern: t.repeat_pattern,
      priority: t.priority,
      priority_reason: t.priority_reason,
      evidence: t.evidence as unknown as never,
      estimated_difficulty: t.estimated_difficulty,
    }));

    if (analysisInserts.length > 0) {
      const { error: analysisError } = await supabase.from("topic_pyq_analysis").upsert(analysisInserts, {
        onConflict: "exam_id,topic",
      });
      if (analysisError) throw new Error(formatSupabaseError(analysisError, "Saving topic analysis"));
    }

    // 5. Initialize topic selections (honor initialSelectedTopics if provided, or select all)
    const selectionInserts = analysisResult.topics.map((t) => {
      const isSelected = initialSelectedTopics && initialSelectedTopics.length > 0
        ? initialSelectedTopics.some((st) => st.toLowerCase() === t.topic.toLowerCase())
        : true;
      return {
        exam_id: examId,
        user_id: userId,
        topic: t.topic,
        selected: isSelected,
      };
    });

    if (selectionInserts.length > 0) {
      const { error: selError } = await supabase.from("student_topic_selections").upsert(selectionInserts, {
        onConflict: "exam_id,user_id,topic",
      });
      if (selError) throw new Error(formatSupabaseError(selError, "Saving topic selections"));
    }

    // 6. Fetch topic progress to compute current mastery
    const { data: progressRows } = await supabase
      .from("topic_progress")
      .select("topic, mastery_score")
      .eq("user_id", userId);

    const masteryMap = new Map<string, number>();
    for (const p of progressRows ?? []) {
      masteryMap.set(p.topic.toLowerCase(), Number(p.mastery_score));
    }

    // 7. Generate Personalized Study Plan
    const selectedNames = selectionInserts.filter((s) => s.selected).map((s) => s.topic);
    const studyPlan = generatePersonalizedStudyPlan({
      examDate,
      selectedTopics: selectedNames.length > 0 ? selectedNames : analysisResult.topics.map((t) => t.topic),
      topicAnalysis: analysisResult.topics,
      topicMasteryMap: masteryMap,
    });

    // Save study plan
    const { error: planError } = await supabase.from("exam_study_plans").upsert(
      {
        exam_id: examId,
        user_id: userId,
        days_until_exam: studyPlan.days_until_exam,
        plan_schedule: studyPlan as unknown as never,
      },
      { onConflict: "exam_id,user_id" },
    );
    if (planError) throw new Error(formatSupabaseError(planError, "Saving exam study plan"));

    return await this.getExamDashboardData({ supabase, userId, examId });
  }

  /**
   * Retrieves comprehensive dashboard data for the active exam.
   */
  static async getExamDashboardData(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    examId?: string | undefined;
  }): Promise<ExamDashboardData> {
    const { supabase, userId, examId } = params;

    // 1. Get Exam Record
    let examQuery = supabase
      .from("exams")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (examId) {
      examQuery = examQuery.eq("id", examId);
    }

    const { data: exams, error: examError } = await examQuery.limit(1);

    if (examError || !exams || exams.length === 0 || !exams[0]) {
      throw new Error("No active exam found. Please set up your exam first.");
    }

    const exam = exams[0] as unknown as ExamRecord;

    // 2. Fetch topic PYQ analysis
    const { data: analysisRows = [] } = await supabase
      .from("topic_pyq_analysis")
      .select("*")
      .eq("exam_id", exam.id)
      .order("pyq_count", { ascending: false });

    // 3. Fetch topic selections
    const { data: selectionRows = [] } = await supabase
      .from("student_topic_selections")
      .select("topic, selected")
      .eq("exam_id", exam.id)
      .eq("user_id", userId);

    const selectionMap = new Map<string, boolean>();
    for (const s of selectionRows ?? []) {
      selectionMap.set(s.topic.toLowerCase(), s.selected);
    }

    // 4. Fetch PYQs
    const { data: pyqRows = [] } = await supabase
      .from("pyq_questions")
      .select("*")
      .eq("exam_id", exam.id)
      .order("year", { ascending: false });

    const hasPyqData = Boolean(pyqRows && pyqRows.length > 0);

    // 5. Fetch Topic Mastery from topic_progress
    const { data: progressRows = [] } = await supabase
      .from("topic_progress")
      .select("topic, mastery_score")
      .eq("user_id", userId);

    const masteryMap = new Map<string, number>();
    for (const p of progressRows ?? []) {
      masteryMap.set(p.topic.toLowerCase(), Number(p.mastery_score));
    }

    // 6. Fetch Study Plan
    const { data: planRows = [] } = await supabase
      .from("exam_study_plans")
      .select("*")
      .eq("exam_id", exam.id)
      .eq("user_id", userId)
      .limit(1);

    let studyPlan: PersonalizedStudyPlan | null = null;
    const firstPlan = planRows && planRows.length > 0 ? planRows[0] : null;
    if (firstPlan && firstPlan.plan_schedule) {
      studyPlan = firstPlan.plan_schedule as unknown as PersonalizedStudyPlan;
    }

    // Map all topics
    const allTopics = (analysisRows ?? []).map((row) => {
      const topic = row.topic;
      const key = topic.toLowerCase();
      const mastery = Math.round(masteryMap.get(key) ?? 0);
      const isSelected = selectionMap.has(key) ? Boolean(selectionMap.get(key)) : true;
      const evidence = Array.isArray(row.evidence) ? (row.evidence as string[]) : [];
      const yearsAppeared = Array.isArray(row.years_appeared) ? (row.years_appeared as number[]) : [];

      return {
        topic,
        unit_name: row.unit_name || "Unit 1",
        priority: row.priority as PriorityTier,
        pyq_count: row.pyq_count,
        years_appeared: yearsAppeared,
        mastery,
        selected: isSelected,
        evidence,
        repeat_pattern: row.repeat_pattern as RepeatPattern,
      };
    });

    const highPriorityTopics = allTopics.filter((t) => t.priority === "high");

    // Dynamic countdown
    const now = new Date();
    const examDateObj = new Date(exam.exam_date);
    const daysUntilExam = Math.max(0, Math.ceil((examDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate Overall Mastery
    const selectedTopicsList = allTopics.filter((t) => t.selected);
    const overallMastery = selectedTopicsList.length > 0
      ? Math.round(selectedTopicsList.reduce((acc, t) => acc + t.mastery, 0) / selectedTopicsList.length)
      : 0;

    const masteredCount = selectedTopicsList.filter((t) => t.mastery >= 80).length;
    const improvingCount = selectedTopicsList.filter((t) => t.mastery >= 60 && t.mastery < 80).length;
    const attentionCount = selectedTopicsList.filter((t) => t.mastery < 60).length;

    // Calculate "Study Now" Recommendation
    const analysisItems: TopicAnalysisItem[] = (analysisRows ?? []).map((row) => ({
      topic: row.topic,
      unit_name: row.unit_name || "Unit 1",
      pyq_count: row.pyq_count,
      years_appeared: Array.isArray(row.years_appeared) ? (row.years_appeared as number[]) : [],
      repeat_pattern: row.repeat_pattern as RepeatPattern,
      priority: row.priority as PriorityTier,
      priority_reason: row.priority_reason || "",
      evidence: Array.isArray(row.evidence) ? (row.evidence as string[]) : [],
      estimated_difficulty: (row.estimated_difficulty as "easy" | "medium" | "hard") || "medium",
      related_pyqs: (pyqRows ?? [])
        .filter((q) => q.mapped_topic?.toLowerCase() === row.topic.toLowerCase())
        .map((q) => ({
          year: q.year,
          question_text: q.question_text,
          marks: q.marks,
          question_type: (q.question_type as "short" | "long" | "numerical" | "conceptual") || "long",
          suggested_topic: q.mapped_topic || row.topic,
          tested_concept: "Core mechanism",
        })),
    }));

    const studyNow = calculateWhatShouldIStudyNow({
      examDate: exam.exam_date,
      topicAnalysis: analysisItems,
      topicMasteryMap: masteryMap,
      selectedTopics: selectedTopicsList.map((t) => t.topic),
    });

    return {
      exam,
      days_until_exam: daysUntilExam,
      overall_mastery: overallMastery,
      topics_mastered_count: masteredCount,
      topics_improving_count: improvingCount,
      topics_attention_count: attentionCount,
      total_selected_topics: selectedTopicsList.length,
      has_pyq_data: hasPyqData,
      study_now: studyNow,
      high_priority_topics: highPriorityTopics,
      all_topics: allTopics,
      pyqs: (pyqRows ?? []).map((q) => ({
        id: q.id,
        year: q.year,
        question_text: q.question_text,
        marks: q.marks,
        question_type: q.question_type,
        mapped_topic: q.mapped_topic,
      })),
      study_plan: studyPlan,
    };
  }

  /**
   * Toggles whether a topic is selected by the student for exam mastery and refreshes the study plan.
   */
  static async toggleTopicSelection(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    examId: string;
    topic: string;
    selected: boolean;
  }): Promise<void> {
    const { supabase, userId, examId, topic, selected } = params;

    await supabase.from("student_topic_selections").upsert(
      {
        exam_id: examId,
        user_id: userId,
        topic,
        selected,
      },
      { onConflict: "exam_id,user_id,topic" },
    );
  }

  /**
   * Regenerates a fresh personalized study plan for the exam.
   */
  static async regenerateStudyPlan(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    examId: string;
  }): Promise<PersonalizedStudyPlan> {
    const { supabase, userId, examId } = params;

    const data = await this.getExamDashboardData({ supabase, userId, examId });
    const selectedTopicNames = data.all_topics.filter((t) => t.selected).map((t) => t.topic);

    const masteryMap = new Map<string, number>();
    for (const t of data.all_topics) {
      masteryMap.set(t.topic.toLowerCase(), t.mastery);
    }

    const analysisItems: TopicAnalysisItem[] = data.all_topics.map((t) => ({
      topic: t.topic,
      unit_name: t.unit_name,
      pyq_count: t.pyq_count,
      years_appeared: t.years_appeared,
      repeat_pattern: t.repeat_pattern,
      priority: t.priority,
      priority_reason: "",
      evidence: t.evidence,
      estimated_difficulty: "medium",
      related_pyqs: [],
    }));

    const freshPlan = generatePersonalizedStudyPlan({
      examDate: data.exam.exam_date,
      selectedTopics: selectedTopicNames,
      topicAnalysis: analysisItems,
      topicMasteryMap: masteryMap,
    });

    await supabase.from("exam_study_plans").upsert(
      {
        exam_id: examId,
        user_id: userId,
        days_until_exam: freshPlan.days_until_exam,
        plan_schedule: freshPlan as unknown as never,
      },
      { onConflict: "exam_id,user_id" },
    );

    return freshPlan;
  }
}
