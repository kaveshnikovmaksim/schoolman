
-- Drop restrictive policies and recreate as permissive for academic_calendar
DROP POLICY IF EXISTS "Admins can manage calendar" ON public.academic_calendar;
DROP POLICY IF EXISTS "Authenticated can read calendar" ON public.academic_calendar;

CREATE POLICY "Admins can manage calendar" ON public.academic_calendar
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read calendar" ON public.academic_calendar
  FOR SELECT TO authenticated
  USING (true);

-- Same fix for academic_quarters
DROP POLICY IF EXISTS "Admins can manage quarters" ON public.academic_quarters;
DROP POLICY IF EXISTS "Authenticated can read quarters" ON public.academic_quarters;

CREATE POLICY "Admins can manage quarters" ON public.academic_quarters
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read quarters" ON public.academic_quarters
  FOR SELECT TO authenticated
  USING (true);

-- Fix for all other tables with same issue
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated can read classes" ON public.classes;
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read classes" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Authenticated can read students" ON public.students;
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read students" ON public.students FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated can read subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated can read teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage class_subjects" ON public.class_subjects;
DROP POLICY IF EXISTS "Authenticated can read class_subjects" ON public.class_subjects;
CREATE POLICY "Admins can manage class_subjects" ON public.class_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read class_subjects" ON public.class_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage teacher_subjects" ON public.teacher_subjects;
DROP POLICY IF EXISTS "Authenticated can read teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admins can manage teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read teacher_subjects" ON public.teacher_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage teacher_classes" ON public.teacher_classes;
DROP POLICY IF EXISTS "Authenticated can read teacher_classes" ON public.teacher_classes;
CREATE POLICY "Admins can manage teacher_classes" ON public.teacher_classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can read teacher_classes" ON public.teacher_classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read grades" ON public.grades;
DROP POLICY IF EXISTS "Teachers and admins can manage grades" ON public.grades;
CREATE POLICY "Teachers and admins can manage grades" ON public.grades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Authenticated can read grades" ON public.grades FOR SELECT TO authenticated USING (true);
