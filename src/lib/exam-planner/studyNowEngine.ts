import {
  type TopicAnalysisItem,
  type StudyNowRecommendation,
} from "./types";

/**
 * Determines the single highest-value topic for the student right now based on:
 * 1. User's explicit mastery selection goal
 * 2. Current mastery score / mastery gap
 * 3. Exam countdown proximity
 * 4. PYQ recurrence / syllabus importance
 */
export function calculateWhatShouldIStudyNow(params: {
  examDate: string;
  topicAnalysis: TopicAnalysisItem[];
  topicMasteryMap: Map<string, number>;
  selectedTopics?: string[];
}): StudyNowRecommendation | null {
  const { examDate, topicAnalysis, topicMasteryMap, selectedTopics = [] } = params;

  if (topicAnalysis.length === 0) return null;

  const now = new Date();
  const exam = new Date(examDate);
  const diffDays = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const hasPyqData = topicAnalysis.some((t) => t.pyq_count > 0);
  const proximityUrgency = Math.max(10, Math.min(100, 100 - diffDays * 2));

  let bestTopic: TopicAnalysisItem | null = null;
  let highestScore = -1;
  let isBestSelected = false;

  for (const item of topicAnalysis) {
    const key = item.topic.toLowerCase();
    const isSelected = selectedTopics.some((st) => st.toLowerCase() === key);
    const mastery = topicMasteryMap.get(key) ?? 0;

    // 1. User Mastery Goal: Major priority signal (+50 points)
    const selectionBonus = isSelected ? 50 : 0;

    // 2. Mastery Gap (0 to 100 gap): up to 45 points
    const masteryGap = (100 - mastery) * 0.45;

    // 3. Historical PYQ priority or Syllabus priority: up to 35 points
    const pWeight = item.priority === "high" ? 35 : item.priority === "medium" ? 20 : 10;

    // 4. Proximity Urgency: up to 15 points
    const proximityScore = (proximityUrgency / 100) * 15;

    const totalScore = selectionBonus + masteryGap + pWeight + proximityScore;

    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestTopic = item;
      isBestSelected = isSelected;
    }
  }

  if (!bestTopic) return null;

  const currentMastery = Math.round(topicMasteryMap.get(bestTopic.topic.toLowerCase()) ?? 0);
  const samplePyq = bestTopic.related_pyqs[0]?.question_text || null;

  // Build honest, calibrated reason
  let reason = "";

  if (isBestSelected) {
    if (hasPyqData && bestTopic.repeat_pattern === "repeated_both_years") {
      reason = `You selected this topic for mastery, your mastery is ${currentMastery}%, and it appeared in both uploaded PYQ papers.`;
    } else if (hasPyqData && bestTopic.pyq_count > 0) {
      reason = `You selected this topic for mastery, your mastery is ${currentMastery}%, and it appeared in uploaded PYQs.`;
    } else {
      reason = `You selected this topic for mastery, your current mastery is ${currentMastery}%, and the exam is in ${diffDays} day${diffDays === 1 ? "" : "s"}.`;
    }
  } else {
    if (hasPyqData && bestTopic.pyq_count > 0) {
      reason = `High-frequency topic in uploaded PYQ archive (${bestTopic.pyq_count} questions) with a ${100 - currentMastery}% mastery gap to close.`;
    } else {
      reason = `Core syllabus foundation in ${bestTopic.unit_name} with current mastery at ${currentMastery}%.`;
    }
  }

  const suggestedAction = `Practice ${bestTopic.topic} now using Socratic challenges to elevate your mastery towards 85%+.`;

  return {
    topic: bestTopic.topic,
    unit_name: bestTopic.unit_name,
    priority: bestTopic.priority,
    pyq_frequency: bestTopic.pyq_count,
    years_appeared: bestTopic.years_appeared,
    current_mastery: currentMastery,
    urgency_score: Math.round(highestScore),
    reason,
    suggested_action: suggestedAction,
    relevant_pyq_sample: samplePyq,
    is_selected_goal: isBestSelected,
  };
}
