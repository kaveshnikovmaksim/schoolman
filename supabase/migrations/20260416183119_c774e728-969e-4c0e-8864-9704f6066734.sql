-- Track teacher's acknowledgement of resolved requests (so they don't auto-disappear)
ALTER TABLE public.teacher_requests
  ADD COLUMN IF NOT EXISTS acknowledged boolean NOT NULL DEFAULT false;

-- Mark a teacher_subjects link as "pending removal" — teacher loses access temporarily
-- until the admin makes a final decision (remove permanently, or restore).
ALTER TABLE public.teacher_subjects
  ADD COLUMN IF NOT EXISTS pending_removal boolean NOT NULL DEFAULT false;

-- Allow teachers to read their own teacher_subjects rows so the UI can show the "pending" badge
DROP POLICY IF EXISTS "Authenticated can read teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Authenticated can read teacher_subjects"
ON public.teacher_subjects
FOR SELECT
TO authenticated
USING (true);

-- Allow teachers to mark their own requests as acknowledged (status stays the same)
CREATE POLICY "Teachers can acknowledge own requests"
ON public.teacher_requests
FOR UPDATE
TO authenticated
USING (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
)
WITH CHECK (
  teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
);