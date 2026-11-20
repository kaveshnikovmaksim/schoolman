
-- Work types reference table (per subject)
CREATE TABLE public.work_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage work_types" ON public.work_types FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read work_types" ON public.work_types FOR SELECT
  USING (true);

-- Scheduled works: what work type is assigned to a date for a class+subject
CREATE TABLE public.scheduled_works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  work_type_id UUID NOT NULL REFERENCES public.work_types(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id, date)
);

ALTER TABLE public.scheduled_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can manage scheduled_works" ON public.scheduled_works FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can read scheduled_works" ON public.scheduled_works FOR SELECT
  USING (true);
