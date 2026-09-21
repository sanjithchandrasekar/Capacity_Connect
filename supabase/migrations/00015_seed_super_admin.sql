-- Insert the Super Admin into auth.users if they don't exist
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'sanjithchandrasekar03@gmail.com';
  v_password TEXT := '12345678';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('full_name', 'Sanjith Chandrasekar', 'role', 'super_admin'),
      now(),
      now(),
      'authenticated',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Ensure the profile exists and is a super_admin and approved
  UPDATE public.profiles
  SET 
    role = 'super_admin',
    approval_status = 'approved',
    full_name = 'Sanjith Chandrasekar'
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, role, approval_status)
    VALUES (v_user_id, v_email, 'Sanjith Chandrasekar', 'super_admin', 'approved');
  END IF;
END $$;
