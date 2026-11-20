
-- Add comment column to grades
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS comment text DEFAULT NULL;

-- Create absences table
CREATE TABLE IF NOT EXISTS public.absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('excused', 'unexcused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id, subject_id, date)
);

ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can manage absences" ON public.absences
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can read absences" ON public.absences
  FOR SELECT TO authenticated
  USING (true);
