import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type GradeHistoryEntry = {
  id: string;
  action: "added" | "changed" | "removed";
  old_value: number | null;
  new_value: number | null;
  changed_by_name: string | null;
  changed_at: string;
};

/** History of grade changes for a specific student/subject/date cell. */
export function useGradeHistory(studentId?: string, subjectId?: string, date?: string, enabled = true) {
  return useQuery({
    queryKey: ["grade_history", studentId, subjectId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_history")
        .select("id, action, old_value, new_value, changed_by_name, changed_at")
        .eq("student_id", studentId!)
        .eq("subject_id", subjectId!)
        .eq("date", date!)
        .order("changed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as GradeHistoryEntry[];
    },
    enabled: enabled && !!studentId && !!subjectId && !!date,
  });
}
