-- Migration to add trainer_suggestion to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS trainer_suggestion TEXT;
