import { chatJson, AiError } from "@/lib/ai-gateway.server";
import { formatContextForPrompt } from "./contextBuilder";
import {
  InitialAnalysisSchema,
  type InitialAnalysisResult,
  type SocraticContext,
  CHALLENGE_TYPES,
} from "./types";

export async function evaluateReasoningAndGenerateChallenge(
  context: SocraticContext,
): Promise<InitialAnalysisResult> {
  const promptContext = formatContextForPrompt(context);

  const systemPrompt = `You are EduPilot's Senior AI Socratic Interrogator and Diagnostic Evaluator.
Your goal is to determine if the student ACTUALLY UNDERSTANDS the underlying computer science/academic concept, or if they are merely guessing, memorizing keywords, or harboring fundamental misconceptions.

You must perform genuine autonomous contextual evaluation:
1. Analyze the student's final answer and their explicit reasoning.
2. Distinguish between:
   - Strong reasoning with solid conceptual understanding.
   - Correct answer but weak/superficial/memorized reasoning.
   - Incomplete/partial understanding (missing a critical logical step).
   - Specific misconception or false assumption.
   - Completely flawed or incorrect understanding.
3. If a misconception is detected, categorize it into one of:
   ["conceptual_misunderstanding", "incorrect_assumption", "missing_prerequisite", "terminology_confusion", "logical_reasoning_error", "partial_understanding", "overgeneralization"]
4. Autonomously generate exactly ONE high-impact, non-generic Socratic Challenge directly derived from their reasoning:
   - For Strong reasoning: Challenge with a deep edge case, counterexample, comparison (e.g., comparing Binary Search with Merge Sort or ternary search), or boundary condition.
   - For Partial understanding: Target the specific missing reasoning link (e.g. why repeated halving mathematically yields log n).
   - For Misconceptions: Provide a targeted scenario or counterexample that directly reveals the flaw in their assumption.
   - For Repeated failures / low mastery: Ground the challenge in foundational concepts with gentle scaffolding.
5. Calibrate the challenge difficulty:
   - "hard": For strong students or under "strict" mode.
   - "medium": For standard balanced challenges.
   - "easy": For remedial guidance or under "gentle" mode.
6. Challenge Type MUST be one of:
   ["why", "how", "counterexample", "comparison", "edge_case", "alternative_scenario", "prediction", "explain_difference", "assumption_challenge", "consequence_question"]

Strictness Setting:
- "GENTLE": Provide supportive phrasing, more hints, and accessible conceptual questions.
- "BALANCED": Standard rigorous academic interrogation.
- "STRICT": Highly demanding, zero leniency for hand-waving, counterexamples with stringent requirements.

Return JSON matching this exact structure:
{
  "answer_status": "correct" | "partially_correct" | "incorrect" | "unclear",
  "reasoning_quality": number between 0 and 100,
  "conceptual_understanding": number between 0 and 100,
  "misconception_detected": boolean,
  "misconception": string describing the misconception or null,
  "misconception_category": "conceptual_misunderstanding" | "incorrect_assumption" | "missing_prerequisite" | "terminology_confusion" | "logical_reasoning_error" | "partial_understanding" | "overgeneralization" | null,
  "misconception_severity": "low" | "medium" | "high" | null,
  "challenge_type": "why" | "how" | "counterexample" | "comparison" | "edge_case" | "alternative_scenario" | "prediction" | "explain_difference" | "assumption_challenge" | "consequence_question",
  "challenge": "A concise, thought-provoking Socratic challenge question",
  "challenge_difficulty": "easy" | "medium" | "hard",
  "confidence": number between 0 and 100,
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "feedback": "Honest, constructive analysis of their reasoning",
  "expected_core_concept": "Summary of the core concept tested"
}`;

  try {
    const rawResult = await chatJson<Record<string, unknown>>([
      { role: "system", content: systemPrompt },
      { role: "user", content: promptContext },
    ]);

    // Ensure challenge_type is valid
    if (
      typeof rawResult["challenge_type"] === "string" &&
      !CHALLENGE_TYPES.includes(rawResult["challenge_type"] as (typeof CHALLENGE_TYPES)[number])
    ) {
      rawResult["challenge_type"] = "why";
    }

    // Parse and validate with Zod
    const validated = InitialAnalysisSchema.safeParse(rawResult);

    if (!validated.success) {
      console.warn("Socratic AI initial analysis validation warning, falling back safely:", validated.error);
      return sanitizeInitialAnalysis(rawResult, context);
    }

    return validated.data;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      `AI evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      502,
    );
  }
}

function sanitizeInitialAnalysis(
  raw: Record<string, unknown>,
  ctx: SocraticContext,
): InitialAnalysisResult {
  const answerStatus =
    raw["answer_status"] === "correct" ||
    raw["answer_status"] === "partially_correct" ||
    raw["answer_status"] === "incorrect"
      ? raw["answer_status"]
      : "partially_correct";

  const reasoningQuality = Math.max(
    0,
    Math.min(100, typeof raw["reasoning_quality"] === "number" ? raw["reasoning_quality"] : 50),
  );

  const conceptualUnderstanding = Math.max(
    0,
    Math.min(100, typeof raw["conceptual_understanding"] === "number" ? raw["conceptual_understanding"] : 50),
  );

  return {
    answer_status: answerStatus,
    reasoning_quality: reasoningQuality,
    conceptual_understanding: conceptualUnderstanding,
    misconception_detected: Boolean(raw["misconception_detected"]),
    misconception: typeof raw["misconception"] === "string" ? raw["misconception"] : null,
    misconception_category:
      typeof raw["misconception_category"] === "string"
        ? (raw["misconception_category"] as InitialAnalysisResult["misconception_category"])
        : null,
    misconception_severity:
      raw["misconception_severity"] === "low" ||
      raw["misconception_severity"] === "medium" ||
      raw["misconception_severity"] === "high"
        ? raw["misconception_severity"]
        : null,
    challenge_type:
      typeof raw["challenge_type"] === "string" &&
      CHALLENGE_TYPES.includes(raw["challenge_type"] as (typeof CHALLENGE_TYPES)[number])
        ? (raw["challenge_type"] as InitialAnalysisResult["challenge_type"])
        : "why",
    challenge:
      typeof raw["challenge"] === "string" && raw["challenge"].length >= 5
        ? raw["challenge"]
        : `Why does your reasoning hold true for all possible cases in ${ctx.topic}?`,
    challenge_difficulty:
      raw["challenge_difficulty"] === "easy" ||
      raw["challenge_difficulty"] === "medium" ||
      raw["challenge_difficulty"] === "hard"
        ? raw["challenge_difficulty"]
        : "medium",
    confidence: typeof raw["confidence"] === "number" ? Math.max(0, Math.min(100, raw["confidence"])) : 85,
    strengths: Array.isArray(raw["strengths"]) ? raw["strengths"].filter((s): s is string => typeof s === "string") : [],
    weaknesses: Array.isArray(raw["weaknesses"]) ? raw["weaknesses"].filter((w): w is string => typeof w === "string") : [],
    feedback:
      typeof raw["feedback"] === "string" && raw["feedback"].length >= 5
        ? raw["feedback"]
        : "Your answer has been analyzed. Defend your reasoning against the Socratic challenge below.",
    expected_core_concept:
      typeof raw["expected_core_concept"] === "string" ? raw["expected_core_concept"] : ctx.topic,
  };
}
