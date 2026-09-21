-- Migration 35: Make thumbnails public
CREATE POLICY "Public Thumbnails Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'materials' );

-- Migration 36: Add pending_approval and rejected to enrollments
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_status_check;

ALTER TABLE enrollments 
ADD CONSTRAINT enrollments_status_check 
CHECK (status IN ('enrolled', 'completed', 'dropped', 'pending_approval', 'rejected'));

-- Migration 37: Fix backend permissions and RLS infinite recursion
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid()
  ) INTO v_is_admin;
  
  RETURN v_is_admin;
END;
$$;
