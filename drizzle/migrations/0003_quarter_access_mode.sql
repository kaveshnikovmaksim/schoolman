ALTER TABLE public.academic_quarters
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.academic_quarters
  ADD CONSTRAINT academic_quarters_access_mode_check
  CHECK (access_mode IN ('auto', 'open', 'closed'));

COMMENT ON COLUMN public.academic_quarters.access_mode IS 'auto = editable only while the trimester is running; open = admin forced open; closed = admin forced closed';