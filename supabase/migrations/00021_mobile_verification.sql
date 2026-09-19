-- 1. Add is_mobile_verified field
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS is_mobile_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create the verification OTPs table
CREATE TABLE IF NOT EXISTS public.verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Protect the verification_otps table from public access
ALTER TABLE public.verification_otps ENABLE ROW LEVEL SECURITY;

-- 3. Create RPC for generating an OTP
CREATE OR REPLACE FUNCTION public.generate_mobile_otp(p_mobile text)
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
  INSERT INTO public.verification_otps (mobile_number, otp, expires_at)
  VALUES (p_mobile, v_otp, now() + interval '15 minutes');
  
  -- In a real production app, you would use a trigger here or an Edge Function
  -- to send this OTP to Twilio/AWS SNS etc.
  -- For now, we return it so the frontend can simulate receiving it.
  RETURN v_otp;
END;
$$;

-- 4. Create RPC for verifying an OTP
CREATE OR REPLACE FUNCTION public.verify_mobile_otp(p_mobile text, p_otp text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_valid boolean;
  v_role text;
BEGIN
  -- Check if the OTP is valid and not expired
  SELECT EXISTS (
    SELECT 1 FROM public.verification_otps
    WHERE mobile_number = p_mobile
      AND otp = p_otp
      AND expires_at > now()
  ) INTO v_is_valid;

  IF v_is_valid THEN
    -- Update the user's profile based on their role
    IF EXISTS (SELECT 1 FROM public.trainers WHERE id = p_user_id) THEN
      UPDATE public.trainers SET is_mobile_verified = TRUE WHERE id = p_user_id;
    ELSIF EXISTS (SELECT 1 FROM public.trainees WHERE id = p_user_id) THEN
      UPDATE public.trainees SET is_mobile_verified = TRUE WHERE id = p_user_id;
    END IF;
    
    -- Clean up used OTPs
    DELETE FROM public.verification_otps WHERE mobile_number = p_mobile;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
