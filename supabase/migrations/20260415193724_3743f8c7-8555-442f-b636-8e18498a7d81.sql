
CREATE TABLE public.teacher_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'remove_subject' or 'remove_class'
  target_name TEXT NOT NULL, -- name of subject or class
  target_id UUID NOT NULL, -- id of subject or class
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own requests"
  ON public.teacher_requests
  FOR ALL
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authenticated can read own requests"
  ON public.teacher_requests
  FOR SELECT
  TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
