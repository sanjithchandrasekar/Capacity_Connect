-- Create an RPC to completely delete a user's account when they are rejected
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Verify caller is an admin or super_admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can perform this action';
  END IF;

  -- 2. Delete the profile (this will cascade delete or just remove the profile so we can delete auth.user)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 3. Delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 4. Log the action
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'admin_delete_user',
    'profile',
    target_user_id,
    jsonb_build_object('status', 'rejected_and_deleted')
  );
END;
$$;
