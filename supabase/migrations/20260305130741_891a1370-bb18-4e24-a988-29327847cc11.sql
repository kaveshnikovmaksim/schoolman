
CREATE TABLE public.trimester_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  quarter_id uuid NOT NULL REFERENCES public.academic_quarters(id) ON DELETE CASCADE,
  value integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, class_id, quarter_id)
);

ALTER TABLE public.trimester_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can manage trimester_grades"
  ON public.trimester_grades FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Authenticated can read trimester_grades"
  ON public.trimester_grades FOR SELECT TO authenticated
  USING (true);
