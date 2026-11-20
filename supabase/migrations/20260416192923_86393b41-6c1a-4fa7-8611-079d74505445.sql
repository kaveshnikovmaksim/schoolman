-- Grade history table for tracking changes
CREATE TABLE public.grade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_id UUID,
  student_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  class_id UUID NOT NULL,
  date DATE NOT NULL,
  action TEXT NOT NULL,
  old_value INTEGER,
  new_value INTEGER,
  work_type_id UUID,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grade_history_lookup ON public.grade_history (student_id, subject_id, date);
CREATE INDEX idx_grade_history_changed_at ON public.grade_history (changed_at DESC);

ALTER TABLE public.grade_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read grade_history"
  ON public.grade_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers and admins can manage grade_history"
  ON public.grade_history FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- Trigger function to log changes
CREATE OR REPLACE FUNCTION public.log_grade_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  uname TEXT;
BEGIN
  SELECT COALESCE(t.name, p.full_name, '—')
    INTO uname
  FROM (SELECT 1) x
  LEFT JOIN public.teachers t ON t.user_id = uid
  LEFT JOIN public.profiles p ON p.user_id = uid
  LIMIT 1;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.grade_history(grade_id, student_id, subject_id, class_id, date, action, new_value, work_type_id, changed_by, changed_by_name)
    VALUES (NEW.id, NEW.student_id, NEW.subject_id, NEW.class_id, NEW.date, 'added', NEW.value, NEW.work_type_id, uid, uname);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.value IS DISTINCT FROM NEW.value OR OLD.work_type_id IS DISTINCT FROM NEW.work_type_id THEN
      INSERT INTO public.grade_history(grade_id, student_id, subject_id, class_id, date, action, old_value, new_value, work_type_id, changed_by, changed_by_name)
      VALUES (NEW.id, NEW.student_id, NEW.subject_id, NEW.class_id, NEW.date, 'changed', OLD.value, NEW.value, NEW.work_type_id, uid, uname);
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.grade_history(grade_id, student_id, subject_id, class_id, date, action, old_value, work_type_id, changed_by, changed_by_name)
    VALUES (OLD.id, OLD.student_id, OLD.subject_id, OLD.class_id, OLD.date, 'removed', OLD.value, OLD.work_type_id, uid, uname);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_grade_change ON public.grades;
CREATE TRIGGER trg_log_grade_change
AFTER INSERT OR UPDATE OR DELETE ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.log_grade_change();