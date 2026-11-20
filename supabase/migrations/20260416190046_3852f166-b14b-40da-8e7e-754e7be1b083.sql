CREATE TABLE public.cell_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  class_id uuid NOT NULL,
  date date NOT NULL,
  comment text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, date)
);

ALTER TABLE public.cell_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read cell_comments"
ON public.cell_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers and admins can manage cell_comments"
ON public.cell_comments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE INDEX idx_cell_comments_lookup ON public.cell_comments(class_id, subject_id, date);