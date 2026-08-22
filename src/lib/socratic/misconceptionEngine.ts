import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { InitialAnalysisResult, MisconceptionCategory, StudentMisconception } from "./types";

export async function recordMisconceptionIfDetected(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  topic: string;
  concept: string;
  analysis: InitialAnalysisResult;
  sessionId?: string;
}): Promise<StudentMisconception | null> {
  const { supabase, userId, topic, concept, analysis, sessionId } = params;

  if (!analysis.misconception_detected || !analysis.misconception) {
    return null;
  }

  const misconceptionText = analysis.misconception.trim();
  const category: MisconceptionCategory =
    analysis.misconception_category || "conceptual_misunderstanding";
  const severity = analysis.misconception_severity || "medium";

  // Check if this exact or similar misconception exists for this user and topic
  const { data: existing } = await supabase
    .from("student_misconceptions")
    .select("*")
    .eq("user_id", userId)
    .eq("topic", topic)
    .eq("misconception", misconceptionText)
    .maybeSingle();

  if (existing) {
    const updatedFrequency = (existing.frequency || 1) + 1;
    const { data: updated, error } = await supabase
      .from("student_misconceptions")
      .update({
        frequency: updatedFrequency,
        last_detected_at: new Date().toISOString(),
        resolved: false, // Reactivated if seen again
        resolved_at: null,
        severity,
        session_id: sessionId || existing.session_id,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update misconception frequency:", error);
      return null;
    }
    return updated as StudentMisconception;
  }

  // Insert new misconception record
  const { data: inserted, error } = await supabase
    .from("student_misconceptions")
    .insert({
      user_id: userId,
      topic,
      concept: concept || topic,
      misconception: misconceptionText,
      category,
      severity,
      resolved: false,
      frequency: 1,
      first_detected_at: new Date().toISOString(),
      last_detected_at: new Date().toISOString(),
      session_id: sessionId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert misconception:", error);
    return null;
  }

  return inserted as StudentMisconception;
}

export async function resolveMisconceptionForSession(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  topic: string;
  misconceptionText?: string | null | undefined;
}): Promise<void> {
  const { supabase, userId, topic, misconceptionText } = params;

  if (!misconceptionText) return;

  const now = new Date().toISOString();
  await supabase
    .from("student_misconceptions")
    .update({
      resolved: true,
      resolved_at: now,
    })
    .eq("user_id", userId)
    .eq("topic", topic)
    .eq("misconception", misconceptionText.trim())
    .eq("resolved", false);
}

export async function getStudentMisconceptions(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  topic?: string | undefined;
}): Promise<{ active: StudentMisconception[]; resolved: StudentMisconception[] }> {
  const { supabase, userId, topic } = params;

  let query = supabase
    .from("student_misconceptions")
    .select("*")
    .eq("user_id", userId)
    .order("last_detected_at", { ascending: false });

  if (topic) {
    query = query.eq("topic", topic);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching misconceptions:", error);
    return { active: [], resolved: [] };
  }

  const all = (data as StudentMisconception[]) ?? [];
  return {
    active: all.filter((m) => !m.resolved),
    resolved: all.filter((m) => m.resolved),
  };
}
