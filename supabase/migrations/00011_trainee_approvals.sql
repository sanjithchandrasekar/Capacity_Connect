-- 1. Add proof_path to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS proof_path TEXT;

-- 2. Update handle_new_user trigger to include proof_path from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, designation, approval_status, proof_path)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'trainee',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'designation',
    'pending',
    NEW.raw_user_meta_data->>'proof_path'
  );
  RETURN NEW;
END;
$$;

-- 3. Create proofs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS on proofs bucket
CREATE POLICY "Anyone can upload proofs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'proofs');

CREATE POLICY "Users can read own proof"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read all proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'proofs' AND public.is_admin());

-- 5. Fix admin_update_user to support super_admin
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_role TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
  old_status TEXT;
  json_meta JSONB;
BEGIN
  -- Verify caller is admin or super_admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can perform this action';
  END IF;

  -- Get current state
  SELECT role, approval_status INTO old_role, old_status FROM profiles WHERE id = target_user_id;

  -- Update profile
  UPDATE profiles
  SET 
    role = COALESCE(new_role, role),
    approval_status = COALESCE(new_status, approval_status),
    updated_at = now()
  WHERE id = target_user_id;

  -- Construct metadata for audit log
  json_meta = jsonb_build_object(
    'old_role', old_role,
    'new_role', COALESCE(new_role, old_role),
    'old_status', old_status,
    'new_status', COALESCE(new_status, old_status)
  );

  -- Insert audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'admin_update_user',
    'profile',
    target_user_id,
    json_meta
  );

END;
$$;
