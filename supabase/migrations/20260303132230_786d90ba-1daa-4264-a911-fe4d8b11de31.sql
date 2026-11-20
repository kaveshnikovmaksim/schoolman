
CREATE TABLE public.homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can manage homework"
  ON public.homework FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can read homework"
  ON public.homework FOR SELECT
  TO authenticated
  USING (true);
