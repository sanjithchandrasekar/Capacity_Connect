-- 1. Ensure authenticated and anon roles have access to all tables in the public schema.
-- This fixes 403 Forbidden errors if default privileges were not set properly when tables were created.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Fix the `is_admin()` function to prevent it from being inlined by the SQL optimizer.
-- When a SECURITY DEFINER function with LANGUAGE sql is inlined, it loses its SECURITY DEFINER context
-- and executes with the caller's privileges, which causes an infinite recursion error in RLS policies.
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
