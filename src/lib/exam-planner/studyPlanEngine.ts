import {
  type TopicAnalysisItem,
  type PersonalizedStudyPlan,
  type StudyDayPlan,
  type StudyActivity,
} from "./types";

/**
 * Generates a structured, evidence-based personalized day-by-day study plan
 * prioritizing the student's explicit mastery targets, exam proximity, and available PYQ data.
 */
export function generatePersonalizedStudyPlan(params: {
  examDate: string;
  selectedTopics: string[];
  topicAnalysis: TopicAnalysisItem[];
  topicMasteryMap: Map<string, number>;
  dailyHoursTarget?: number;
}): PersonalizedStudyPlan {
  const {
    examDate,
    selectedTopics,
    topicAnalysis,
    topicMasteryMap,
    dailyHoursTarget = 2,
  } = params;

  // Calculate days until exam
  const now = new Date();
  const exam = new Date(examDate);
  const diffTime = exam.getTime() - now.getTime();
  const daysUntilExam = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const hasPyqData = topicAnalysis.some((t) => t.pyq_count > 0);

  // Filter topics chosen by student (or fallback to top topics if none chosen)
  const userChosenTopics = topicAnalysis.filter((t) =>
    selectedTopics.some((st) => st.toLowerCase() === t.topic.toLowerCase()),
  );

  const targetTopics = userChosenTopics.length > 0
    ? userChosenTopics
    : topicAnalysis.slice(0, Math.min(8, topicAnalysis.length));

  // Rank topics giving PARAMOUNT priority to user-selected mastery goals
  const rankedTopics = [...targetTopics].sort((a, b) => {
    const aSelected = selectedTopics.some((st) => st.toLowerCase() === a.topic.toLowerCase());
    const bSelected = selectedTopics.some((st) => st.toLowerCase() === b.topic.toLowerCase());

    const pWeight = { high: 3, medium: 2, low: 1 };
    const aMastery = topicMasteryMap.get(a.topic.toLowerCase()) ?? 0;
    const bMastery = topicMasteryMap.get(b.topic.toLowerCase()) ?? 0;

    // User's explicit mastery goal gives a 500-point boost
    const aScore = (aSelected ? 500 : 0) + pWeight[a.priority] * 100 + (100 - aMastery) * 2;
    const bScore = (bSelected ? 500 : 0) + pWeight[b.priority] * 100 + (100 - bMastery) * 2;

    return bScore - aScore;
  });

  const planDays: StudyDayPlan[] = [];
  const scheduleLength = Math.min(daysUntilExam, Math.max(7, rankedTopics.length * 2));

  for (let i = 1; i <= scheduleLength; i++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + (i - 1));
    const dateParts = dayDate.toISOString().split("T");
    const dateStr: string = dateParts[0] ?? new Date().toISOString().slice(0, 10);

    const topicIndex = (i - 1) % Math.max(1, rankedTopics.length);
    const fallbackItem: TopicAnalysisItem = {
      topic: "Core Fundamentals",
      unit_name: "Unit 1",
      pyq_count: 0,
      years_appeared: [],
      repeat_pattern: "not_in_pyq",
      priority: "medium",
      priority_reason: "Foundational topic",
      evidence: [],
      estimated_difficulty: "medium",
      related_pyqs: [],
    };
    const topicItem: TopicAnalysisItem = rankedTopics[topicIndex] ?? fallbackItem;
    const mastery = topicMasteryMap.get(topicItem.topic.toLowerCase()) ?? 0;

    const activities: StudyActivity[] = [];

    // 1. Concept Review Activity
    activities.push({
      id: `act-${i}-1`,
      type: "concept_review",
      title: `${topicItem.topic}: Core Mechanism & Invariants`,
      description: `Review fundamental definitions, unit context (${topicItem.unit_name}), and theoretical underpinnings.`,
      completed: false,
    });

    // 2. Practice Activity: PYQs (if available) or Syllabus Deep-Dive
    const samplePyq = topicItem.related_pyqs && topicItem.related_pyqs.length > 0 ? topicItem.related_pyqs[0] : null;
    if (samplePyq) {
      activities.push({
        id: `act-${i}-2`,
        type: "pyq_practice",
        title: `Solve Previous-Year Exam Question`,
        description: `Practice ${samplePyq.year} paper question (${samplePyq.marks ? `${samplePyq.marks}M` : "Core question"}): "${samplePyq.question_text.slice(0, 80)}..."`,
        completed: false,
        pyq_reference: samplePyq.question_text,
      });
    } else {
      activities.push({
        id: `act-${i}-2`,
        type: "pyq_practice",
        title: `Comprehensive Concept & Problem Drill`,
        description: `Work through step-by-step problem variations and core structural properties for ${topicItem.topic}.`,
        completed: false,
      });
    }

    // 3. Socratic Challenge Activity
    activities.push({
      id: `act-${i}-3`,
      type: "socratic_challenge",
      title: `Socratic Defense Interrogation`,
      description: `Defend your reasoning against Socratic counterexamples to raise mastery from ${Math.round(mastery)}% towards 85%+.`,
      completed: false,
    });

    // On final 2 days or when exam is very close, add revision
    if (i >= scheduleLength - 1 && daysUntilExam <= 5) {
      activities.push({
        id: `act-${i}-4`,
        type: "revision",
        title: `Key Invariant & Formula Rapid Revision`,
        description: `Rapid-fire memory consolidation for ${topicItem.topic} before exam day.`,
        completed: false,
      });
    }

    planDays.push({
      day_number: i,
      date: dateStr,
      topic: topicItem.topic,
      priority: topicItem.priority,
      status: i === 1 ? "in_progress" : "pending",
      activities,
    });
  }

  const summary = hasPyqData
    ? `Personalized ${scheduleLength}-day preparation roadmap leading up to your exam on ${new Date(examDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Prioritizes your ${targetTopics.length} selected mastery topic(s) and reinforces high-recurrence PYQ areas.`
    : `Personalized ${scheduleLength}-day preparation roadmap leading up to your exam on ${new Date(examDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. Structured around your ${targetTopics.length} selected mastery target(s) and syllabus progression.`;

  return {
    days_until_exam: daysUntilExam,
    exam_date: examDate,
    daily_hours_target: dailyHoursTarget,
    schedule: planDays,
    summary,
    has_pyq_data: hasPyqData,
  };
}
