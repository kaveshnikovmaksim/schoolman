ALTER TABLE public.grade_history ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE public.grade_history ADD COLUMN IF NOT EXISTS old_comment text;
CREATE OR REPLACE FUNCTION public.log_diary_comment_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); uname text; previous_comment text; target_grade uuid; category uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN previous_comment := OLD.comment; END IF;
  IF NULLIF(btrim(NEW.comment), '') IS NULL OR (TG_OP = 'UPDATE' AND NEW.comment IS NOT DISTINCT FROM previous_comment) THEN RETURN NEW; END IF;
  SELECT COALESCE(t.name, p.full_name, '—') INTO uname FROM (SELECT 1) x LEFT JOIN public.teachers t ON t.user_id = uid LEFT JOIN public.profiles p ON p.user_id = uid LIMIT 1;
  IF TG_TABLE_NAME = 'grades' THEN target_grade := NEW.id; category := NEW.work_type_id; END IF;
  INSERT INTO public.grade_history(grade_id, student_id, subject_id, class_id, date, action, work_type_id, changed_by, changed_by_name, comment, old_comment)
  VALUES(target_grade, NEW.student_id, NEW.subject_id, NEW.class_id, NEW.date, 'commented', category, uid, uname, NEW.comment, previous_comment);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_diary_grade_comment AFTER INSERT OR UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.log_diary_comment_change();
CREATE TRIGGER trg_diary_cell_comment AFTER INSERT OR UPDATE ON public.cell_comments FOR EACH ROW EXECUTE FUNCTION public.log_diary_comment_change();