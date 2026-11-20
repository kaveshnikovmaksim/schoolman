CREATE TABLE public.school_display_defaults (
  target text PRIMARY KEY CHECK (target IN ('journal', 'diary')),
  quarter_id uuid REFERENCES public.academic_quarters(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_display_defaults TO authenticated;
GRANT ALL ON public.school_display_defaults TO service_role;
ALTER TABLE public.school_display_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School members read display defaults" ON public.school_display_defaults FOR SELECT TO authenticated USING (public.is_school_member());
CREATE POLICY "Admins manage display defaults" ON public.school_display_defaults FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.teacher_display_defaults (
  teacher_id uuid PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_display_defaults TO authenticated;
GRANT ALL ON public.teacher_display_defaults TO service_role;
ALTER TABLE public.teacher_display_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers read own display defaults" ON public.teacher_display_defaults FOR SELECT TO authenticated USING (teacher_id = public.my_teacher_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage teacher display defaults" ON public.teacher_display_defaults FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.validate_teacher_display_default() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.class_id IS NOT NULL AND NOT (
    EXISTS (SELECT 1 FROM public.teacher_classes WHERE teacher_id = NEW.teacher_id AND class_id = NEW.class_id)
    OR EXISTS (SELECT 1 FROM public.class_subjects WHERE teacher_id = NEW.teacher_id AND class_id = NEW.class_id)
    OR EXISTS (SELECT 1 FROM public.classes WHERE id = NEW.class_id AND teacher_id = NEW.teacher_id)
  ) THEN RAISE EXCEPTION 'Учителю не назначен выбранный класс'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_teacher_display_default BEFORE INSERT OR UPDATE ON public.teacher_display_defaults FOR EACH ROW EXECUTE FUNCTION public.validate_teacher_display_default();