import { chatJson, AiError } from "@/lib/ai-gateway.server";
import {
  DefenseEvaluationSchema,
  type DefenseEvaluationResult,
  type SocraticSession,
  type SocraticStrictness,
} from "./types";

export async function evaluateStudentDefense(params: {
  session: SocraticSession;
  studentDefense: string;
  strictness?: SocraticStrictness;
}): Promise<DefenseEvaluationResult> {
  const { session, studentDefense, strictness = session.strictness || "balanced" } = params;

  const systemPrompt = `You are EduPilot's Senior AI Socratic Evaluator.
A student was posed an initial question, gave an initial answer and explanation, received a targeted Socratic Challenge, and has now submitted their DEFENSE.

Your responsibility is to critically evaluate whether their defense demonstrates TRUE UNDERSTANDING or superficial memorization.

Evaluation Dimensions:
1. Reasoning: Did the student logically and soundly explain the mechanism?
2. Conceptual Understanding: Does the student grasp the invariant, mathematical, or algorithmic principle?
3. Logical Consistency: Does their defense stay logically consistent with or refine their original answer without self-contradiction?
4. Challenge Addressal: Did they directly answer the specific Socratic challenge (e.g. why counterexample failed, why comparison differed)?
5. Misconception Resolution: If a misconception was previously identified ("${session.misconception || "None"}"), did their defense successfully resolve it, or does it persist?
6. Transfer & Synthesis: Can they explain the idea in their own words beyond regurgitating textbook definitions? (DO NOT penalize for lack of exact keywords; reward equivalent valid reasoning).

Strictness Setting:
- "GENTLE": Give generous credit for intuition and partial explanations; provide warm scaffolding.
- "BALANCED": Standard academic rigor; balance clarity and correctness.
- "STRICT": Demand formal proofs, precise boundary conditions, and zero hand-waving.

Return JSON matching this exact structure:
{
  "defense_quality": number between 0 and 100,
  "conceptual_understanding": number between 0 and 100,
  "logical_consistency": number between 0 and 100,
  "addressed_challenge": boolean,
  "misconception_status": "resolved" | "persists" | "none",
  "mastery_score": number between 0 and 100 (demonstrated mastery in this interaction),
  "mastery_delta": number between -40 and +40 (relative mastery change),
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific gap 1", "specific gap 2"],
  "feedback": "2-3 sentences of direct, actionable feedback explaining why their defense succeeded or fell short",
  "next_recommendation": "One clear next recommendation for their learning roadmap",
  "suggested_next_difficulty": "easy" | "medium" | "hard"
}`;

  const userPrompt = `Topic: "${session.topic}"
Original Question: "${session.question}"
Expected Core Concept: "${session.expected_concept || session.topic}"
Student's Initial Answer: "${session.student_answer}"
Student's Initial Reasoning: "${session.student_reasoning}"
AI Initial Analysis: Status=${session.initial_analysis?.answer_status}, Quality=${session.initial_analysis?.reasoning_quality}%
Prior Misconception (if any): "${session.misconception || "None detected"}"

Generated Socratic Challenge: "${session.challenge}" (Type: ${session.challenge_type}, Difficulty: ${session.challenge_difficulty})

Student's Submitted Defense: "${studentDefense}"
Strictness Mode: ${strictness.toUpperCase()}`;

  try {
    const rawResult = await chatJson<Record<string, unknown>>([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const validated = DefenseEvaluationSchema.safeParse(rawResult);
    if (!validated.success) {
      console.warn("Socratic defense evaluation validation warning, falling back safely:", validated.error);
      return sanitizeDefenseEvaluation(rawResult);
    }

    return validated.data;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      `AI defense evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      502,
    );
  }
}

function sanitizeDefenseEvaluation(raw: Record<string, unknown>): DefenseEvaluationResult {
  const defenseQuality = Math.max(
    0,
    Math.min(100, typeof raw["defense_quality"] === "number" ? raw["defense_quality"] : 50),
  );
  const conceptualUnderstanding = Math.max(
    0,
    Math.min(100, typeof raw["conceptual_understanding"] === "number" ? raw["conceptual_understanding"] : 50),
  );
  const logicalConsistency = Math.max(
    0,
    Math.min(100, typeof raw["logical_consistency"] === "number" ? raw["logical_consistency"] : 50),
  );

  const misconceptionStatus =
    raw["misconception_status"] === "resolved" ||
    raw["misconception_status"] === "persists" ||
    raw["misconception_status"] === "none"
      ? raw["misconception_status"]
      : "none";

  const masteryScore = Math.max(
    0,
    Math.min(100, typeof raw["mastery_score"] === "number" ? raw["mastery_score"] : Math.round(defenseQuality * 0.8 + 10)),
  );

  const masteryDelta = Math.max(
    -50,
    Math.min(50, typeof raw["mastery_delta"] === "number" ? raw["mastery_delta"] : 0),
  );

  return {
    defense_quality: defenseQuality,
    conceptual_understanding: conceptualUnderstanding,
    logical_consistency: logicalConsistency,
    addressed_challenge: typeof raw["addressed_challenge"] === "boolean" ? raw["addressed_challenge"] : true,
    misconception_status: misconceptionStatus,
    mastery_score: masteryScore,
    mastery_delta: masteryDelta,
    strengths: Array.isArray(raw["strengths"]) ? raw["strengths"].filter((s): s is string => typeof s === "string") : [],
    weaknesses: Array.isArray(raw["weaknesses"]) ? raw["weaknesses"].filter((w): w is string => typeof w === "string") : [],
    feedback:
      typeof raw["feedback"] === "string" && raw["feedback"].length >= 5
        ? raw["feedback"]
        : "Your defense has been evaluated and your mastery score has been updated.",
    next_recommendation:
      typeof raw["next_recommendation"] === "string" && raw["next_recommendation"].length >= 5
        ? raw["next_recommendation"]
        : "Continue practicing with adaptive Socratic challenges to solidify your understanding.",
    suggested_next_difficulty:
      raw["suggested_next_difficulty"] === "easy" ||
      raw["suggested_next_difficulty"] === "medium" ||
      raw["suggested_next_difficulty"] === "hard"
        ? raw["suggested_next_difficulty"]
        : "medium",
  };
}
