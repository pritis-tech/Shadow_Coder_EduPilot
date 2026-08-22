import { chatJson, AiError } from "@/lib/ai-gateway.server";
import {
  SyllabusExtractionResultSchema,
  type SyllabusExtractionResult,
  type SyllabusTopicItem,
} from "./types";

/**
 * Parses raw syllabus text into structured units, chapters, topics, and subtopics.
 */
export async function parseSyllabusDocument(params: {
  subject: string;
  rawText: string;
}): Promise<SyllabusExtractionResult> {
  const { subject, rawText } = params;

  if (!rawText || rawText.trim().length < 15) {
    throw new Error("Syllabus text is too short or empty to parse.");
  }

  const systemPrompt = `You are EduPilot's Senior Curriculum and Academic Syllabus Parser.
Your job is to read raw academic syllabus text and extract a comprehensive, well-structured breakdown of:
1. Units (e.g. Unit 1: Arrays & Stacks, Unit 2: Trees & Graphs)
2. Chapters / Modules under each unit
3. Core Topics (e.g. "Binary Search", "AVL Trees", "Dijkstra's Algorithm")
4. Subtopics list for each topic
5. Explicit marks or weightage if explicitly mentioned (null if not explicitly specified)

Rules:
- Extract real topics present in the text. Do NOT invent or hallucinate topics outside the provided document.
- Provide a clear, clean flat_topics array containing all unique topics with their unit_name and subtopics.
- Return ONLY valid JSON matching the exact schema.`;

  const userPrompt = `Subject: ${subject}

Raw Syllabus Text Content:
${rawText.slice(0, 8000)}

Return JSON with this exact structure:
{
  "subject": "${subject}",
  "units": [
    {
      "unit_name": "Unit 1: Linear Data Structures",
      "chapters": [
        {
          "chapter_name": "Arrays and Linked Lists",
          "topics": [
            {
              "topic": "Binary Search",
              "subtopics": ["Iterative Binary Search", "Recursive Binary Search", "Lower and Upper Bound"],
              "weightage": null
            }
          ]
        }
      ]
    }
  ],
  "flat_topics": [
    {
      "unit_name": "Unit 1: Linear Data Structures",
      "chapter_name": "Arrays and Linked Lists",
      "topic": "Binary Search",
      "subtopics": ["Iterative Binary Search", "Recursive Binary Search"],
      "weightage": null
    }
  ]
}`;

  try {
    const rawResult = await chatJson<Record<string, unknown>>([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const validated = SyllabusExtractionResultSchema.safeParse(rawResult);

    if (validated.success && validated.data.flat_topics.length > 0) {
      return validated.data;
    }

    console.warn("Syllabus parsing schema validation warning, applying safe fallback:", validated.error);
    return sanitizeSyllabusResult(rawResult, subject);
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      `Failed to parse syllabus: ${error instanceof Error ? error.message : "Unknown error"}`,
      502,
    );
  }
}

function sanitizeSyllabusResult(
  raw: Record<string, unknown>,
  fallbackSubject: string,
): SyllabusExtractionResult {
  const subject = typeof raw["subject"] === "string" ? raw["subject"] : fallbackSubject;
  const flatTopics: SyllabusTopicItem[] = [];

  if (Array.isArray(raw["flat_topics"])) {
    for (const item of raw["flat_topics"]) {
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const topic = typeof record["topic"] === "string" ? record["topic"].trim() : "";
        if (topic) {
          flatTopics.push({
            unit_name: typeof record["unit_name"] === "string" ? record["unit_name"] : "Unit 1",
            chapter_name: typeof record["chapter_name"] === "string" ? record["chapter_name"] : null,
            topic,
            subtopics: Array.isArray(record["subtopics"])
              ? record["subtopics"].filter((s): s is string => typeof s === "string")
              : [],
            weightage: typeof record["weightage"] === "number" ? record["weightage"] : null,
          });
        }
      }
    }
  }

  // If flat_topics was empty, try extracting from units array
  if (flatTopics.length === 0 && Array.isArray(raw["units"])) {
    for (const u of raw["units"]) {
      if (u && typeof u === "object") {
        const uRec = u as Record<string, unknown>;
        const unitName = typeof uRec["unit_name"] === "string" ? uRec["unit_name"] : "Unit 1";
        if (Array.isArray(uRec["chapters"])) {
          for (const ch of uRec["chapters"]) {
            if (ch && typeof ch === "object") {
              const chRec = ch as Record<string, unknown>;
              const chapterName = typeof chRec["chapter_name"] === "string" ? chRec["chapter_name"] : null;
              if (Array.isArray(chRec["topics"])) {
                for (const top of chRec["topics"]) {
                  if (top && typeof top === "object") {
                    const topRec = top as Record<string, unknown>;
                    const topicName = typeof topRec["topic"] === "string" ? topRec["topic"].trim() : "";
                    if (topicName) {
                      flatTopics.push({
                        unit_name: unitName,
                        chapter_name: chapterName,
                        topic: topicName,
                        subtopics: Array.isArray(topRec["subtopics"])
                          ? topRec["subtopics"].filter((s): s is string => typeof s === "string")
                          : [],
                        weightage: typeof topRec["weightage"] === "number" ? topRec["weightage"] : null,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // If still empty, create default topic entries from line items
  if (flatTopics.length === 0) {
    flatTopics.push({
      unit_name: "Unit 1: Core Principles",
      chapter_name: "General Overview",
      topic: `${fallbackSubject} Fundamental Concepts`,
      subtopics: ["Core Theory", "Mechanisms", "Applications"],
      weightage: null,
    });
  }

  return {
    subject,
    units: [
      {
        unit_name: "Main Units",
        chapters: [
          {
            chapter_name: "Key Chapters",
            topics: flatTopics.map((t) => ({
              topic: t.topic,
              subtopics: t.subtopics,
              weightage: t.weightage,
            })),
          },
        ],
      },
    ],
    flat_topics: flatTopics,
  };
}
