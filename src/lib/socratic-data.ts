import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  InstructorAnalyticsData,
  SocraticSession,
  StudentMisconception,
} from "./socratic/types";

export function useSocraticHistory(limit = 20) {
  return useQuery({
    queryKey: ["socratic_history", limit],
    queryFn: async (): Promise<SocraticSession[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];

      const { data, error } = await supabase
        .from("socratic_sessions")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("Could not load socratic sessions from Supabase:", error.message);
        return [];
      }

      return (data as unknown as SocraticSession[]) ?? [];
    },
  });
}

export function useStudentMisconceptions(topic?: string) {
  return useQuery({
    queryKey: ["student_misconceptions", topic],
    queryFn: async (): Promise<{ active: StudentMisconception[]; resolved: StudentMisconception[] }> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { active: [], resolved: [] };

      let query = supabase
        .from("student_misconceptions")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("last_detected_at", { ascending: false });

      if (topic) {
        query = query.eq("topic", topic);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Could not load misconceptions from Supabase:", error.message);
        return { active: [], resolved: [] };
      }

      const all = (data as StudentMisconception[]) ?? [];
      return {
        active: all.filter((m) => !m.resolved),
        resolved: all.filter((m) => m.resolved),
      };
    },
  });
}

export function useInstructorAnalytics() {
  return useQuery({
    queryKey: ["instructor_analytics"],
    queryFn: async (): Promise<InstructorAnalyticsData> => {
      // 1. Misconceptions
      const { data: misconceptions = [] } = await supabase
        .from("student_misconceptions")
        .select("*")
        .order("frequency", { ascending: false })
        .limit(100);

      const miscMap = new Map<
        string,
        {
          topic: string;
          concept: string;
          misconception: string;
          category: string;
          studentCount: number;
          resolvedCount: number;
          severity: "low" | "medium" | "high";
        }
      >();

      for (const m of (misconceptions as StudentMisconception[]) ?? []) {
        const key = `${m.topic}:::${m.misconception}`;
        const existing = miscMap.get(key);
        if (existing) {
          existing.studentCount += m.frequency || 1;
          if (m.resolved) existing.resolvedCount += 1;
        } else {
          miscMap.set(key, {
            topic: m.topic,
            concept: m.concept,
            misconception: m.misconception,
            category: m.category,
            studentCount: m.frequency || 1,
            resolvedCount: m.resolved ? 1 : 0,
            severity: m.severity,
          });
        }
      }

      const commonMisconceptions = Array.from(miscMap.values()).sort(
        (a, b) => b.studentCount - a.studentCount,
      );

      // 2. Sessions
      const { data: sessions = [] } = await supabase
        .from("socratic_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const socraticSessions = (sessions as unknown as SocraticSession[]) ?? [];

      const topicStats = new Map<
        string,
        {
          totalMastery: number;
          totalDefenseQuality: number;
          misconceptionCount: number;
          count: number;
        }
      >();

      let totalEvaluations = 0;
      let correctAnswerWithStrongReasoning = 0;
      let correctAnswerWithWeakReasoning = 0;
      let incorrectWithMisconception = 0;

      for (const s of socraticSessions) {
        totalEvaluations += 1;
        const initial = s.initial_analysis;
        const defense = s.defense_evaluation;

        const isCorrect = initial?.answer_status === "correct";
        const reasoningQual = initial?.reasoning_quality ?? 50;
        const defenseQual = defense?.defense_quality ?? 50;

        if (isCorrect && reasoningQual >= 65) {
          correctAnswerWithStrongReasoning += 1;
        } else if (isCorrect && reasoningQual < 65) {
          correctAnswerWithWeakReasoning += 1;
        }

        if (initial?.misconception_detected) {
          incorrectWithMisconception += 1;
        }

        const tKey = s.topic;
        const current = topicStats.get(tKey) ?? {
          totalMastery: 0,
          totalDefenseQuality: 0,
          misconceptionCount: 0,
          count: 0,
        };

        current.totalMastery += Number(s.mastery_after || 0);
        current.totalDefenseQuality += defenseQual;
        if (initial?.misconception_detected) current.misconceptionCount += 1;
        current.count += 1;
        topicStats.set(tKey, current);
      }

      const difficultConcepts = Array.from(topicStats.entries())
        .map(([topic, stat]) => ({
          topic,
          avgMastery: Math.round(stat.totalMastery / stat.count),
          avgDefenseQuality: Math.round(stat.totalDefenseQuality / stat.count),
          misconceptionRate: Math.round((stat.misconceptionCount / stat.count) * 100),
          totalChallenges: stat.count,
        }))
        .sort((a, b) => a.avgMastery - b.avgMastery || b.misconceptionRate - a.misconceptionRate);

      const totalCorrect = correctAnswerWithStrongReasoning + correctAnswerWithWeakReasoning;
      const memorizationRatio =
        totalCorrect > 0 ? Math.round((correctAnswerWithWeakReasoning / totalCorrect) * 100) : 0;

      return {
        commonMisconceptions: commonMisconceptions.slice(0, 15),
        difficultConcepts: difficultConcepts.slice(0, 10),
        memorizationVsUnderstanding: {
          totalEvaluations,
          correctAnswerWithStrongReasoning,
          correctAnswerWithWeakReasoning,
          incorrectWithMisconception,
          memorizationRatio,
        },
        recentSessions: socraticSessions.slice(0, 10),
      };
    },
  });
}
