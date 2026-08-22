import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExamDashboardData } from "./exam-planner.functions";
import type { ExamDashboardData } from "./exam-planner/types";

export function useExamDashboard(examId?: string) {
  const fetchDashboard = useServerFn(getExamDashboardData);

  return useQuery<ExamDashboardData | null>({
    queryKey: ["exam-dashboard", examId ?? "latest"],
    queryFn: async () => {
      try {
        return await fetchDashboard({ data: { examId } });
      } catch (err) {
        console.warn("No active exam found or error fetching exam dashboard:", err);
        return null;
      }
    },
    staleTime: 1000 * 30, // 30s
  });
}
