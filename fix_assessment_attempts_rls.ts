import { createClient } from '@supabase/supabase-js'

async function applyMigration() {
  const sql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Trainees can create own attempts') THEN
    CREATE POLICY "Trainees can create own attempts"
    ON public.assessment_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert attempts') THEN
    CREATE POLICY "Admins can insert attempts"
    ON public.assessment_attempts FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;
`
  console.log('SQL to run in Supabase SQL Editor to fix assessment_attempts RLS:')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))
  console.log('\nPlease run this SQL manually in your Supabase Dashboard > SQL Editor')
}

applyMigration()
