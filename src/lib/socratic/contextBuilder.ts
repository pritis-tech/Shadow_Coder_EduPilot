import type { SocraticContext, SocraticStrictness } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function buildSocraticContext(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  topic: string;
  subject?: string | undefined;
  level?: string | undefined;
  question: string;
  expectedConcept?: string | undefined;
  studentAnswer: string;
  studentReasoning: string;
  strictness?: SocraticStrictness | undefined;
}): Promise<SocraticContext> {
  const {
    supabase,
    userId,
    topic,
    subject = "Computer Science",
    level = "Intermediate",
    question,
    expectedConcept,
    studentAnswer,
    studentReasoning,
    strictness = "balanced",
  } = params;

  // 1. Fetch current mastery for this topic
  let currentMastery = 50;
  const { data: topicData } = await supabase
    .from("topic_progress")
    .select("mastery_score")
    .eq("user_id", userId)
    .eq("topic", topic)
    .maybeSingle();

  if (topicData?.mastery_score !== undefined && topicData?.mastery_score !== null) {
    currentMastery = Number(topicData.mastery_score);
  }

  // 2. Fetch past Socratic sessions on this topic (up to 3 recent sessions)
  const { data: pastSessions } = await supabase
    .from("socratic_sessions")
    .select("question, student_answer, student_reasoning, challenge, student_defense, mastery_after, misconception")
    .eq("user_id", userId)
    .eq("topic", topic)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(3);

  // 3. Fetch active misconceptions on this topic
  const { data: activeMisconceptions } = await supabase
    .from("student_misconceptions")
    .select("concept, misconception, category, frequency")
    .eq("user_id", userId)
    .eq("topic", topic)
    .eq("resolved", false)
    .order("last_detected_at", { ascending: false })
    .limit(3);

  return {
    question,
    expectedConcept,
    studentAnswer,
    studentReasoning,
    topic,
    subject,
    level,
    currentMastery,
    strictness,
    previousSessions: (pastSessions ?? []).map((s) => ({
      question: s.question,
      studentAnswer: s.student_answer,
      studentReasoning: s.student_reasoning,
      challenge: s.challenge || "",
      studentDefense: s.student_defense || "",
      masteryAfter: Number(s.mastery_after || 0),
      misconception: s.misconception,
    })),
    activeMisconceptions: (activeMisconceptions ?? []).map((m) => ({
      concept: m.concept,
      misconception: m.misconception,
      category: m.category,
      frequency: m.frequency,
    })),
  };
}

export function formatContextForPrompt(ctx: SocraticContext): string {
  const parts: string[] = [];

  parts.push(`Topic: "${ctx.topic}" (Subject: ${ctx.subject}, Level: ${ctx.level})`);
  parts.push(`Current Student Topic Mastery: ${ctx.currentMastery}%`);
  parts.push(`Challenge Strictness Setting: ${ctx.strictness.toUpperCase()}`);

  if (ctx.expectedConcept) {
    parts.push(`Expected Target Concept: "${ctx.expectedConcept}"`);
  }

  if (ctx.activeMisconceptions && ctx.activeMisconceptions.length > 0) {
    parts.push(
      `Active Prior Misconceptions for this student: ${ctx.activeMisconceptions
        .map((m) => `[${m.category}] ${m.misconception} (seen ${m.frequency}x)`)
        .join("; ")}`,
    );
  }

  if (ctx.previousSessions && ctx.previousSessions.length > 0) {
    parts.push(
      `Recent Socratic Interactions History: ${ctx.previousSessions
        .map(
          (s, idx) =>
            `#${idx + 1}: Q: "${s.question.slice(0, 60)}..." -> Defended: "${s.studentDefense.slice(0, 60)}..." -> Mastery: ${s.masteryAfter}%${s.misconception ? ` (Misconception: ${s.misconception})` : ""}`,
        )
        .join(" | ")}`,
    );
  }

  parts.push(`Target Question: "${ctx.question}"`);
  parts.push(`Student Answer: "${ctx.studentAnswer}"`);
  parts.push(`Student Reasoning: "${ctx.studentReasoning}"`);

  return parts.join("\n");
}
