DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'superadmin@capacityconnect.com';
  v_password TEXT := '12345678';
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    -- Update the password and role
    UPDATE auth.users 
    SET encrypted_password = crypt(v_password, gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object('full_name', 'System Super Admin', 'role', 'super_admin')
    WHERE id = v_user_id;

    -- Update the profile
    UPDATE public.profiles 
    SET 
      role = 'super_admin',
      approval_status = 'approved',
      full_name = 'System Super Admin'
    WHERE id = v_user_id;
  END IF;
END $$;
