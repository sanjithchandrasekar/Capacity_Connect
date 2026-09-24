-- Migration 00063: Add comprehensive profile fields for trainers, trainees, and admins

-- 1. Add columns to trainers table
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS work_experience TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

-- 2. Add columns to trainees table
ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS work_experience TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS learning_goals TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT;

-- 3. Add columns to admins table
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS work_experience TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS github_url TEXT;

-- 4. Enable RLS Update Policies so users can update their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trainers' AND policyname = 'Trainers can update own details'
  ) THEN
    CREATE POLICY "Trainers can update own details" ON public.trainers FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trainees' AND policyname = 'Trainees can update own details'
  ) THEN
    CREATE POLICY "Trainees can update own details" ON public.trainees FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Admins can update own details'
  ) THEN
    CREATE POLICY "Admins can update own details" ON public.admins FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
END $$;
