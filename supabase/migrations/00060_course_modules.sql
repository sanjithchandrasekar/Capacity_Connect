-- =========================================================================
-- Capacity Connect: Course Modules & Storage Bucket
-- Migration: 00060_course_modules.sql
-- =========================================================================

-- 1. Create or update the 'Course modules' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'Course modules',
    'Course modules',
    true,
    104857600 -- 100MB limit
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 104857600;

-- 2. Storage RLS Policies for 'Course modules'
DROP POLICY IF EXISTS "Public can view Course modules" ON storage.objects;
CREATE POLICY "Public can view Course modules"
ON storage.objects FOR SELECT
USING (bucket_id = 'Course modules');

DROP POLICY IF EXISTS "Authenticated users can upload Course modules" ON storage.objects;
CREATE POLICY "Authenticated users can upload Course modules"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Course modules');

DROP POLICY IF EXISTS "Authenticated users can update Course modules" ON storage.objects;
CREATE POLICY "Authenticated users can update Course modules"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Course modules');

DROP POLICY IF EXISTS "Authenticated users can delete Course modules" ON storage.objects;
CREATE POLICY "Authenticated users can delete Course modules"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Course modules');

-- 3. Add modules JSONB column to courses table for direct payload storage
ALTER TABLE courses ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]'::jsonb;

-- 4. Create dedicated course_modules table
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_final_assessment BOOLEAN NOT NULL DEFAULT false,
    content_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS on course_modules
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view course modules" ON course_modules;
CREATE POLICY "Public can view course modules" ON course_modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage course modules" ON course_modules;
CREATE POLICY "Authenticated users can manage course modules" ON course_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
