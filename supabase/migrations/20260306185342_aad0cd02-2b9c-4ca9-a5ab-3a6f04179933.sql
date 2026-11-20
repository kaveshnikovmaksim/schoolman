
ALTER TABLE trimester_grades
  DROP CONSTRAINT IF EXISTS trimester_grades_quarter_id_fkey;

ALTER TABLE trimester_grades
  ADD CONSTRAINT trimester_grades_quarter_id_fkey
  FOREIGN KEY (quarter_id) REFERENCES academic_quarters(id) ON DELETE CASCADE;
