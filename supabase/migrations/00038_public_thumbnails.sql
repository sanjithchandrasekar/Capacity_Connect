-- Allow public access to thumbnail files in the materials bucket
DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;

CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'materials' AND
    name ILIKE '%/thumbnail.%'
);
