-- add scheduling and meeting link to courses
ALTER TABLE public.courses
ADD COLUMN meet_link text,
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN end_date timestamp with time zone;

-- add assessment types and sea link to assessments
ALTER TABLE public.assessments
ADD COLUMN assessment_type text DEFAULT 'final' CHECK (assessment_type IN ('mock', 'daily', 'final')),
ADD COLUMN requires_sea boolean DEFAULT false,
ADD COLUMN sea_link text;
