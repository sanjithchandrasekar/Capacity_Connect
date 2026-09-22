-- Fix assessment_type CHECK constraint to include 'assessment' type
ALTER TABLE public.assessments
DROP CONSTRAINT IF EXISTS assessments_assessment_type_check;

ALTER TABLE public.assessments
ADD CONSTRAINT assessments_assessment_type_check 
CHECK (assessment_type IN ('mock', 'daily', 'final', 'assessment'));

-- Add duration_minutes if not exists
ALTER TABLE public.assessments
ADD COLUMN IF NOT EXISTS duration_minutes integer;
