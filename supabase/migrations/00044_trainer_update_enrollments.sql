-- Allow trainers to update enrollments for their own courses
CREATE POLICY "Trainers can update enrollments for own courses"
ON public.enrollments FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = enrollments.course_id
    AND trainer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = enrollments.course_id
    AND trainer_id = auth.uid()
  )
);
