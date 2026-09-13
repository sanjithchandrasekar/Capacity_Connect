-- 00007_trainer_fields_and_objectives.sql
-- Adds trainer profile fields and course learning objectives columns

-- ============================================================
-- 1. Add trainer-specific columns to profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS biography TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available';

-- ============================================================
-- 2. Add learning objectives to courses table
-- ============================================================
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives JSONB;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS competencies JSONB;

COMMENT ON COLUMN courses.learning_objectives IS 'JSONB: { understand: text, able_to_do: text, competencies_built: text }';
COMMENT ON COLUMN courses.competencies IS 'Free-text competencies description';

COMMENT ON COLUMN profiles.biography IS 'Trainer biography / about text';
COMMENT ON COLUMN profiles.years_of_experience IS 'Number of years of professional experience';
COMMENT ON COLUMN profiles.qualifications IS 'Qualifications text (degrees, certifications)';
COMMENT ON COLUMN profiles.availability IS 'Trainer availability status: available, busy, unavailable';
