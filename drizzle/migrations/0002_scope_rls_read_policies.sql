-- Helper functions ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_teacher_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.teachers WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_school_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.class_accounts WHERE user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.teaches_class(_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes tc
    WHERE tc.class_id = _class_id AND tc.teacher_id = public.my_teacher_id()
  ) OR EXISTS (
    SELECT 1 FROM public.class_subjects cs
    WHERE cs.class_id = _class_id AND cs.teacher_id = public.my_teacher_id()
  ) OR EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = _class_id AND c.teacher_id = public.my_teacher_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_class(_class_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.teaches_class(_class_id)
      OR _class_id = public.get_my_class_id()
$$;

-- Class-scoped tables -------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read absences" ON public.absences;
CREATE POLICY "Class members can read absences" ON public.absences
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read cell_comments" ON public.cell_comments;
CREATE POLICY "Class members can read cell_comments" ON public.cell_comments
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read grade_history" ON public.grade_history;
CREATE POLICY "Class members can read grade_history" ON public.grade_history
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read grades" ON public.grades;
CREATE POLICY "Class members can read grades" ON public.grades
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read trimester_grades" ON public.trimester_grades;
CREATE POLICY "Class members can read trimester_grades" ON public.trimester_grades
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read homework" ON public.homework;
CREATE POLICY "Class members can read homework" ON public.homework
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read scheduled_works" ON public.scheduled_works;
CREATE POLICY "Class members can read scheduled_works" ON public.scheduled_works
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read students" ON public.students;
CREATE POLICY "Class members can read students" ON public.students
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read classes" ON public.classes;
CREATE POLICY "Class members can read classes" ON public.classes
  FOR SELECT TO authenticated USING (public.can_access_class(id));

DROP POLICY IF EXISTS "Authenticated can read class_subjects" ON public.class_subjects;
CREATE POLICY "Class members can read class_subjects" ON public.class_subjects
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));

DROP POLICY IF EXISTS "Authenticated can read teacher_classes" ON public.teacher_classes;
CREATE POLICY "Class members can read teacher_classes" ON public.teacher_classes
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR teacher_id = public.my_teacher_id()
    OR public.can_access_class(class_id)
  );

-- Schedule ------------------------------------------------------------------
DROP POLICY IF EXISTS "class_schedule readable by everyone" ON public.class_schedule;
DROP POLICY IF EXISTS "class_schedule writable by authenticated" ON public.class_schedule;
CREATE POLICY "Class members can read class_schedule" ON public.class_schedule
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));
CREATE POLICY "Admins manage class_schedule" ON public.class_schedule
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Shared reference data -----------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read subjects" ON public.subjects;
CREATE POLICY "School members can read subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.is_school_member());

DROP POLICY IF EXISTS "Authenticated can read work_types" ON public.work_types;
CREATE POLICY "School members can read work_types" ON public.work_types
  FOR SELECT TO authenticated USING (public.is_school_member());

DROP POLICY IF EXISTS "Authenticated can read calendar" ON public.academic_calendar;
CREATE POLICY "School members can read calendar" ON public.academic_calendar
  FOR SELECT TO authenticated USING (public.is_school_member());

DROP POLICY IF EXISTS "Authenticated can read quarters" ON public.academic_quarters;
CREATE POLICY "School members can read quarters" ON public.academic_quarters
  FOR SELECT TO authenticated USING (public.is_school_member());

DROP POLICY IF EXISTS "Authenticated can read teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Staff can read teacher_subjects" ON public.teacher_subjects
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      WHERE cs.teacher_id = teacher_subjects.teacher_id
        AND cs.class_id = public.get_my_class_id()
    )
  );

-- Teachers ------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read teachers" ON public.teachers;
CREATE POLICY "Staff and own class can read teachers" ON public.teachers
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.class_subjects cs
      WHERE cs.teacher_id = teachers.id
        AND cs.class_id = public.get_my_class_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.teacher_id = teachers.id
        AND c.id = public.get_my_class_id()
    )
  );