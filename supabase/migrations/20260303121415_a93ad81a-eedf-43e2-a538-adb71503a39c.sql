
-- Teachers info table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read teachers" ON public.teachers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- School classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  year TEXT NOT NULL DEFAULT '2025-2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read students" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  hours_per_week INT NOT NULL DEFAULT 3 CHECK (hours_per_week > 0 AND hours_per_week <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Class-Subject assignment (which subject is taught in which class by which teacher)
CREATE TABLE public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  hours_per_week INT NOT NULL DEFAULT 3 CHECK (hours_per_week > 0 AND hours_per_week <= 10),
  UNIQUE (class_id, subject_id)
);
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read class_subjects" ON public.class_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage class_subjects" ON public.class_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teacher-Subject assignment
CREATE TABLE public.teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (teacher_id, subject_id)
);
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read teacher_subjects" ON public.teacher_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Teacher-Class assignment
CREATE TABLE public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (teacher_id, class_id)
);
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read teacher_classes" ON public.teacher_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teacher_classes" ON public.teacher_classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Academic calendar (holidays, vacations, custom non-working days)
CREATE TABLE public.academic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  day_type TEXT NOT NULL CHECK (day_type IN ('holiday', 'vacation', 'weekend')),
  label TEXT DEFAULT '',
  UNIQUE (date)
);
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read calendar" ON public.academic_calendar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage calendar" ON public.academic_calendar FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Academic quarters
CREATE TABLE public.academic_quarters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  year TEXT NOT NULL DEFAULT '2025-2026',
  CHECK (end_date > start_date)
);
ALTER TABLE public.academic_quarters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read quarters" ON public.academic_quarters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage quarters" ON public.academic_quarters FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  value INT NOT NULL CHECK (value >= 1 AND value <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, date)
);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read grades" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage grades" ON public.grades FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
) WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')
);
