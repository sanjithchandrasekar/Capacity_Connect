-- Migration to add session_type to course_sessions
ALTER TABLE course_sessions
ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'recorded';
