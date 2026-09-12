-- Create the materials table
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    extracted_text TEXT,
    extraction_status TEXT DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on the materials table
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Trainers can insert materials for their own courses
CREATE POLICY "Trainers can insert materials for their courses"
ON materials FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM courses
        WHERE id = materials.course_id
        AND trainer_id = auth.uid()
    )
);

-- Trainers can select materials for their own courses
CREATE POLICY "Trainers can view materials for their courses"
ON materials FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses
        WHERE id = materials.course_id
        AND trainer_id = auth.uid()
    )
);

-- Trainers can delete materials for their own courses
CREATE POLICY "Trainers can delete materials for their courses"
ON materials FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM courses
        WHERE id = materials.course_id
        AND trainer_id = auth.uid()
    )
);

-- Admins can do everything
CREATE POLICY "Admins can manage all materials"
ON materials FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Note: Trainee policy will be added in Phase 5 when enrollments exist.
-- Currently Trainees cannot access any materials.

-- Set up the Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Allow Trainers to upload files to their courses
-- The storage_path must match: materials/<course_id>/<file_name>
-- We can't easily join with the courses table directly in the storage.objects RLS policies
-- without a function, so we'll use a simpler policy for now, or use an RPC.
-- Wait, Supabase storage policies CAN query the DB using `auth.uid()`.
-- The name of the file in the bucket is typically `{course_id}/{filename}`.
-- The path tokens are available via `storage.foldername(name)`.

CREATE POLICY "Trainers can upload materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM courses
        WHERE id::text = (storage.foldername(name))[1]
        AND trainer_id = auth.uid()
    )
);

CREATE POLICY "Trainers can delete materials"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM courses
        WHERE id::text = (storage.foldername(name))[1]
        AND trainer_id = auth.uid()
    )
);

CREATE POLICY "Trainers can view materials"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM courses
        WHERE id::text = (storage.foldername(name))[1]
        AND trainer_id = auth.uid()
    )
);

CREATE POLICY "Admins can access all materials"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'materials' AND
    EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
);
