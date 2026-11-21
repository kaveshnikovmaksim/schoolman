import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useCurrentTeacher, useTeacherDisplayDefaults } from "@/hooks/useSchoolData";
import { displayClass } from "@/lib/displayDefaults";

interface TeacherSubject {
  id: string;
  name: string;
  pending_removal: boolean;
}

interface TeacherContextType {
  teacherId: string | null;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  teacherClasses: any[] | undefined;
  teacherSubjects: TeacherSubject[] | undefined; // only ACTIVE (non-pending) subjects
  pendingSubjects: TeacherSubject[] | undefined; // subjects awaiting admin final decision
  allTeacherSubjects: TeacherSubject[] | undefined; // active + pending (for the "submit request" UI)
  isCurrentSubjectPending: boolean; // true if selected subject is pending_removal (read-only mode)
  isLoading: boolean;
}

const TeacherContext = createContext<TeacherContextType | null>(null);

export function useTeacherContext() {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error("useTeacherContext must be used within TeacherProvider");
  return ctx;
}

export function TeacherProvider({ children }: { children: ReactNode }) {
  const { data: currentTeacher, isLoading: teacherLoading } = useCurrentTeacher();
  const teacherId = currentTeacher?.id ?? null;
  const defaults = useTeacherDisplayDefaults();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  // Fetch teacher's classes
  const { data: teacherClasses, isLoading: classesLoading } = useQuery({
    queryKey: ["teacher_classes_list", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const [tc, cs, own] = await Promise.all([
        supabase.from("teacher_classes").select("class_id").eq("teacher_id", teacherId),
        supabase.from("class_subjects").select("class_id").eq("teacher_id", teacherId),
        supabase.from("classes").select("id, name").eq("teacher_id", teacherId),
      ]);
      if (tc.error) throw tc.error;
      if (cs.error) throw cs.error;
      if (own.error) throw own.error;
      const map = new Map<string, any>();
      const linkedIds = [...(tc.data || []), ...(cs.data || [])].map((row: any) => row.class_id).filter(Boolean);
      if (linkedIds.length) {
        const { data: linkedClasses, error: linkedError } = await supabase
          .from("classes").select("id, name").in("id", linkedIds);
        if (linkedError) throw linkedError;
        (linkedClasses || []).forEach((c: any) => map.set(c.id, c));
      }
      (own.data || []).forEach((c: any) => map.set(c.id, c));
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));
    },
    enabled: !!teacherId,
  });

  // Fetch teacher's subjects (with pending_removal flag)
  const { data: allTeacherSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["teacher_subjects_list", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from("teacher_subjects")
        .select("subject_id, pending_removal")
        .eq("teacher_id", teacherId);
      if (error) throw error;
      const ids = (data || []).map((row: any) => row.subject_id).filter(Boolean);
      if (!ids.length) return [];
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects").select("id, name").in("id", ids);
      if (subjectsError) throw subjectsError;
      const names = new Map((subjects || []).map((subject: any) => [subject.id, subject.name]));
      return (data || []).map((ts: any) => ({
        id: ts.subject_id,
        name: names.get(ts.subject_id) || "",
        pending_removal: !!ts.pending_removal,
      })).filter((subject: TeacherSubject) => subject.name) as TeacherSubject[];
    },
    enabled: !!teacherId,
  });

  const teacherSubjects = allTeacherSubjects?.filter(s => !s.pending_removal);
  const pendingSubjects = allTeacherSubjects?.filter(s => s.pending_removal);

  // Auto-select first class/subject (prefer ACTIVE subjects, fall back to pending if only those exist)
  useEffect(() => {
    if (teacherClasses?.length && !selectedClassId) {
      const initial = displayClass(teacherClasses, defaults.data?.find(r => r.teacher_id === teacherId)?.class_id);
      if (initial) setSelectedClassId(initial.id);
    }
  }, [teacherClasses, selectedClassId, defaults.data, defaults.isPending, teacherId]);

  useEffect(() => {
    if (!allTeacherSubjects) return;
    if (!selectedSubjectId) {
      const first = teacherSubjects?.[0]?.id || allTeacherSubjects[0]?.id || "";
      if (first) setSelectedSubjectId(first);
      return;
    }
    // If selected subject no longer exists at all (was permanently removed) — switch
    if (!allTeacherSubjects.find(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(teacherSubjects?.[0]?.id || allTeacherSubjects[0]?.id || "");
    }
  }, [allTeacherSubjects, teacherSubjects, selectedSubjectId]);

  const isCurrentSubjectPending = !!allTeacherSubjects?.find(
    s => s.id === selectedSubjectId && s.pending_removal
  );

  return (
    <TeacherContext.Provider
      value={{
        teacherId,
        selectedClassId,
        setSelectedClassId,
        selectedSubjectId,
        setSelectedSubjectId,
        teacherClasses,
        teacherSubjects,
        pendingSubjects,
        allTeacherSubjects,
        isCurrentSubjectPending,
        isLoading: teacherLoading || classesLoading || subjectsLoading,
      }}
    >
      {children}
    </TeacherContext.Provider>
  );
}
