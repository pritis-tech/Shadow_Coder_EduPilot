import { chatJson, AiError } from "@/lib/ai-gateway.server";
import {
  PyqExtractionResultSchema,
  type PyqExtractionResult,
  type PyqQuestionItem,
  type SyllabusTopicItem,
} from "./types";

/**
 * Extracts question statements, marks, question type, and mapped syllabus topics from raw PYQ text.
 */
export async function parsePyqDocument(params: {
  year: number;
  subject: string;
  rawText: string;
  syllabusTopics?: SyllabusTopicItem[];
}): Promise<PyqExtractionResult> {
  const { year, subject, rawText, syllabusTopics = [] } = params;

  if (!rawText || rawText.trim().length < 15) {
    throw new Error(`PYQ text for year ${year} is too short or empty to parse.`);
  }

  const topicListStr = syllabusTopics.length > 0
    ? `\nAvailable Syllabus Topics for Mapping:\n${syllabusTopics.map((t) => `- ${t.topic} (${t.unit_name})`).join("\n")}`
    : "";

  const systemPrompt = `You are EduPilot's Senior Exam Paper & Previous-Year Question (PYQ) Parser.
Your job is to read raw previous-year question paper text from year ${year} and extract every question cleanly:
1. Question statement (verbatim, complete sentence)
2. Question type: "short" | "long" | "numerical" | "conceptual"
3. Marks assigned (e.g. 5, 10, 2, or null if unspecified)
4. Closest matching syllabus topic
5. Core concept being tested

Strict Rules:
- Extract real questions from the paper. Do NOT invent fake questions.
- Preserve the exact year ${year}.
- Map questions accurately to the closest syllabus topic.
- Return ONLY valid JSON matching the exact schema.`;

  const userPrompt = `Subject: ${subject}
Year: ${year}
${topicListStr}

Raw PYQ Paper Text:
${rawText.slice(0, 8000)}

Return JSON with this exact structure:
{
  "year": ${year},
  "total_questions": 5,
  "questions": [
    {
      "year": ${year},
      "question_text": "Explain Binary Search algorithm with an example and derive its worst-case time complexity recurrence relation.",
      "marks": 10,
      "question_type": "long",
      "suggested_topic": "Binary Search",
      "tested_concept": "Binary search algorithm execution and logarithmic recurrence relation"
    }
  ]
}`;

  try {
    const rawResult = await chatJson<Record<string, unknown>>([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const validated = PyqExtractionResultSchema.safeParse(rawResult);

    if (validated.success && validated.data.questions.length > 0) {
      return validated.data;
    }

    console.warn(`PYQ parsing schema validation warning for year ${year}, applying fallback:`, validated.error);
    return sanitizePyqResult(rawResult, year, syllabusTopics);
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      `Failed to parse ${year} PYQ document: ${error instanceof Error ? error.message : "Unknown error"}`,
      502,
    );
  }
}

function sanitizePyqResult(
  raw: Record<string, unknown>,
  targetYear: number,
  syllabusTopics: SyllabusTopicItem[],
): PyqExtractionResult {
  const year = typeof raw["year"] === "number" ? raw["year"] : targetYear;
  const questions: PyqQuestionItem[] = [];

  const defaultTopic = syllabusTopics[0]?.topic || "Core Principles";

  if (Array.isArray(raw["questions"])) {
    for (const q of raw["questions"]) {
      if (q && typeof q === "object") {
        const rec = q as Record<string, unknown>;
        const qText = typeof rec["question_text"] === "string" ? rec["question_text"].trim() : "";
        if (qText.length >= 5) {
          const qType =
            rec["question_type"] === "short" ||
            rec["question_type"] === "long" ||
            rec["question_type"] === "numerical" ||
            rec["question_type"] === "conceptual"
              ? rec["question_type"]
              : "long";

          questions.push({
            year: typeof rec["year"] === "number" ? rec["year"] : year,
            question_text: qText,
            marks: typeof rec["marks"] === "number" ? rec["marks"] : null,
            question_type: qType,
            suggested_topic: typeof rec["suggested_topic"] === "string" && rec["suggested_topic"].trim()
              ? rec["suggested_topic"].trim()
              : defaultTopic,
            tested_concept: typeof rec["tested_concept"] === "string" && rec["tested_concept"].trim()
              ? rec["tested_concept"].trim()
              : "Conceptual understanding",
          });
        }
      }
    }
  }

  return {
    year,
    total_questions: questions.length,
    questions,
  };
}
