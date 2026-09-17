-- Enable trainees to see thumbnails (on course catalog)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials' AND
    name ILIKE '%/thumbnail.%'
);

-- Enable trainees to view actual course materials (PDFs, videos) only if enrolled
CREATE POLICY "Trainees can view materials for enrolled courses"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE course_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND status = 'enrolled'
    )
);
