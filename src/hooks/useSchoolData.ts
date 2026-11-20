import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ============ INITIAL DISPLAY (admin-managed, not access permissions) ============
export function useDisplayDefaults() {
  return useQuery({
    queryKey: ["display_defaults"],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_display_defaults").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useTeacherDisplayDefaults() {
  return useQuery({
    queryKey: ["teacher_display_defaults"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teacher_display_defaults").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useDisplayDefaultMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const onError = (e: Error) => toast({ title: "Не удалось сохранить", description: e.message, variant: "destructive" });
  const period = useMutation({
    mutationFn: async (row: { target: "journal" | "diary"; quarter_id: string | null }) => {
      const { error } = await supabase.from("school_display_defaults").upsert(row, { onConflict: "target" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["display_defaults"] });
      toast({ title: "Триместр по умолчанию сохранён" });
    },
    onError,
  });
  const teacher = useMutation({
    mutationFn: async (row: { teacher_id: string; class_id: string | null }) => {
      const { error } = await supabase.from("teacher_display_defaults").upsert(row, { onConflict: "teacher_id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["teacher_display_defaults"] });
      toast({ title: "Класс по умолчанию сохранён" });
    },
    onError,
  });
  return { period, teacher };
}

// A failed role request must not be treated as an authenticated user without a role.
export function useSchoolLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.user) throw new Error("Не удалось завершить вход. Попробуйте ещё раз.");
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user.id);
      if (rolesError) throw new Error("Не удалось загрузить права доступа. Проверьте соединение и попробуйте ещё раз.");
      return roles?.map(r => r.role) ?? [];
    },
    retry: false,
  });
}

// ============ TEACHERS ============
export function useCurrentTeacher() {
  return useQuery({
    queryKey: ["current_teacher"],
    retry: 3,
    staleTime: 0,
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return null;
      const { data, error } = await supabase.from("teachers")
        .select("id").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teachers").select("*").order("name");
      if (error) throw error;
      const ids = (data || []).map((teacher: any) => teacher.id);
      const [subjectsResult, classesResult] = await Promise.all([
        ids.length ? supabase.from("teacher_subjects").select("teacher_id, subject_id, pending_removal, subjects(id, name)").in("teacher_id", ids) : Promise.resolve({ data: [], error: null } as any),
        ids.length ? supabase.from("teacher_classes").select("teacher_id, class_id, classes(id, name)").in("teacher_id", ids) : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (subjectsResult.error) throw subjectsResult.error;
      if (classesResult.error) throw classesResult.error;
      return (data || []).map((teacher: any) => ({
        ...teacher,
        teacher_subjects: (subjectsResult.data || []).filter((row: any) => row.teacher_id === teacher.id),
        teacher_classes: (classesResult.data || []).filter((row: any) => row.teacher_id === teacher.id),
      }));
    },
  });
}

export function useTeacherMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (t: { name: string; email: string; phone: string; status: string; password: string; subjects: string[]; classes: string[] }) => {
      // Create teacher record first
      const { data, error } = await supabase.from("teachers").insert({ name: t.name, email: t.email, phone: t.phone, status: t.status }).select().single();
      if (error) throw error;

      // Create auth user via edge function
      if (t.password) {
        const { data: authData, error: authError } = await supabase.functions.invoke("manage-teacher-auth", {
          body: { action: "create", email: t.email, password: t.password, full_name: t.name, teacher_id: data.id },
        });
        if (authError) throw authError;
        if (authData?.error) throw new Error(authData.error);
      }

      if (t.subjects.length > 0) {
        const { error: e1 } = await supabase.from("teacher_subjects").insert(t.subjects.map((sid) => ({ teacher_id: data.id, subject_id: sid })));
        if (e1) throw new Error(`Предметы: ${e1.message}`);
      }
      if (t.classes.length > 0) {
        const { error: e2 } = await supabase.from("teacher_classes").insert(t.classes.map((cid) => ({ teacher_id: data.id, class_id: cid })));
        if (e2) throw new Error(`Классы: ${e2.message}`);
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Учитель добавлен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (t: { id: string; name: string; email: string; phone: string; status: string; password?: string; subjects: string[]; classes: string[] }) => {
      const { error: updErr } = await supabase.from("teachers").update({ name: t.name, email: t.email, phone: t.phone, status: t.status }).eq("id", t.id);
      if (updErr) throw new Error(`Учитель: ${updErr.message}`);

      if (t.password) {
        const { data: teacher } = await supabase.from("teachers").select("user_id").eq("id", t.id).single();
        if (teacher?.user_id) {
          const { data: authData, error: authError } = await supabase.functions.invoke("manage-teacher-auth", {
            body: { action: "update_password", user_id: teacher.user_id, password: t.password, email: t.email },
          });
          if (authError) throw new Error(`Пароль: ${authError.message}`);
          if (authData?.error) throw new Error(`Пароль: ${authData.error}`);
        }
      }

      const { error: delSubErr } = await supabase.from("teacher_subjects").delete().eq("teacher_id", t.id);
      if (delSubErr) throw new Error(`Удаление предметов: ${delSubErr.message}`);
      if (t.subjects.length > 0) {
        const { error: insSubErr } = await supabase.from("teacher_subjects").insert(t.subjects.map((sid) => ({ teacher_id: t.id, subject_id: sid })));
        if (insSubErr) throw new Error(`Сохранение предметов: ${insSubErr.message}`);
      }
      const { error: delClsErr } = await supabase.from("teacher_classes").delete().eq("teacher_id", t.id);
      if (delClsErr) throw new Error(`Удаление классов: ${delClsErr.message}`);
      if (t.classes.length > 0) {
        const { error: insClsErr } = await supabase.from("teacher_classes").insert(t.classes.map((cid) => ({ teacher_id: t.id, class_id: cid })));
        if (insClsErr) throw new Error(`Сохранение классов: ${insClsErr.message}`);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Учитель обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Delete auth user if exists
      const { data: teacher } = await supabase.from("teachers").select("user_id").eq("id", id).single();
      if (teacher?.user_id) {
        await supabase.functions.invoke("manage-teacher-auth", {
          body: { action: "delete", user_id: teacher.user_id },
        });
      }
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teachers"] }); toast({ title: "Учитель удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============ CLASSES ============
export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").order("name");
      if (error) throw error;
      const teacherIds = [...new Set((data || []).map((row: any) => row.teacher_id).filter(Boolean))];
      const classIds = (data || []).map((row: any) => row.id);
      const [teachersResult, studentsResult] = await Promise.all([
        teacherIds.length ? supabase.from("teachers").select("id, name").in("id", teacherIds) : Promise.resolve({ data: [], error: null } as any),
        classIds.length ? supabase.from("students").select("id, class_id").in("class_id", classIds) : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (teachersResult.error) throw teachersResult.error;
      if (studentsResult.error) throw studentsResult.error;
      const teachers = new Map((teachersResult.data || []).map((teacher: any) => [teacher.id, teacher]));
      const counts = new Map<string, number>();
      (studentsResult.data || []).forEach((student: any) => counts.set(student.class_id, (counts.get(student.class_id) || 0) + 1));
      return (data || []).map((row: any) => ({ ...row, teachers: teachers.get(row.teacher_id) || null, students: { count: counts.get(row.id) || 0 } }));
    },
  });
}

export function useClassMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (c: { name: string; teacher_id: string | null; year: string }) => {
      const { data, error } = await supabase.from("classes").insert(c).select().single();
      if (error) throw error;
      // Auto-add teacher_classes entry for homeroom teacher
      if (c.teacher_id && data) {
        await supabase.from("teacher_classes").upsert(
          { teacher_id: c.teacher_id, class_id: data.id },
          { onConflict: "teacher_id,class_id", ignoreDuplicates: true }
        );
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); qc.invalidateQueries({ queryKey: ["teacher_classes_list"] }); toast({ title: "Класс создан" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (c: { id: string; name: string; teacher_id: string | null; year: string }) => {
      const { error } = await supabase.from("classes").update({ name: c.name, teacher_id: c.teacher_id, year: c.year }).eq("id", c.id);
      if (error) throw error;
      // Auto-add teacher_classes entry for new homeroom teacher
      if (c.teacher_id) {
        await supabase.from("teacher_classes").upsert(
          { teacher_id: c.teacher_id, class_id: c.id },
          { onConflict: "teacher_id,class_id", ignoreDuplicates: true }
        );
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); qc.invalidateQueries({ queryKey: ["teacher_classes_list"] }); toast({ title: "Класс обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Класс удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============ STUDENTS ============
export function useStudents(classId?: string) {
  return useQuery({
    queryKey: ["students", classId],
    queryFn: async () => {
      let q = supabase.from("students").select("*").order("name");
      if (classId) q = q.eq("class_id", classId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: classId !== null,
  });
}

export function useAllStudents() {
  return useQuery({
    queryKey: ["students", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (s: { name: string; class_id: string }) => {
      const { error } = await supabase.from("students").insert(s);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Ученик добавлен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Ученик удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (s: { id: string; name: string; class_id: string }) => {
      const { error } = await supabase.from("students").update({ name: s.name, class_id: s.class_id }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: "Ученик обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const bulkTransfer = useMutation({
    mutationFn: async ({ studentIds, classId }: { studentIds: string[]; classId: string }) => {
      const { error } = await supabase.from("students").update({ class_id: classId }).in("id", studentIds);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["classes"] }); toast({ title: `${vars.studentIds.length} уч. переведены` }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, remove, update, bulkTransfer };
}

// ============ SUBJECTS ============
export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useSubjectMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (s: { name: string; hours_per_week: number }) => {
      const { error } = await supabase.from("subjects").insert(s);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); toast({ title: "Предмет добавлен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (s: { id: string; name: string; hours_per_week: number }) => {
      const { error } = await supabase.from("subjects").update({ name: s.name, hours_per_week: s.hours_per_week }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); toast({ title: "Предмет обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); toast({ title: "Предмет удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============ CLASS SUBJECTS ============
export function useAllClassSubjects() {
  return useQuery({
    queryKey: ["all_class_subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_subjects").select("class_id, teacher_id");
      if (error) throw error;
      return data;
    },
  });
}

export function useClassSubjects(classId?: string) {
  return useQuery({
    queryKey: ["class_subjects", classId],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_subjects").select("*").eq("class_id", classId!);
      if (error) throw error;
      const subjectIds = [...new Set((data || []).map((row: any) => row.subject_id).filter(Boolean))];
      const teacherIds = [...new Set((data || []).map((row: any) => row.teacher_id).filter(Boolean))];
      const [subjectsResult, teachersResult] = await Promise.all([
        subjectIds.length ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [], error: null } as any),
        teacherIds.length ? supabase.from("teachers").select("id, name").in("id", teacherIds) : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (subjectsResult.error) throw subjectsResult.error;
      if (teachersResult.error) throw teachersResult.error;
      const subjects = new Map((subjectsResult.data || []).map((row: any) => [row.id, row]));
      const teachers = new Map((teachersResult.data || []).map((row: any) => [row.id, row]));
      return (data || []).map((row: any) => ({ ...row, subjects: subjects.get(row.subject_id) || null, teachers: teachers.get(row.teacher_id) || null }));
    },
    enabled: !!classId,
  });
}

export function useClassSubjectMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (cs: { class_id: string; subject_id: string; teacher_id: string; hours_per_week: number }) => {
      const { error } = await supabase.from("class_subjects").insert(cs);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["class_subjects"] }); toast({ title: "Предмет назначен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["class_subjects"] }); toast({ title: "Предмет убран" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, remove };
}

// ============ ACADEMIC CALENDAR ============
export function useAcademicCalendar() {
  return useQuery({
    queryKey: ["academic_calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_calendar").select("*").order("date");
      if (error) throw error;
      return data;
    },
  });
}

export function useCalendarMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (days: { date: string; day_type: string; label: string }[]) => {
      const { error } = await supabase.from("academic_calendar").upsert(days, { onConflict: "date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_calendar"] }); toast({ title: "Календарь обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase.from("academic_calendar").delete().eq("date", date);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_calendar"] }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const removeBatch = useMutation({
    mutationFn: async (dates: string[]) => {
      const { error } = await supabase.from("academic_calendar").delete().in("date", dates);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_calendar"] }); toast({ title: "Дни удалены" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, remove, removeBatch };
}

// ============ QUARTERS ============
export function useQuarters() {
  return useQuery({
    queryKey: ["quarters"],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_quarters").select("*").order("start_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useQuarterMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (q: { name: string; start_date: string; end_date: string; year: string }) => {
      const { error } = await supabase.from("academic_quarters").insert(q);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quarters"] }); toast({ title: "Триместр добавлен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (q: { id: string; name: string; start_date: string; end_date: string; year: string }) => {
      const { error } = await supabase.from("academic_quarters").update({ name: q.name, start_date: q.start_date, end_date: q.end_date, year: q.year }).eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quarters"] }); toast({ title: "Триместр обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("academic_quarters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quarters"] }); toast({ title: "Триместр удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const setAccess = useMutation({
    mutationFn: async (p: { id: string; access_mode: "auto" | "open" | "closed" }) => {
      const { error } = await supabase.from("academic_quarters").update({ access_mode: p.access_mode } as any).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quarters"] }); toast({ title: "Доступ к триместру обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove, setAccess };
}

// ============ JOURNAL DATE ACCESS ============
export function useJournalDateAccess(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["journal_date_access", classId, subjectId],
    queryFn: async () => {
      let q = supabase
        .from("journal_date_access")
        .select("*")
        .order("date");
      if (classId) q = q.eq("class_id", classId);
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
  });
}

export function useJournalDateAccessMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const open = useMutation({
    mutationFn: async (p: { class_id: string; subject_id: string; date: string; reason?: string | null }) => {
      const { error } = await supabase
        .from("journal_date_access")
        .upsert(p as any, { onConflict: "class_id,subject_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal_date_access"] }); toast({ title: "Дата открыта" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const close = useMutation({
    mutationFn: async (p: { class_id: string; subject_id: string; date: string }) => {
      const { error } = await supabase
        .from("journal_date_access")
        .delete()
        .eq("class_id", p.class_id)
        .eq("subject_id", p.subject_id)
        .eq("date", p.date);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal_date_access"] }); toast({ title: "Дата снова закрыта" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  /** Массовое применение: открыть/закрыть набор клеток (предмет + дата) */
  const applyMany = useMutation({
    mutationFn: async (p: {
      class_id: string;
      open: { subject_id: string; date: string }[];
      close: { subject_id: string; date: string }[];
      reason?: string | null;
    }) => {
      if (p.open.length) {
        const rows = p.open.map((o) => ({
          class_id: p.class_id,
          subject_id: o.subject_id,
          date: o.date,
          reason: p.reason ?? "Открыто администратором",
        }));
        const { error } = await supabase
          .from("journal_date_access")
          .upsert(rows as any, { onConflict: "class_id,subject_id,date" });
        if (error) throw error;
      }
      for (const cItem of p.close) {
        const { error } = await supabase
          .from("journal_date_access")
          .delete()
          .eq("class_id", p.class_id)
          .eq("subject_id", cItem.subject_id)
          .eq("date", cItem.date);
        if (error) throw error;
      }
    },
    onSuccess: (_d, p) => {
      qc.invalidateQueries({ queryKey: ["journal_date_access"] });
      const parts: string[] = [];
      if (p.open.length) parts.push(`открыто: ${p.open.length}`);
      if (p.close.length) parts.push(`закрыто: ${p.close.length}`);
      toast({ title: "Доступ обновлён", description: parts.join(", ") });
    },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { open, close, applyMany };
}


// ============ GRADES ============
export function useGrades(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["grades", classId, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("class_id", classId!)
        .eq("subject_id", subjectId!)
        .order("date");
      if (error) throw error;
      const workTypeIds = [...new Set((data || []).map((grade: any) => grade.work_type_id).filter(Boolean))];
      if (!workTypeIds.length) return data || [];
      const { data: workTypes, error: workTypesError } = await supabase
        .from("work_types").select("id, name, short_name").in("id", workTypeIds);
      if (workTypesError) throw workTypesError;
      const workTypeMap = new Map((workTypes || []).map((workType: any) => [workType.id, workType]));
      return (data || []).map((grade: any) => ({ ...grade, work_types: workTypeMap.get(grade.work_type_id) || null }));
    },
    enabled: !!classId && !!subjectId,
  });
}

export function useGradeMutations() {
  const qc = useQueryClient();

  const add = useMutation({
    mutationFn: async (g: { student_id: string; subject_id: string; class_id: string; date: string; value: number; provisional_until?: string | null; work_type_id?: string | null; comment?: string | null; weight?: number }) => {
      const { error } = await supabase.from("grades").insert(g as any);
      if (error) throw error;
    },
    onMutate: async (g) => {
      const key = ["grades", g.class_id, g.subject_id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key);
      // Look up work_type metadata from cache so the optimistic row matches the joined shape
      const workTypes = qc.getQueryData<any[]>(["work_types", g.subject_id]) || [];
      const wt = g.work_type_id ? workTypes.find((w: any) => w.id === g.work_type_id) : null;
      const optimistic = {
        id: `tmp-${Date.now()}-${Math.random()}`,
        ...g,
        created_at: new Date().toISOString(),
        work_types: wt ? { name: wt.name, short_name: wt.short_name } : null,
      };
      qc.setQueryData<any[]>(key, [...(prev || []), optimistic]);
      return { prev, key };
    },
    onError: (_err, _g, ctx) => { if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev); },
    onSettled: (_data, _err, g) => {
      qc.invalidateQueries({ queryKey: ["grades", g.class_id, g.subject_id] });
      qc.invalidateQueries({ queryKey: ["diary_grade_history", g.class_id, g.student_id] });
      qc.invalidateQueries({ queryKey: ["diary_grades", g.class_id] });
    },
  });

  const update = useMutation({
    mutationFn: async (params: { id: string; value?: number; provisional_until?: string | null; comment?: string | null }) => {
      const updateData: any = {};
      if (params.value !== undefined) updateData.value = params.value;
      if (params.provisional_until !== undefined) updateData.provisional_until = params.provisional_until;
      if (params.comment !== undefined) updateData.comment = params.comment;
      const { error } = await supabase.from("grades").update(updateData).eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["diary_grade_history"] });
      qc.invalidateQueries({ queryKey: ["diary_grades"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (params: { id: string }) => {
      const { error } = await supabase.from("grades").delete().eq("id", params.id);
      if (error) throw error;
    },
    onMutate: async (params) => {
      // Optimistically remove from any grades query cache
      const snapshots: { key: any; data: any }[] = [];
      qc.getQueryCache().findAll({ queryKey: ["grades"] }).forEach((q) => {
        const data = q.state.data as any[] | undefined;
        if (Array.isArray(data)) {
          snapshots.push({ key: q.queryKey, data });
          qc.setQueryData(q.queryKey, data.filter((row: any) => row.id !== params.id));
        }
      });
      return { snapshots };
    },
    onError: (_err, _p, ctx) => { ctx?.snapshots?.forEach(s => qc.setQueryData(s.key, s.data)); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["grades"] });
      qc.invalidateQueries({ queryKey: ["diary_grade_history"] });
      qc.invalidateQueries({ queryKey: ["diary_grades"] });
    },
  });

  return { add, update, remove };
}

// ============ ABSENCES ============
export function useAbsences(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["absences", classId, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("absences")
        .select("*")
        .eq("class_id", classId!)
        .eq("subject_id", subjectId!)
        .order("date");
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId,
  });
}

export function useAbsenceMutations() {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: async (a: { student_id: string; class_id: string; subject_id: string; date: string; type: string }) => {
      const { error } = await supabase.from("absences").upsert(a as any, { onConflict: "student_id,class_id,subject_id,date" });
      if (error) throw error;
    },
    onMutate: async (a) => {
      const key = ["absences", a.class_id, a.subject_id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key);
      const filtered = (prev || []).filter((r: any) => !(r.student_id === a.student_id && r.date === a.date));
      qc.setQueryData<any[]>(key, [...filtered, { id: `tmp-${Date.now()}`, ...a }]);
      return { prev, key };
    },
    onError: (_e, _a, ctx) => { if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev); },
    onSettled: (_d, _e, a) => { qc.invalidateQueries({ queryKey: ["absences", a.class_id, a.subject_id] }); },
  });

  const remove = useMutation({
    mutationFn: async (params: { student_id: string; class_id: string; subject_id: string; date: string }) => {
      const { error } = await supabase.from("absences").delete()
        .eq("student_id", params.student_id)
        .eq("class_id", params.class_id)
        .eq("subject_id", params.subject_id)
        .eq("date", params.date);
      if (error) throw error;
    },
    onMutate: async (p) => {
      const key = ["absences", p.class_id, p.subject_id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key);
      qc.setQueryData<any[]>(key, (prev || []).filter((r: any) => !(r.student_id === p.student_id && r.date === p.date)));
      return { prev, key };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev); },
    onSettled: (_d, _e, p) => { qc.invalidateQueries({ queryKey: ["absences", p.class_id, p.subject_id] }); },
  });

  return { upsert, remove };
}

// ============ WORK TYPES ============
export function useWorkTypes(subjectId?: string) {
  return useQuery({
    queryKey: ["work_types", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_types")
        .select("*")
        .or(subjectId ? `subject_id.eq.${subjectId},subject_id.is.null` : "subject_id.is.null")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: subjectId !== undefined,
  });
}

export function useAllWorkTypes() {
  return useQuery({
    queryKey: ["work_types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_types").select("*, subjects(name)").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkTypeMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (wt: { subject_id: string | null; name: string; short_name: string }) => {
      const { error } = await supabase.from("work_types").insert(wt as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_types"] }); toast({ title: "Вид работы добавлен" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (wt: { id: string; name: string; short_name: string }) => {
      const { error } = await supabase.from("work_types").update({ name: wt.name, short_name: wt.short_name } as any).eq("id", wt.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_types"] }); toast({ title: "Вид работы обновлён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_types"] }); toast({ title: "Вид работы удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { create, update, remove };
}

// ============ SCHEDULED WORKS ============
export function useScheduledWorks(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["scheduled_works", classId, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_works")
        .select("*, work_types(name, short_name)")
        .eq("class_id", classId!)
        .eq("subject_id", subjectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId,
  });
}

export function useScheduledWorkMutations() {
  const qc = useQueryClient();

  const set = useMutation({
    mutationFn: async (sw: { class_id: string; subject_id: string; date: string; work_type_id: string }) => {
      const { error } = await supabase.from("scheduled_works").upsert(sw as any, { onConflict: "class_id,subject_id,date" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled_works"] }); },
  });

  const remove = useMutation({
    mutationFn: async (params: { class_id: string; subject_id: string; date: string }) => {
      const { error } = await supabase.from("scheduled_works").delete()
        .eq("class_id", params.class_id).eq("subject_id", params.subject_id).eq("date", params.date);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scheduled_works"] }); },
  });

  return { set, remove };
}

// ============ TRIMESTER GRADES ============
export function useTrimesterGradesByClassSubject(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["trimester_grades", classId, subjectId, "all_quarters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trimester_grades")
        .select("*")
        .eq("class_id", classId!)
        .eq("subject_id", subjectId!);
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId,
  });
}

export function useAllTrimesterGrades() {
  return useQuery({
    queryKey: ["trimester_grades", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trimester_grades")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useTrimesterGrades(classId?: string, subjectId?: string, quarterId?: string) {
  return useQuery({
    queryKey: ["trimester_grades", classId, subjectId, quarterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trimester_grades")
        .select("*")
        .eq("class_id", classId!)
        .eq("subject_id", subjectId!)
        .eq("quarter_id", quarterId!);
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId && !!quarterId,
  });
}

export function useTrimesterGradeMutations() {
  const qc = useQueryClient();

  const upsertMany = useMutation({
    mutationFn: async (rows: { student_id: string; subject_id: string; class_id: string; quarter_id: string; value: number }[]) => {
      if (!rows.length) return [];
      const { data, error } = await supabase.from("trimester_grades")
        .upsert(rows, { onConflict: "student_id,subject_id,class_id,quarter_id" }).select();
      if (error) throw error;
      if (data.length !== rows.length) throw new Error("Не все триместровые оценки сохранены");
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trimester_grades"] }); },
  });

  const upsert = useMutation({
    mutationFn: async (params: { student_id: string; subject_id: string; class_id: string; quarter_id: string; value: number }) => {
      console.log("Upserting trimester grade:", params);
      const { error } = await supabase.from("trimester_grades").upsert(params, { onConflict: "student_id,subject_id,class_id,quarter_id" });
      if (error) {
        console.error("Trimester grade upsert error:", error);
        throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trimester_grades"] }); },
    onError: (err) => { console.error("Trimester mutation failed:", err); },
  });

  const remove = useMutation({
    mutationFn: async (params: { student_id: string; subject_id: string; class_id: string; quarter_id: string }) => {
      const { error } = await supabase.from("trimester_grades").delete()
        .eq("student_id", params.student_id)
        .eq("subject_id", params.subject_id)
        .eq("class_id", params.class_id)
        .eq("quarter_id", params.quarter_id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trimester_grades"] }); },
  });

  return { upsert, upsertMany, remove };
}

// ============ CELL COMMENTS ============
export function useCellComments(classId?: string, subjectId?: string) {
  return useQuery({
    queryKey: ["cell_comments", classId, subjectId],
    queryFn: async () => {
      if (!classId || !subjectId) return [];
      const { data, error } = await supabase
        .from("cell_comments")
        .select("*")
        .eq("class_id", classId)
        .eq("subject_id", subjectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId && !!subjectId,
  });
}

export function useCellCommentMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const upsert = useMutation({
    mutationFn: async (params: { student_id: string; subject_id: string; class_id: string; date: string; comment: string }) => {
      if (!params.comment.trim()) {
        const { error } = await supabase
          .from("cell_comments")
          .delete()
          .eq("student_id", params.student_id)
          .eq("subject_id", params.subject_id)
          .eq("date", params.date);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("cell_comments")
        .upsert(
          { ...params, updated_at: new Date().toISOString() },
          { onConflict: "student_id,subject_id,date" }
        );
      if (error) throw error;
    },
    onMutate: async (params) => {
      const key = ["cell_comments", params.class_id, params.subject_id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key);
      const filtered = (prev || []).filter((r: any) => !(r.student_id === params.student_id && r.date === params.date));
      const next = params.comment.trim()
        ? [...filtered, { id: `tmp-${Date.now()}`, ...params }]
        : filtered;
      qc.setQueryData<any[]>(key, next);
      return { prev, key };
    },
    onError: (e: any, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    },
    onSettled: (_d, _e, p) => { qc.invalidateQueries({ queryKey: ["cell_comments", p.class_id, p.subject_id] }); },
  });

  return { upsert };
}

// ============ CLASS SCHEDULE ============
export type ScheduleSlot = {
  id: string;
  class_id: string;
  subject_id: string;
  day_of_week: number;
  lesson_number: number;
  room: string | null;
  published: boolean;
  subjects?: { name: string } | null;
};

export function useClassSchedule(classId?: string, onlyPublished = false) {
  return useQuery({
    queryKey: ["class_schedule", classId, onlyPublished],
    queryFn: async () => {
      let q = supabase
        .from("class_schedule")
        .select("*, subjects(name)")
        .eq("class_id", classId!)
        .order("day_of_week")
        .order("lesson_number");
      if (onlyPublished) q = q.eq("published", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ScheduleSlot[];
    },
    enabled: !!classId,
  });
}

export function useClassScheduleMutations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["class_schedule"] });

  const add = useMutation({
    mutationFn: async (slot: { class_id: string; subject_id: string; day_of_week: number; lesson_number: number; room?: string | null }) => {
      const { error } = await supabase.from("class_schedule").upsert(
        { ...slot, published: false } as any,
        { onConflict: "class_id,day_of_week,lesson_number" }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Урок добавлен в расписание" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_schedule").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Урок удалён" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const publish = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from("class_schedule").update({ published: true } as any).eq("class_id", classId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Расписание утверждено", description: "Даты в журнале синхронизированы" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  const unpublish = useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase.from("class_schedule").update({ published: false } as any).eq("class_id", classId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Утверждение снято" }); },
    onError: (e: any) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return { add, remove, publish, unpublish };
}

// ============ DIARY HOMEWORK / NOTIFICATIONS ============
export function useDiaryHomework(classId?: string, homeworkId?: string) {
  return useQuery({
    queryKey: ["diary_homework", classId, homeworkId],
    enabled: Boolean(classId),
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      if (!classId) return [];
      let query = supabase.from("homework")
        .select("id, title, description, due_date, created_at, subject_id, subjects(name), teachers(name)")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });
      if (homeworkId) query = query.eq("id", homeworkId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Load every diary grade, including pending corrections; filter only statistics, not visibility. */
export function useDiaryGrades(classId?: string, studentId?: string | null, subjectId?: string, date?: string, gradeId?: string) {
  return useQuery({
    queryKey: ["diary_grades", classId, studentId, subjectId, date, gradeId],
    enabled: Boolean(classId),
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      if (!classId) return [];
      let query = supabase.from("grades")
        .select("id, value, date, created_at, student_id, subject_id, class_id, work_type_id, weight, comment, provisional_until")
        .eq("class_id", classId);
      if (studentId) query = query.eq("student_id", studentId);
      if (subjectId) query = query.eq("subject_id", subjectId);
      if (date) query = query.eq("date", date);
      if (gradeId) query = query.eq("id", gradeId);
      const { data, error } = await query.order("date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDiaryGradeHistory(classId?: string, studentId?: string | null) {
  return useQuery({
    queryKey: ["diary_grade_history", classId, studentId],
    enabled: Boolean(classId && studentId),
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      if (!classId || !studentId) return { rows: [], subjects: [], categories: [], absences: [] };
      const [history, subjects, categories, absences, weights] = await Promise.all([
        supabase.from("grade_history").select("id, student_id, subject_id, grade_id, work_type_id, action, old_value, new_value, changed_at, changed_by_name, date, comment")
          .eq("class_id", classId).eq("student_id", studentId).in("action", ["added", "changed", "commented", "removed"]).order("changed_at", { ascending: false }),
        supabase.from("subjects").select("id, name"),
        supabase.from("work_types").select("id, name"),
        supabase.from("absences").select("id, student_id, subject_id, date, type, created_at")
          .eq("class_id", classId).eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("grades").select("id, weight, provisional_until").eq("class_id", classId).eq("student_id", studentId),
      ]);
      if (history.error) throw history.error;
      if (subjects.error) throw subjects.error;
      if (categories.error) throw categories.error;
      if (absences.error) throw absences.error;
      if (weights.error) throw weights.error;
      const gradeById = new Map((weights.data ?? []).map((g) => [g.id, g]));
      const rows = (history.data ?? []).map((r) => {
        const current = r.grade_id ? gradeById.get(r.grade_id) : undefined;
        return { ...r, weight: current?.weight ?? 1, provisional_until: current?.provisional_until ?? null };
      });
      return { rows, subjects: subjects.data ?? [], categories: categories.data ?? [], absences: absences.data ?? [] };
    },
  });
}
