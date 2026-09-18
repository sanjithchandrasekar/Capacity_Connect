-- Add plain text password columns (WARNING: Not recommended for security)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.trainers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.trainees ADD COLUMN IF NOT EXISTS password TEXT;
