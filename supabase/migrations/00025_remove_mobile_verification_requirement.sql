-- Remove the exception that forces mobile verification

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  target_role text;
  v_is_mobile_verified boolean;
  v_is_email_verified boolean;
BEGIN
  -- Determine the role from metadata, default to 'trainee'
  target_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'trainee');
  
  -- Extract verification status
  v_is_mobile_verified := COALESCE((NEW.raw_user_meta_data->>'is_mobile_verified')::boolean, false);
  v_is_email_verified := COALESCE((NEW.raw_user_meta_data->>'is_email_verified')::boolean, false);

  -- Only strictly enforce email verification
  IF NOT v_is_email_verified THEN
    RAISE EXCEPTION 'Email verification is required before creating an account.';
  END IF;

  IF target_role = 'trainer' THEN
    INSERT INTO public.trainers (id, full_name, email, role, approval_status, mobile_number, is_mobile_verified, is_email_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
      NEW.email,
      'trainer',
      'pending',
      NEW.raw_user_meta_data->>'mobile_number',
      v_is_mobile_verified,
      v_is_email_verified
    );
  ELSE
    INSERT INTO public.trainees (id, full_name, email, role, approval_status, mobile_number, department, designation, is_mobile_verified, is_email_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
      NEW.email,
      'trainee',
      'pending',
      NEW.raw_user_meta_data->>'mobile_number',
      NEW.raw_user_meta_data->>'department',
      NEW.raw_user_meta_data->>'designation',
      v_is_mobile_verified,
      v_is_email_verified
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
