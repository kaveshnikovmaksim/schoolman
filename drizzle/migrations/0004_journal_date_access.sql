CREATE TABLE public.journal_date_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_date_access TO authenticated;
GRANT ALL ON public.journal_date_access TO service_role;

ALTER TABLE public.journal_date_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can read journal date access"
ON public.journal_date_access
FOR SELECT
TO authenticated
USING (public.can_access_class(class_id));

CREATE POLICY "Admins can manage journal date access"
ON public.journal_date_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX journal_date_access_class_subject_date_idx
ON public.journal_date_access (class_id, subject_id, date);