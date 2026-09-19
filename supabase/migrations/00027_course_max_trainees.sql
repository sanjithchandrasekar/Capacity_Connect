-- Migration to add max_trainees limit to courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS max_trainees integer;
