ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS weight smallint NOT NULL DEFAULT 1;
ALTER TABLE public.grades ADD CONSTRAINT grades_weight_range CHECK (weight >= 1 AND weight <= 3);