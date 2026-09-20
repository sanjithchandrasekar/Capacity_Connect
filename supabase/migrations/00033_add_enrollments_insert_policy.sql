-- Allow authenticated users to insert their own enrollments
DROP POLICY IF EXISTS "Trainees can insert their own enrollments" ON public.enrollments;

CREATE POLICY "Trainees can insert their own enrollments"
ON public.enrollments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);
