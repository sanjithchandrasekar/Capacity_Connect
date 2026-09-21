-- 1. Add mobile_number to both trainers and trainees
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS mobile_number TEXT;

ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- 2. Add trainer-specific fields
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS biodata_path TEXT,
  ADD COLUMN IF NOT EXISTS study_details TEXT;

-- 3. Update handle_new_user to handle roles properly
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  target_role text;
BEGIN
  target_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'trainee');

  IF target_role = 'trainer' THEN
    INSERT INTO public.trainers (id, full_name, email, role, approval_status, mobile_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
      NEW.email,
      'trainer',
      'pending',
      NEW.raw_user_meta_data->>'mobile_number'
    );
  ELSE
    INSERT INTO public.trainees (id, full_name, email, role, approval_status, mobile_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
      NEW.email,
      'trainee',
      'pending',
      NEW.raw_user_meta_data->>'mobile_number'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
