-- =========================================================================
-- Capacity Connect: Allow authenticated trainers to insert skills
-- Migration: 00065_allow_trainer_insert_skills.sql
-- =========================================================================

DO $$
BEGIN
  -- Drop restrictive insert policies if any
  DROP POLICY IF EXISTS "Authenticated users can insert skills" ON public.skills;
  
  -- Allow all authenticated trainers and users to insert new skills
  CREATE POLICY "Authenticated users can insert skills"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (true);
END
$$;
