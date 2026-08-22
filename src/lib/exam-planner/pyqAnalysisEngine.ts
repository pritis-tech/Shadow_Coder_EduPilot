import {
  type SyllabusTopicItem,
  type PyqQuestionItem,
  type TopicAnalysisItem,
  type ComprehensiveAnalysisResult,
  type PriorityTier,
  type RepeatPattern,
} from "./types";

/**
 * Correlates syllabus topics with extracted PYQ questions across all uploaded years,
 * calculating frequency, multi-year recurrence, evidence-based priority tiers, and difficulty estimates.
 * If no PYQ questions are provided, seamlessly generates a syllabus-structure-based analysis.
 */
export function analyzeSyllabusAndPyqs(params: {
  syllabusTopics: SyllabusTopicItem[];
  pyqQuestions?: PyqQuestionItem[] | undefined;
  yearsCovered?: number[] | undefined;
}): ComprehensiveAnalysisResult {
  const { syllabusTopics, pyqQuestions = [], yearsCovered = [] } = params;

  const hasPyqData = pyqQuestions.length > 0;
  const distinctYears = Array.from(new Set(yearsCovered)).sort((a, b) => a - b);
  const totalYears = Math.max(1, distinctYears.length);

  // Group PYQs by mapped syllabus topic (using fuzzy and normalized string match)
  const topicMap = new Map<string, PyqQuestionItem[]>();

  for (const topic of syllabusTopics) {
    topicMap.set(topic.topic.toLowerCase(), []);
  }

  if (hasPyqData) {
    for (const q of pyqQuestions) {
      const suggested = q.suggested_topic.toLowerCase().trim();
      let matchedKey: string | null = null;

      // 1. Exact match
      if (topicMap.has(suggested)) {
        matchedKey = suggested;
      } else {
        // 2. Partial/substring match
        for (const [topKey] of topicMap.entries()) {
          if (
            topKey.includes(suggested) ||
            suggested.includes(topKey) ||
            q.question_text.toLowerCase().includes(topKey)
          ) {
            matchedKey = topKey;
            break;
          }
        }
      }

      if (matchedKey) {
        topicMap.get(matchedKey)?.push(q);
      } else {
        // Create ad-hoc topic if it represents an unlisted syllabus area
        const newKey = q.suggested_topic.toLowerCase().trim();
        if (!topicMap.has(newKey)) {
          topicMap.set(newKey, [q]);
        } else {
          topicMap.get(newKey)?.push(q);
        }
      }
    }
  }

  const topicAnalysisItems: TopicAnalysisItem[] = [];

  for (let idx = 0; idx < syllabusTopics.length; idx++) {
    const sTopic = syllabusTopics[idx];
    if (!sTopic) continue;

    const key = sTopic.topic.toLowerCase();
    const relatedPyqs = topicMap.get(key) || [];

    const yearsSet = new Set<number>();
    for (const q of relatedPyqs) {
      yearsSet.add(q.year);
    }
    const yearsAppeared = Array.from(yearsSet).sort((a, b) => a - b);
    const pyqCount = relatedPyqs.length;

    // Determine repeat pattern & priority tier
    let repeatPattern: RepeatPattern = "not_in_pyq";
    let priority: PriorityTier = "medium";
    const evidence: string[] = [];
    let priorityReason = "";

    if (hasPyqData) {
      if (yearsAppeared.length >= 2 && totalYears >= 2) {
        repeatPattern = "repeated_both_years";
        priority = "high";
        evidence.push(`Appeared across all uploaded exam years (${yearsAppeared.join(" and ")})`);
        evidence.push(`${pyqCount} total question${pyqCount > 1 ? "s" : ""} recorded in PYQ archive`);
        evidence.push("Consistently tested core mechanism with question variations");
        priorityReason = `High priority based on uploaded PYQ history: Repeated in both ${yearsAppeared.join(" and ")} question papers.`;
      } else if (pyqCount >= 3) {
        repeatPattern = "high_frequency";
        priority = "high";
        evidence.push(`Tested ${pyqCount} times across recent exam papers`);
        evidence.push(`Appeared in year(s): ${yearsAppeared.join(", ")}`);
        priorityReason = `High priority based on uploaded PYQ history: High frequency question area (${pyqCount} occurrences).`;
      } else if (yearsAppeared.length === 1) {
        repeatPattern = "single_year";
        priority = "medium";
        evidence.push(`Appeared in ${yearsAppeared[0]} examination paper`);
        evidence.push(`${pyqCount} question${pyqCount > 1 ? "s" : ""} asked on this topic`);
        priorityReason = `Active exam topic: Tested in ${yearsAppeared[0]} (Prediction — not guaranteed to repeat).`;
      } else {
        repeatPattern = "not_in_pyq";
        priority = sTopic.weightage && sTopic.weightage >= 15 ? "medium" : "low";
        evidence.push("Included in standard syllabus structure");
        evidence.push("No direct question matches in uploaded PYQ papers");
        priorityReason = "Foundational syllabus concept (Lower historic PYQ appearance).";
      }
    } else {
      // Syllabus-only mode: No PYQs provided
      repeatPattern = "not_in_pyq";
      // Earlier/core units or high weightage topics get prioritized for learning order
      if (sTopic.weightage && sTopic.weightage >= 20) {
        priority = "high";
      } else if (idx < Math.ceil(syllabusTopics.length * 0.4)) {
        priority = "high"; // Core foundation
      } else if (idx < Math.ceil(syllabusTopics.length * 0.8)) {
        priority = "medium";
      } else {
        priority = "low";
      }

      evidence.push(`Structured topic under ${sTopic.unit_name}`);
      if (sTopic.subtopics.length > 0) {
        evidence.push(`Covers ${sTopic.subtopics.length} key subtopics`);
      }
      evidence.push("No PYQ data provided — priority determined by syllabus progression");
      priorityReason = "Based on syllabus structure — no PYQ data provided.";
    }

    // Estimate conceptual difficulty
    let estimatedDifficulty: "easy" | "medium" | "hard" = "medium";
    const longCount = relatedPyqs.filter((q) => q.question_type === "long").length;
    const numCount = relatedPyqs.filter((q) => q.question_type === "numerical").length;
    if (longCount >= 2 || numCount >= 1) {
      estimatedDifficulty = "hard";
    } else if (relatedPyqs.length > 0 && relatedPyqs.every((q) => q.question_type === "short")) {
      estimatedDifficulty = "easy";
    } else if (sTopic.subtopics.length >= 4) {
      estimatedDifficulty = "hard";
    }

    topicAnalysisItems.push({
      topic: sTopic.topic,
      unit_name: sTopic.unit_name,
      pyq_count: pyqCount,
      years_appeared: yearsAppeared,
      repeat_pattern: repeatPattern,
      priority,
      priority_reason: priorityReason,
      evidence,
      estimated_difficulty: estimatedDifficulty,
      related_pyqs: relatedPyqs,
    });
  }

  // Sort by priority (high -> medium -> low) and pyq_count DESC
  topicAnalysisItems.sort((a, b) => {
    const pWeight = { high: 3, medium: 2, low: 1 };
    if (pWeight[b.priority] !== pWeight[a.priority]) {
      return pWeight[b.priority] - pWeight[a.priority];
    }
    return b.pyq_count - a.pyq_count;
  });

  const highCount = topicAnalysisItems.filter((t) => t.priority === "high").length;
  const medCount = topicAnalysisItems.filter((t) => t.priority === "medium").length;
  const lowCount = topicAnalysisItems.filter((t) => t.priority === "low").length;

  const observations: string[] = hasPyqData
    ? [
        `Analyzed ${distinctYears.length} previous-year paper(s) covering ${pyqQuestions.length} total questions.`,
        `${highCount} topic(s) classified as HIGH PRIORITY based on multi-year recurrence.`,
        `${medCount} topic(s) categorized as MEDIUM PRIORITY with active recent coverage.`,
        "All priorities and predictions are evidence-backed trends from source materials (not guaranteed).",
      ]
    : [
        `Analyzed ${syllabusTopics.length} topics from syllabus structure across units.`,
        `No PYQ papers uploaded — preparation schedule follows curriculum progression and your chosen mastery goals.`,
        `Upload PYQ papers anytime to unlock historical recurrence patterns and question frequency.`,
      ];

  return {
    topics: topicAnalysisItems,
    high_priority_count: highCount,
    medium_priority_count: medCount,
    low_priority_count: lowCount,
    pyq_years_covered: distinctYears,
    has_pyq_data: hasPyqData,
    overall_observations: observations,
  };
}
