-- Fix storage RLS policies for proofs bucket
-- Drop old broken policies
DROP POLICY IF EXISTS "Anyone can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own proof" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all proofs" ON storage.objects;

-- Allow anyone (unauthenticated during signup) to upload to proofs bucket
-- The path will be: <userId>/<filename> which is set after the user is created
CREATE POLICY "Authenticated users can upload proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proofs');

-- Allow users to read their own proof (path: <their_uid>/filename)
CREATE POLICY "Users can read own proof"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to read ALL proofs
CREATE POLICY "Admins can read all proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proofs'
  AND public.is_admin()
);

-- Allow admins to delete proof files (for rejection flow)
CREATE POLICY "Admins can delete proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'proofs'
  AND public.is_admin()
);

-- Recreate admin_delete_user RPC to also clean up storage via metadata
-- (Storage file deletion must be done from the frontend since edge functions
-- can't easily delete from storage. This RPC handles DB cleanup only.)
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proof_path TEXT;
BEGIN
  -- 1. Verify caller is an admin or super_admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can perform this action';
  END IF;

  -- 2. Get the proof path before deleting
  SELECT proof_path INTO v_proof_path FROM public.profiles WHERE id = target_user_id;

  -- 3. Log the action BEFORE deleting (so audit log has the actor)
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'admin_reject_and_delete_user',
    'profile',
    target_user_id,
    jsonb_build_object('proof_path', v_proof_path, 'status', 'rejected_and_deleted')
  );

  -- 4. Delete the profile row
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 5. Delete the auth user (this cascades profile deletion too, but profile is already gone)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;
