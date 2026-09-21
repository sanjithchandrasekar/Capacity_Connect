-- 1. Add is_email_verified field
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Modify verification_otps table
-- Rename mobile_number to identifier, add otp_type
ALTER TABLE public.verification_otps
  RENAME COLUMN mobile_number TO identifier;

ALTER TABLE public.verification_otps
  ADD COLUMN IF NOT EXISTS otp_type TEXT NOT NULL DEFAULT 'mobile';

-- 3. Create generic RPC for generating an OTP
CREATE OR REPLACE FUNCTION public.generate_otp(p_identifier text, p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_otp text;
BEGIN
  -- Generate a random 6-digit OTP
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');
  
  -- Insert into the table with a 15-minute expiration
  INSERT INTO public.verification_otps (identifier, otp_type, otp, expires_at)
  VALUES (p_identifier, p_type, v_otp, now() + interval '15 minutes');
  
  RETURN v_otp;
END;
$$;

-- 4. Create generic RPC for verifying an OTP
CREATE OR REPLACE FUNCTION public.verify_otp(p_identifier text, p_otp text, p_user_id uuid, p_type text)
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
    -- Update the user's profile based on the OTP type
    IF p_type = 'mobile' THEN
      IF EXISTS (SELECT 1 FROM public.trainers WHERE id = p_user_id) THEN
        UPDATE public.trainers SET is_mobile_verified = TRUE WHERE id = p_user_id;
      ELSIF EXISTS (SELECT 1 FROM public.trainees WHERE id = p_user_id) THEN
        UPDATE public.trainees SET is_mobile_verified = TRUE WHERE id = p_user_id;
      END IF;
    ELSIF p_type = 'email' THEN
      IF EXISTS (SELECT 1 FROM public.trainers WHERE id = p_user_id) THEN
        UPDATE public.trainers SET is_email_verified = TRUE WHERE id = p_user_id;
      ELSIF EXISTS (SELECT 1 FROM public.trainees WHERE id = p_user_id) THEN
        UPDATE public.trainees SET is_email_verified = TRUE WHERE id = p_user_id;
      END IF;
    END IF;
    
    -- Clean up used OTPs
    DELETE FROM public.verification_otps WHERE identifier = p_identifier AND otp_type = p_type;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
