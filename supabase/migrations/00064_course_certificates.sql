-- Migration 00064: Add certificate template support to courses and create storage buckets

-- 1. Add certificate fields to courses table
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS has_certificate BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS certificate_template_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_template_name TEXT,
  ADD COLUMN IF NOT EXISTS certificate_title TEXT;

-- 2. Add certificate fields to enrollments table
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_grade TEXT;

-- 3. Create or update certificates table to track issued certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trainee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  trainee_name TEXT,
  course_title TEXT,
  percentage NUMERIC(5,2) DEFAULT 100,
  file_url TEXT,
  file_name TEXT,
  issued_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist in case table was created earlier with a different schema
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS trainee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS trainee_name TEXT,
  ADD COLUMN IF NOT EXISTS course_title TEXT,
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent conflicts
DROP POLICY IF EXISTS "Authenticated users can read certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can insert their own certificate" ON public.certificates;
DROP POLICY IF EXISTS "Trainers and Admins can manage certificates" ON public.certificates;

-- Recreate Certificates RLS Policies
CREATE POLICY "Authenticated users can read certificates"
  ON public.certificates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own certificate"
  ON public.certificates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = trainee_id OR 
    auth.uid() = user_id OR 
    auth.uid() IS NOT NULL
  );

-- 4. Create Storage Buckets for certificate templates and generated certificates
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('Certificate template', 'Certificate template', true),
  ('certificates', 'certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public read certificate template" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload certificate template" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update certificate template" ON storage.objects;
DROP POLICY IF EXISTS "Public read certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update certificates" ON storage.objects;

-- Storage Policies for 'Certificate template'
CREATE POLICY "Public read certificate template"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'Certificate template');

CREATE POLICY "Authenticated upload certificate template"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'Certificate template');

CREATE POLICY "Authenticated update certificate template"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'Certificate template');

-- Storage Policies for 'certificates'
CREATE POLICY "Public read certificates"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'certificates');

CREATE POLICY "Authenticated upload certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificates');

CREATE POLICY "Authenticated update certificates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'certificates');
