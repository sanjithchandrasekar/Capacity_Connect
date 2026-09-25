-- Migration 00066: Ensure learning_goals and availability exist across role tables to avoid any schema cache mismatches

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS learning_goals TEXT;

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS learning_goals TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available';

ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available';
