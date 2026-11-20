-- Insert missing teacher_classes record for Фролов -> 7Б
INSERT INTO public.teacher_classes (teacher_id, class_id)
VALUES ('355bf5f9-aef4-4bef-a348-c463d1a81b1b', 'b9249350-9cf6-472e-8ce0-dc2c2e441f35')
ON CONFLICT DO NOTHING;