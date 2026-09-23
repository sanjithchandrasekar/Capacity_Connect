-- =========================================================================
-- Capacity Connect: Supabase Storage Bucket for Homepage
-- Migration: 00054_homepage_storage_bucket.sql
-- =========================================================================

-- 1. Create or update the 'Homepage' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'Homepage',
    'Homepage',
    true,
    10485760, -- 10MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Storage RLS Policies: Allow public read access to everyone
DROP POLICY IF EXISTS "Public can view Homepage assets" ON storage.objects;
CREATE POLICY "Public can view Homepage assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'Homepage');

-- 3. Storage RLS Policies: Allow authenticated users to upload and manage assets
DROP POLICY IF EXISTS "Authenticated users can upload Homepage assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload Homepage assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Homepage');

DROP POLICY IF EXISTS "Authenticated users can update Homepage assets" ON storage.objects;
CREATE POLICY "Authenticated users can update Homepage assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Homepage');

DROP POLICY IF EXISTS "Authenticated users can delete Homepage assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete Homepage assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Homepage');
