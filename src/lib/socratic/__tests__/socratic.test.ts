import { calculateSocraticMastery } from "../masteryEngine";
import type { DefenseEvaluationResult, InitialAnalysisResult } from "../types";

/**
 * Automated unit test suite for Socratic Challenge Engine.
 * Tests mastery calculation, anti-memorization constraints,
 * misconception damping, and state recalibration rules.
 */
export function runSocraticEngineUnitTests(): {
  total: number;
  passed: number;
  results: Array<{ name: string; passed: boolean; details?: string }>;
} {
  const results: Array<{ name: string; passed: boolean; details?: string }> = [];

  // Test 1: Strong student (High reasoning, high defense)
  try {
    const initialAnalysis: InitialAnalysisResult = {
      answer_status: "correct",
      reasoning_quality: 90,
      conceptual_understanding: 90,
      misconception_detected: false,
      misconception: null,
      challenge_type: "counterexample",
      challenge: "Merge Sort also divides an array in half. Why is Merge Sort O(n log n) while Binary Search is O(log n)?",
      challenge_difficulty: "hard",
      confidence: 95,
      strengths: ["Clear explanation of halving search space"],
      weaknesses: [],
      feedback: "Strong logical proof.",
      expected_core_concept: "Logarithmic time complexity through search space elimination",
    };

    const defenseEvaluation: DefenseEvaluationResult = {
      defense_quality: 92,
      conceptual_understanding: 95,
      logical_consistency: 90,
      addressed_challenge: true,
      misconception_status: "none",
      mastery_score: 92,
      mastery_delta: 20,
      strengths: ["Properly distinguished O(1) step work from O(n) merge work"],
      weaknesses: [],
      feedback: "Excellent defense.",
      next_recommendation: "Advance to advanced divide-and-conquer algorithms.",
      suggested_next_difficulty: "hard",
    };

    const result = calculateSocraticMastery({
      previousMastery: 60,
      initialAnalysis,
      defenseEvaluation,
    });

    const passed = result.newMasteryScore >= 78 && result.status === "improving" || result.status === "mastered";
    results.push({
      name: "Test 1: Strong student reasoning & defense boosts mastery earned",
      passed,
      details: `Prev: 60 -> Demonstrated: ${result.demonstratedScore} -> New: ${result.newMasteryScore} (${result.status})`,
    });
  } catch (e) {
    results.push({ name: "Test 1", passed: false, details: String(e) });
  }

  // Test 2: Anti-Memorization Rule
  // Student got the answer "correct" but has weak reasoning (<40) and weak defense (<40)
  try {
    const initialAnalysis: InitialAnalysisResult = {
      answer_status: "correct",
      reasoning_quality: 25,
      conceptual_understanding: 20,
      misconception_detected: false,
      misconception: null,
      challenge_type: "why",
      challenge: "Why does dividing by 2 lead to logarithmic complexity instead of linear?",
      challenge_difficulty: "medium",
      confidence: 80,
      strengths: [],
      weaknesses: ["Cannot explain why halving creates logarithm"],
      feedback: "Answer is right, but explanation indicates memorization without understanding.",
      expected_core_concept: "Logarithmic recurrence",
    };

    const defenseEvaluation: DefenseEvaluationResult = {
      defense_quality: 30,
      conceptual_understanding: 25,
      logical_consistency: 40,
      addressed_challenge: false,
      misconception_status: "none",
      mastery_score: 30,
      mastery_delta: -10,
      strengths: [],
      weaknesses: ["Evasive answer", "Did not explain logarithm"],
      feedback: "Defense did not address the challenge.",
      next_recommendation: "Review recurrence relations and logarithmic growth.",
      suggested_next_difficulty: "easy",
    };

    const result = calculateSocraticMastery({
      previousMastery: 50,
      initialAnalysis,
      defenseEvaluation,
    });

    // Demonstrated score MUST be capped under 50% despite correct answer
    const passed = result.demonstratedScore <= 48 && result.newMasteryScore <= 50;
    results.push({
      name: "Test 2: Anti-Memorization prevents unearned mastery on shallow reasoning",
      passed,
      details: `Demonstrated capped at ${result.demonstratedScore} (<=48), New Mastery: ${result.newMasteryScore}`,
    });
  } catch (e) {
    results.push({ name: "Test 2", passed: false, details: String(e) });
  }

  // Test 3: Misconception persists applies damping penalty
  try {
    const initialAnalysis: InitialAnalysisResult = {
      answer_status: "incorrect",
      reasoning_quality: 30,
      conceptual_understanding: 20,
      misconception_detected: true,
      misconception: "Assuming binary search works on unsorted arrays",
      misconception_category: "missing_prerequisite",
      misconception_severity: "high",
      challenge_type: "counterexample",
      challenge: "Consider unsorted array [9, 2, 7, 1, 5]. If you check the middle element (7) searching for 1, which half do you discard and why does binary search fail?",
      challenge_difficulty: "medium",
      confidence: 90,
      strengths: [],
      weaknesses: ["Missing sorted invariant requirement"],
      feedback: "Binary search requires monotonicity.",
      expected_core_concept: "Sorted array invariant",
    };

    const defenseEvaluation: DefenseEvaluationResult = {
      defense_quality: 20,
      conceptual_understanding: 15,
      logical_consistency: 30,
      addressed_challenge: false,
      misconception_status: "persists",
      mastery_score: 20,
      mastery_delta: -15,
      strengths: [],
      weaknesses: ["Still assumes middle element division works without sorting"],
      feedback: "Misconception remains active.",
      next_recommendation: "Foundational lesson on sorted array search requirements.",
      suggested_next_difficulty: "easy",
    };

    const result = calculateSocraticMastery({
      previousMastery: 55,
      initialAnalysis,
      defenseEvaluation,
      hasActiveMisconceptions: true,
    });

    const passed = result.newMasteryScore < 50 && result.demonstratedScore < 30;
    results.push({
      name: "Test 3: Active persisting misconception recalibrates mastery downwards",
      passed,
      details: `Prev: 55 -> Demonstrated: ${result.demonstratedScore} -> Recalibrated: ${result.newMasteryScore}`,
    });
  } catch (e) {
    results.push({ name: "Test 3", passed: false, details: String(e) });
  }

  // Test 4: Misconception resolved awards recovery bonus
  try {
    const initialAnalysis: InitialAnalysisResult = {
      answer_status: "partially_correct",
      reasoning_quality: 50,
      conceptual_understanding: 45,
      misconception_detected: true,
      misconception: "Confusing worst case of binary search with linear search",
      misconception_category: "conceptual_misunderstanding",
      challenge_type: "why",
      challenge: "If binary search never inspects all elements, why is worst case still O(log n)?",
      challenge_difficulty: "medium",
      confidence: 85,
      strengths: [],
      weaknesses: [],
      feedback: "Address the worst-case path.",
      expected_core_concept: "Worst case binary decision tree height",
    };

    const defenseEvaluation: DefenseEvaluationResult = {
      defense_quality: 85,
      conceptual_understanding: 90,
      logical_consistency: 88,
      addressed_challenge: true,
      misconception_status: "resolved",
      mastery_score: 85,
      mastery_delta: 25,
      strengths: ["Recognized tree height bound"],
      weaknesses: [],
      feedback: "Misconception successfully resolved.",
      next_recommendation: "Advance to tree traversals.",
      suggested_next_difficulty: "medium",
    };

    const result = calculateSocraticMastery({
      previousMastery: 40,
      initialAnalysis,
      defenseEvaluation,
    });

    const passed = result.demonstratedScore >= 75 && result.newMasteryScore > 55;
    results.push({
      name: "Test 4: Resolved misconception via strong defense awards recovery bonus",
      passed,
      details: `Prev: 40 -> Demonstrated: ${result.demonstratedScore} -> New: ${result.newMasteryScore}`,
    });
  } catch (e) {
    results.push({ name: "Test 4", passed: false, details: String(e) });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    results,
  };
}
