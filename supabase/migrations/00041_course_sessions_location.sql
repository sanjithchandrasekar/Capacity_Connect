-- Add location to course_sessions
ALTER TABLE course_sessions ADD COLUMN IF NOT EXISTS location TEXT;

-- Add duration_minutes to assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;
