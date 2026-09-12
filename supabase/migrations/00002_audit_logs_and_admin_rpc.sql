-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read audit logs
CREATE POLICY "Admins can read audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- No public insert/update/delete policies for audit_logs
-- Only internal functions will insert logs

-- RPC for admin to update a user's role or status and log it
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_role user_role DEFAULT NULL,
  new_status user_approval_status DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
  old_role user_role;
  old_status user_approval_status;
  json_meta JSONB;
BEGIN
  -- Verify caller is admin
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN
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
