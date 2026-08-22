import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { statusFor, type ProgressStatus } from "@/lib/edupilot-types";
import type { DefenseEvaluationResult, InitialAnalysisResult } from "./types";

export type MasteryCalculationInput = {
  previousMastery: number | null | undefined;
  initialAnalysis: InitialAnalysisResult;
  defenseEvaluation: DefenseEvaluationResult;
  hasActiveMisconceptions?: boolean;
};

export type MasteryCalculationResult = {
  demonstratedScore: number;
  newMasteryScore: number;
  status: ProgressStatus;
  masteryDelta: number;
  breakdown: {
    answerCorrectnessScore: number;
    reasoningQualityScore: number;
    defenseQualityScore: number;
    conceptualUnderstandingScore: number;
  };
};

/**
 * Calculates holistic mastery from a Socratic challenge interaction using a weighted rubric.
 * Weights:
 * - Answer Correctness: 25%
 * - Initial Reasoning Quality: 25%
 * - Defense Quality: 30%
 * - Conceptual Understanding: 20%
 */
export function calculateSocraticMastery(input: MasteryCalculationInput): MasteryCalculationResult {
  const { previousMastery, initialAnalysis, defenseEvaluation, hasActiveMisconceptions } = input;

  // 1. Calculate component scores
  let answerCorrectnessScore = 0;
  if (initialAnalysis.answer_status === "correct") {
    answerCorrectnessScore = 100;
  } else if (initialAnalysis.answer_status === "partially_correct") {
    answerCorrectnessScore = 60;
  } else if (initialAnalysis.answer_status === "unclear") {
    answerCorrectnessScore = 30;
  } else {
    answerCorrectnessScore = 0;
  }

  const reasoningQualityScore = initialAnalysis.reasoning_quality;
  const defenseQualityScore = defenseEvaluation.defense_quality;
  const conceptualUnderstandingScore = defenseEvaluation.conceptual_understanding;

  // 2. Weighted demonstrated score
  let demonstratedScore =
    answerCorrectnessScore * 0.25 +
    reasoningQualityScore * 0.25 +
    defenseQualityScore * 0.3 +
    conceptualUnderstandingScore * 0.2;

  // Anti-memorization rule:
  // If student got correct answer (100) but reasoning (<40) and defense (<40) are weak,
  // demonstrated score must be capped to prevent unearned mastery.
  if (
    initialAnalysis.answer_status === "correct" &&
    reasoningQualityScore < 45 &&
    defenseQualityScore < 45
  ) {
    demonstratedScore = Math.min(demonstratedScore, 48);
  }

  // If misconception persists after defense, apply a damping penalty
  if (defenseEvaluation.misconception_status === "persists" || hasActiveMisconceptions) {
    demonstratedScore = Math.max(10, demonstratedScore - 8);
  }

  // If misconception was explicitly resolved with strong defense, award bonus
  if (defenseEvaluation.misconception_status === "resolved" && defenseQualityScore >= 70) {
    demonstratedScore = Math.min(100, demonstratedScore + 6);
  }

  demonstratedScore = Math.round(Math.max(0, Math.min(100, demonstratedScore)));

  // 3. Blend with previous mastery (40% previous, 60% newest demonstrated interaction)
  let newMasteryScore: number;
  if (previousMastery === null || previousMastery === undefined) {
    newMasteryScore = demonstratedScore;
  } else {
    newMasteryScore = Math.round(previousMastery * 0.4 + demonstratedScore * 0.6);
  }

  newMasteryScore = Math.max(0, Math.min(100, newMasteryScore));
  const masteryDelta =
    previousMastery !== null && previousMastery !== undefined
      ? newMasteryScore - previousMastery
      : newMasteryScore;

  const status = statusFor(newMasteryScore);

  return {
    demonstratedScore,
    newMasteryScore,
    status,
    masteryDelta,
    breakdown: {
      answerCorrectnessScore,
      reasoningQualityScore,
      defenseQualityScore,
      conceptualUnderstandingScore,
    },
  };
}

/**
 * Persists updated mastery to the existing topic_progress table.
 */
export async function updateTopicProgressMastery(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  topic: string;
  newMasteryScore: number;
  demonstratedScore: number;
}): Promise<{ masteryScore: number; status: ProgressStatus; attempts: number }> {
  const { supabase, userId, topic, newMasteryScore, demonstratedScore } = params;

  // 1. Fetch existing topic progress
  const { data: existing } = await supabase
    .from("topic_progress")
    .select("attempts, mastery_score")
    .eq("user_id", userId)
    .eq("topic", topic)
    .maybeSingle();

  const currentAttempts = existing?.attempts ?? 0;
  const status = statusFor(newMasteryScore);

  // 2. Upsert topic progress
  const { error } = await supabase.from("topic_progress").upsert(
    {
      user_id: userId,
      topic,
      mastery_score: newMasteryScore,
      status,
      attempts: currentAttempts + 1,
      last_score: demonstratedScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic" },
  );

  if (error) {
    console.error("Failed to update topic progress with Socratic mastery:", error);
  }

  return {
    masteryScore: newMasteryScore,
    status,
    attempts: currentAttempts + 1,
  };
}
