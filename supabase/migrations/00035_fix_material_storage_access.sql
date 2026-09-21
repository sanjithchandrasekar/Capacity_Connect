-- Idempotent: drop first, then recreate

-- Policy 1: session flow documents
DROP POLICY IF EXISTS "Trainees can view session flow docs for enrolled courses" ON storage.objects;

CREATE POLICY "Trainees can view session flow docs for enrolled courses"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials' AND
    name ILIKE '%/session_flow_%' AND
    EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE course_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
    )
);

-- Policy 2: broaden existing materials policy to all enrollment statuses
DROP POLICY IF EXISTS "Trainees can view materials for enrolled courses" ON storage.objects;

CREATE POLICY "Trainees can view materials for enrolled courses"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE course_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
    )
);
