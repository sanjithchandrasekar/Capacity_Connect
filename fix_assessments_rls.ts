import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gezrhprdrlsswfnuffvf.supabase.co'
// Using anon key - but we need service role for DDL
// Since we don't have service role key, let's use the REST API via pg_dump approach
// Actually let's try using the management API

async function applyMigration() {
  const sql = `
-- Drop the overly restrictive combined policy
DROP POLICY IF EXISTS "Trainers can manage own assessments" ON public.assessments;

-- SELECT: trainer can see assessments for their own courses (regardless of created_by)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can view assessments for own courses') THEN
    CREATE POLICY "Trainers can view assessments for own courses"
    ON public.assessments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = assessments.course_id
          AND courses.trainer_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can insert assessments for own courses') THEN
    CREATE POLICY "Trainers can insert assessments for own courses"
    ON public.assessments FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = course_id
          AND courses.trainer_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can update assessments for own courses') THEN
    CREATE POLICY "Trainers can update assessments for own courses"
    ON public.assessments FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = assessments.course_id
          AND courses.trainer_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can delete assessments for own courses') THEN
    CREATE POLICY "Trainers can delete assessments for own courses"
    ON public.assessments FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = assessments.course_id
          AND courses.trainer_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
      )
    );
  END IF;
END $$;
`
  console.log('SQL to run in Supabase SQL Editor:')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))
  console.log('\nPlease run this SQL manually in your Supabase Dashboard > SQL Editor')
  console.log('URL: https://supabase.com/dashboard/project/gezrhprdrlsswfnuffvf/sql/new')
}

applyMigration()
