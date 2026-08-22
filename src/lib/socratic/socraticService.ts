import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { chatJson, AiError } from "@/lib/ai-gateway.server";
import { buildSocraticContext } from "./contextBuilder";
import { evaluateReasoningAndGenerateChallenge } from "./reasoningEvaluator";
import { evaluateStudentDefense } from "./defenseEvaluator";
import {
  recordMisconceptionIfDetected,
  resolveMisconceptionForSession,
  getStudentMisconceptions,
} from "./misconceptionEngine";
import {
  calculateSocraticMastery,
  updateTopicProgressMastery,
  type MasteryCalculationResult,
} from "./masteryEngine";
import type {
  InitialAnalysisResult,
  DefenseEvaluationResult,
  InstructorAnalyticsData,
  SocraticSession,
  SocraticStrictness,
  StudentMisconception,
} from "./types";

export class SocraticService {
  /**
   * Analyzes the student's initial answer and reasoning, determines understanding vs misconception,
   * autonomously generates a targeted Socratic challenge, and stores the session in database.
   */
  static async analyzeAnswerAndGenerateChallenge(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    topic: string;
    subject?: string | undefined;
    level?: string | undefined;
    questionId?: string | undefined;
    question: string;
    expectedConcept?: string | undefined;
    studentAnswer: string;
    studentReasoning: string;
    strictness?: SocraticStrictness | undefined;
  }): Promise<{
    session: SocraticSession;
    initialAnalysis: InitialAnalysisResult;
  }> {
    const {
      supabase,
      userId,
      topic,
      subject,
      level,
      questionId,
      question,
      expectedConcept,
      studentAnswer,
      studentReasoning,
      strictness = "balanced",
    } = params;

    if (!question.trim()) throw new Error("Question cannot be empty.");
    if (!studentAnswer.trim()) throw new Error("Student answer cannot be empty.");
    if (!studentReasoning.trim()) throw new Error("Please provide your reasoning/explanation.");

    // 1. Build rich context
    const context = await buildSocraticContext({
      supabase,
      userId,
      topic,
      subject,
      level,
      question,
      expectedConcept,
      studentAnswer,
      studentReasoning,
      strictness,
    });

    // 2. Perform AI reasoning evaluation and challenge generation
    const initialAnalysis = await evaluateReasoningAndGenerateChallenge(context);

    // 3. Insert initial session into database
    const { data: sessionRow, error: insertError } = await supabase
      .from("socratic_sessions")
      .insert({
        user_id: userId,
        topic,
        question_id: questionId || null,
        question,
        expected_concept: expectedConcept || initialAnalysis.expected_core_concept || topic,
        student_answer: studentAnswer,
        student_reasoning: studentReasoning,
        initial_analysis: initialAnalysis as unknown as never,
        challenge: initialAnalysis.challenge,
        challenge_type: initialAnalysis.challenge_type,
        challenge_difficulty: initialAnalysis.challenge_difficulty,
        misconception: initialAnalysis.misconception || null,
        mastery_before: context.currentMastery,
        mastery_after: context.currentMastery,
        strictness,
        status: "pending_defense",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating socratic session row:", insertError);
      throw new Error("Could not initialize Socratic session.");
    }

    const session = sessionRow as unknown as SocraticSession;

    // 4. Record misconception if detected
    if (initialAnalysis.misconception_detected) {
      await recordMisconceptionIfDetected({
        supabase,
        userId,
        topic,
        concept: session.expected_concept || topic,
        analysis: initialAnalysis,
        sessionId: session.id,
      });
    }

    return {
      session,
      initialAnalysis,
    };
  }

  /**
   * Evaluates the student's defense against the Socratic challenge, checks misconception resolution,
   * updates topic mastery in topic_progress, and marks the session completed.
   */
  static async evaluateDefenseAndRecalibrateState(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    sessionId: string;
    studentDefense: string;
    strictness?: SocraticStrictness | undefined;
  }): Promise<{
    session: SocraticSession;
    defenseEvaluation: DefenseEvaluationResult;
    masteryResult: MasteryCalculationResult;
  }> {
    const { supabase, userId, sessionId, studentDefense, strictness } = params;

    if (!studentDefense.trim()) {
      throw new Error("Please provide your defense or explanation to the Socratic challenge.");
    }

    // 1. Fetch existing session
    const { data: sessionData, error: fetchError } = await supabase
      .from("socratic_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !sessionData) {
      throw new Error("Socratic session not found.");
    }

    const session = sessionData as unknown as SocraticSession;

    // 2. Perform AI defense evaluation
    const defenseEvaluation = await evaluateStudentDefense({
      session,
      studentDefense,
      strictness: strictness || session.strictness || "balanced",
    });

    // 3. Update misconception status if resolved
    if (defenseEvaluation.misconception_status === "resolved") {
      await resolveMisconceptionForSession({
        supabase,
        userId,
        topic: session.topic,
        misconceptionText: session.misconception,
      });
    }

    // 4. Recalculate holistic mastery
    const initialAnalysis = session.initial_analysis as InitialAnalysisResult;
    const masteryResult = calculateSocraticMastery({
      previousMastery: session.mastery_before,
      initialAnalysis,
      defenseEvaluation,
      hasActiveMisconceptions: defenseEvaluation.misconception_status === "persists",
    });

    // 5. Update topic_progress table
    await updateTopicProgressMastery({
      supabase,
      userId,
      topic: session.topic,
      newMasteryScore: masteryResult.newMasteryScore,
      demonstratedScore: masteryResult.demonstratedScore,
    });

    // 6. Update socratic_sessions record
    const { data: updatedSession, error: updateError } = await supabase
      .from("socratic_sessions")
      .update({
        student_defense: studentDefense,
        defense_evaluation: defenseEvaluation as unknown as never,
        mastery_after: masteryResult.newMasteryScore,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating completed socratic session:", updateError);
    }

    return {
      session: (updatedSession as unknown as SocraticSession) || session,
      defenseEvaluation,
      masteryResult,
    };
  }

  /**
   * Generates a conceptual question for a topic for on-demand practice in the Socratic Arena.
   */
  static async generateConceptualQuestionForTopic(params: {
    subject: string;
    level: string;
    topic: string;
    mastery?: number | null | undefined;
  }): Promise<{
    question: string;
    options: string[];
    correctIndex: number;
    expectedConcept: string;
    explanation: string;
  }> {
    const { subject, level, topic, mastery } = params;

    const result = await chatJson<{
      question: string;
      options: string[];
      correct_index: number;
      expected_concept: string;
      explanation: string;
    }>([
      {
        role: "system",
        content: `You are an expert computer science educator. You create conceptual, mechanism-testing multiple choice questions.
The question must test genuine understanding, not rote memorization.
Respond with valid JSON only.`,
      },
      {
        role: "user",
        content: `Generate 1 deep conceptual question on the topic "${topic}" in ${subject} for a ${level} level student (current mastery: ${mastery ?? 50}%).
Return JSON with this exact shape:
{
  "question": "The question text testing a core conceptual mechanism",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0,
  "expected_concept": "The underlying invariant, algorithm property or theoretical concept being tested",
  "explanation": "Why the correct answer is right and what the core principle is"
}`,
      },
    ]);

    return {
      question: result.question,
      options: (result.options ?? []).slice(0, 4),
      correctIndex: Math.max(0, Math.min(3, Number(result.correct_index ?? 0))),
      expectedConcept: result.expected_concept || topic,
      explanation: result.explanation || "",
    };
  }

  /**
   * Retrieves student's Socratic session history.
   */
  static async getStudentHistory(params: {
    supabase: SupabaseClient<Database>;
    userId: string;
    limit?: number | undefined;
  }): Promise<SocraticSession[]> {
    const { supabase, userId, limit = 20 } = params;
    const { data, error } = await supabase
      .from("socratic_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching socratic history:", error);
      return [];
    }
    return (data as unknown as SocraticSession[]) ?? [];
  }

  /**
   * Aggregates instructor analytics data across all sessions and misconceptions.
   */
  static async getInstructorAnalytics(params: {
    supabase: SupabaseClient<Database>;
  }): Promise<InstructorAnalyticsData> {
    const { supabase } = params;

    // Fetch misconceptions
    const { data: misconceptions = [] } = await supabase
      .from("student_misconceptions")
      .select("*")
      .order("frequency", { ascending: false })
      .limit(100);

    // Group misconceptions by topic & misconception text
    const miscMap = new Map<
      string,
      {
        topic: string;
        concept: string;
        misconception: string;
        category: string;
        studentCount: number;
        resolvedCount: number;
        severity: "low" | "medium" | "high";
      }
    >();

    for (const m of (misconceptions as StudentMisconception[]) ?? []) {
      const key = `${m.topic}:::${m.misconception}`;
      const existing = miscMap.get(key);
      if (existing) {
        existing.studentCount += m.frequency || 1;
        if (m.resolved) existing.resolvedCount += 1;
      } else {
        miscMap.set(key, {
          topic: m.topic,
          concept: m.concept,
          misconception: m.misconception,
          category: m.category,
          studentCount: m.frequency || 1,
          resolvedCount: m.resolved ? 1 : 0,
          severity: m.severity,
        });
      }
    }

    const commonMisconceptions = Array.from(miscMap.values()).sort(
      (a, b) => b.studentCount - a.studentCount,
    );

    // Fetch sessions for difficult concepts & memorization analysis
    const { data: sessions = [] } = await supabase
      .from("socratic_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const socraticSessions = (sessions as unknown as SocraticSession[]) ?? [];

    // Difficult concepts ranking
    const topicStats = new Map<
      string,
      {
        totalMastery: number;
        totalDefenseQuality: number;
        misconceptionCount: number;
        count: number;
      }
    >();

    let totalEvaluations = 0;
    let correctAnswerWithStrongReasoning = 0;
    let correctAnswerWithWeakReasoning = 0;
    let incorrectWithMisconception = 0;

    for (const s of socraticSessions) {
      totalEvaluations += 1;
      const initial = s.initial_analysis as InitialAnalysisResult | undefined;
      const defense = s.defense_evaluation as DefenseEvaluationResult | undefined;

      const isCorrect = initial?.answer_status === "correct";
      const reasoningQual = initial?.reasoning_quality ?? 50;
      const defenseQual = defense?.defense_quality ?? 50;

      if (isCorrect && reasoningQual >= 65) {
        correctAnswerWithStrongReasoning += 1;
      } else if (isCorrect && reasoningQual < 65) {
        correctAnswerWithWeakReasoning += 1;
      }

      if (initial?.misconception_detected) {
        incorrectWithMisconception += 1;
      }

      const tKey = s.topic;
      const current = topicStats.get(tKey) ?? {
        totalMastery: 0,
        totalDefenseQuality: 0,
        misconceptionCount: 0,
        count: 0,
      };

      current.totalMastery += Number(s.mastery_after || 0);
      current.totalDefenseQuality += defenseQual;
      if (initial?.misconception_detected) current.misconceptionCount += 1;
      current.count += 1;
      topicStats.set(tKey, current);
    }

    const difficultConcepts = Array.from(topicStats.entries())
      .map(([topic, stat]) => ({
        topic,
        avgMastery: Math.round(stat.totalMastery / stat.count),
        avgDefenseQuality: Math.round(stat.totalDefenseQuality / stat.count),
        misconceptionRate: Math.round((stat.misconceptionCount / stat.count) * 100),
        totalChallenges: stat.count,
      }))
      .sort((a, b) => a.avgMastery - b.avgMastery || b.misconceptionRate - a.misconceptionRate);

    const totalCorrect = correctAnswerWithStrongReasoning + correctAnswerWithWeakReasoning;
    const memorizationRatio =
      totalCorrect > 0 ? Math.round((correctAnswerWithWeakReasoning / totalCorrect) * 100) : 0;

    return {
      commonMisconceptions: commonMisconceptions.slice(0, 15),
      difficultConcepts: difficultConcepts.slice(0, 10),
      memorizationVsUnderstanding: {
        totalEvaluations,
        correctAnswerWithStrongReasoning,
        correctAnswerWithWeakReasoning,
        incorrectWithMisconception,
        memorizationRatio,
      },
      recentSessions: socraticSessions.slice(0, 10),
    };
  }
}
