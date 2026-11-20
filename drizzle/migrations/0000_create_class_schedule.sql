CREATE TABLE public.class_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  lesson_number SMALLINT NOT NULL DEFAULT 1,
  room TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX class_schedule_slot_idx ON public.class_schedule (class_id, day_of_week, lesson_number);
CREATE INDEX class_schedule_class_idx ON public.class_schedule (class_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_schedule TO authenticated;
GRANT SELECT ON public.class_schedule TO anon;
GRANT ALL ON public.class_schedule TO service_role;

ALTER TABLE public.class_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_schedule readable by everyone"
ON public.class_schedule FOR SELECT USING (true);

CREATE POLICY "class_schedule writable by authenticated"
ON public.class_schedule FOR ALL TO authenticated
USING (true) WITH CHECK (true);
