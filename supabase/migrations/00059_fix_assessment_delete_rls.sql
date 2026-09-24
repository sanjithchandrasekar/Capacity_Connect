-- Fix assessment deletion: allow trainer who owns the course to delete its assessments
-- Simplified: just check course ownership via courses.trainer_id - no need for profiles check

-- Drop the overly restrictive combined policy
DROP POLICY IF EXISTS "Trainers can manage own assessments" ON public.assessments;

-- SELECT
DROP POLICY IF EXISTS "Trainers can view assessments for own courses" ON public.assessments;
CREATE POLICY "Trainers can view assessments for own courses"
ON public.assessments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = assessments.course_id
      AND courses.trainer_id = auth.uid()
  )
);

-- INSERT
DROP POLICY IF EXISTS "Trainers can insert assessments for own courses" ON public.assessments;
CREATE POLICY "Trainers can insert assessments for own courses"
ON public.assessments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_id
      AND courses.trainer_id = auth.uid()
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Trainers can update assessments for own courses" ON public.assessments;
CREATE POLICY "Trainers can update assessments for own courses"
ON public.assessments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = assessments.course_id
      AND courses.trainer_id = auth.uid()
  )
);

-- DELETE
DROP POLICY IF EXISTS "Trainers can delete assessments for own courses" ON public.assessments;
CREATE POLICY "Trainers can delete assessments for own courses"
ON public.assessments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = assessments.course_id
      AND courses.trainer_id = auth.uid()
  )
);
