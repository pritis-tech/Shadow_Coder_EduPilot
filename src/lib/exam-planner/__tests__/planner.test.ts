import { analyzeSyllabusAndPyqs } from "../pyqAnalysisEngine";
import { generatePersonalizedStudyPlan } from "../studyPlanEngine";
import { calculateWhatShouldIStudyNow } from "../studyNowEngine";
import type { SyllabusTopicItem, PyqQuestionItem, TopicAnalysisItem } from "../types";

export function runExamPlannerUnitTests(): {
  total: number;
  passed: number;
  results: Array<{ name: string; passed: boolean; details?: string }>;
} {
  const results: Array<{ name: string; passed: boolean; details?: string }> = [];

  const syllabusTopics: SyllabusTopicItem[] = [
    { unit_name: "Unit 1", chapter_name: "Search Algorithms", topic: "Binary Search", subtopics: ["Iterative", "Recursive"] },
    { unit_name: "Unit 2", chapter_name: "Graph Algorithms", topic: "Dijkstra's Algorithm", subtopics: ["Shortest Path"] },
    { unit_name: "Unit 3", chapter_name: "Trees", topic: "Red-Black Trees", subtopics: ["Rotations"] },
    { unit_name: "Unit 4", chapter_name: "Hashing", topic: "Hash Tables", subtopics: ["Chaining"] },
  ];

  // Test 1: Flow A — Syllabus ONLY (0 PYQs)
  try {
    const analysisFlowA = analyzeSyllabusAndPyqs({
      syllabusTopics,
      pyqQuestions: [],
      yearsCovered: [],
    });

    const bsAnalysis = analysisFlowA.topics.find((t) => t.topic === "Binary Search");
    const passedA =
      analysisFlowA.has_pyq_data === false &&
      analysisFlowA.topics.length === 4 &&
      bsAnalysis?.priority_reason.includes("Based on syllabus structure — no PYQ data provided") &&
      bsAnalysis?.repeat_pattern === "not_in_pyq" &&
      bsAnalysis?.pyq_count === 0;

    results.push({
      name: "Test 1 [Flow A]: Syllabus-only analysis with 0 PYQs (honest labeling)",
      passed: Boolean(passedA),
      details: `has_pyq_data: ${analysisFlowA.has_pyq_data}, reason: "${bsAnalysis?.priority_reason}"`,
    });
  } catch (err) {
    results.push({ name: "Test 1 [Flow A]", passed: false, details: String(err) });
  }

  // Test 2: Flow B — Syllabus + 2 Years PYQs (Multi-year recurrence)
  try {
    const pyqs: PyqQuestionItem[] = [
      { year: 2024, question_text: "Explain Binary Search and prove logarithmic complexity.", marks: 10, question_type: "long", suggested_topic: "Binary Search", tested_concept: "Binary Search" },
      { year: 2025, question_text: "Compare Binary Search with Linear Search on sorted arrays.", marks: 5, question_type: "short", suggested_topic: "Binary Search", tested_concept: "Binary Search" },
      { year: 2024, question_text: "Explain Dijkstra's shortest path algorithm.", marks: 10, question_type: "long", suggested_topic: "Dijkstra's Algorithm", tested_concept: "Dijkstra" },
    ];

    const analysisFlowB = analyzeSyllabusAndPyqs({
      syllabusTopics,
      pyqQuestions: pyqs,
      yearsCovered: [2024, 2025],
    });

    const bsAnalysis = analysisFlowB.topics.find((t) => t.topic === "Binary Search");
    const dijkstraAnalysis = analysisFlowB.topics.find((t) => t.topic === "Dijkstra's Algorithm");
    const rbAnalysis = analysisFlowB.topics.find((t) => t.topic === "Red-Black Trees");

    const passedB =
      analysisFlowB.has_pyq_data === true &&
      bsAnalysis?.priority === "high" &&
      bsAnalysis?.repeat_pattern === "repeated_both_years" &&
      bsAnalysis?.pyq_count === 2 &&
      dijkstraAnalysis?.priority === "medium" &&
      rbAnalysis?.priority === "low";

    results.push({
      name: "Test 2 [Flow B]: Multi-year PYQ recurrence intelligence (High/Med/Low)",
      passed: Boolean(passedB),
      details: `Binary Search: ${bsAnalysis?.priority} (${bsAnalysis?.repeat_pattern}), Dijkstra: ${dijkstraAnalysis?.priority}`,
    });
  } catch (err) {
    results.push({ name: "Test 2 [Flow B]", passed: false, details: String(err) });
  }

  // Test 3: Mastery-First Priority in Study Plan
  try {
    const topicAnalysis: TopicAnalysisItem[] = [
      {
        topic: "Binary Search",
        unit_name: "Unit 1",
        pyq_count: 3,
        years_appeared: [2024, 2025],
        repeat_pattern: "repeated_both_years",
        priority: "high",
        priority_reason: "Tested in both years",
        evidence: ["Appeared in 2024 and 2025"],
        estimated_difficulty: "medium",
        related_pyqs: [],
      },
      {
        topic: "Red-Black Trees",
        unit_name: "Unit 3",
        pyq_count: 0,
        years_appeared: [],
        repeat_pattern: "not_in_pyq",
        priority: "low",
        priority_reason: "Syllabus only",
        evidence: [],
        estimated_difficulty: "hard",
        related_pyqs: [],
      },
    ];

    const masteryMap = new Map<string, number>();
    masteryMap.set("binary search", 60);
    masteryMap.set("red-black trees", 20);

    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 20);

    // Student explicitly chose Red-Black Trees as their mastery target!
    const plan = generatePersonalizedStudyPlan({
      examDate: examDate.toISOString(),
      selectedTopics: ["Red-Black Trees"], // ONLY Red-Black Trees selected
      topicAnalysis,
      topicMasteryMap: masteryMap,
    });

    const firstDay = plan.schedule[0];
    const passed =
      firstDay?.topic === "Red-Black Trees" && // Student's choice must come first!
      Boolean(firstDay?.activities.some((a) => a.type === "socratic_challenge"));

    results.push({
      name: "Test 3: Student's explicit mastery goal takes top priority over unselected PYQ topics",
      passed: Boolean(passed),
      details: `Day 1 Focus Topic: "${firstDay?.topic}" (Student target took precedence)`,
    });
  } catch (err) {
    results.push({ name: "Test 3", passed: false, details: String(err) });
  }

  // Test 4: "What Should I Study Now?" in Syllabus-Only mode vs PYQ mode
  try {
    const topicAnalysisSyllabusOnly: TopicAnalysisItem[] = [
      {
        topic: "Trees",
        unit_name: "Unit 2",
        pyq_count: 0,
        years_appeared: [],
        repeat_pattern: "not_in_pyq",
        priority: "medium",
        priority_reason: "Syllabus structure",
        evidence: ["Unit 2 Topic"],
        estimated_difficulty: "medium",
        related_pyqs: [],
      },
    ];

    const masteryMap = new Map<string, number>();
    masteryMap.set("trees", 35);

    const examDate = new Date();
    examDate.setDate(examDate.getDate() + 12);

    const studyNow = calculateWhatShouldIStudyNow({
      examDate: examDate.toISOString(),
      topicAnalysis: topicAnalysisSyllabusOnly,
      topicMasteryMap: masteryMap,
      selectedTopics: ["Trees"],
    });

    const passed =
      studyNow !== null &&
      studyNow.topic === "Trees" &&
      studyNow.is_selected_goal === true &&
      studyNow.reason.includes("You selected this topic for mastery, your current mastery is 35%") &&
      studyNow.reason.includes("12 days");

    results.push({
      name: "Test 4: 'What Should I Study Now?' reasoning in syllabus-only mode",
      passed: Boolean(passed),
      details: `Recommendation: ${studyNow?.topic}, Reason: "${studyNow?.reason}"`,
    });
  } catch (err) {
    results.push({ name: "Test 4", passed: false, details: String(err) });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    results,
  };
}
