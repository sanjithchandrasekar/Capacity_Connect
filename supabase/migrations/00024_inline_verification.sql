-- 1. Create a stateless RPC for checking OTP match without side-effects (inline verification)
CREATE OR REPLACE FUNCTION public.check_otp_match(p_identifier text, p_otp text, p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_valid boolean;
BEGIN
  -- Check if the OTP is valid and not expired
  SELECT EXISTS (
    SELECT 1 FROM public.verification_otps
    WHERE identifier = p_identifier
      AND otp_type = p_type
      AND otp = p_otp
      AND expires_at > now()
  ) INTO v_is_valid;

  IF v_is_valid THEN
    -- Delete the used OTP so it cannot be reused
    DELETE FROM public.verification_otps 
    WHERE identifier = p_identifier AND otp_type = p_type;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- 2. Update the handle_new_user trigger to read verification status from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_role text;
  v_is_mobile_verified boolean;
  v_is_email_verified boolean;
BEGIN
  target_role := COALESCE(NEW.raw_user_meta_data->>'signup_role', 'trainee');
  v_is_mobile_verified := COALESCE((NEW.raw_user_meta_data->>'is_mobile_verified')::boolean, false);
  v_is_email_verified := COALESCE((NEW.raw_user_meta_data->>'is_email_verified')::boolean, false);

  IF NOT v_is_mobile_verified OR NOT v_is_email_verified THEN
    RAISE EXCEPTION 'Email and Mobile number verification are compulsory for registration.';
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
    INSERT INTO public.trainees (id, full_name, email, role, approval_status, mobile_number, is_mobile_verified, is_email_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
      NEW.email,
      'trainee',
      'pending',
      NEW.raw_user_meta_data->>'mobile_number',
      v_is_mobile_verified,
      v_is_email_verified
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
