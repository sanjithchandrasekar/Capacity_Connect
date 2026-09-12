-- Create enum types
CREATE TYPE user_role AS ENUM ('trainee', 'trainer', 'admin');
CREATE TYPE user_approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  role user_role NOT NULL DEFAULT 'trainee',
  department TEXT,
  designation TEXT,
  approval_status user_approval_status NOT NULL DEFAULT 'pending',
  avatar_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profile Policies

-- Admins can read and write all profiles
CREATE POLICY "Admins can do everything on profiles"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update safe fields on their own profile
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- We prevent role and approval_status changes via a trigger or by omitting them from the SET clause in the frontend.
  -- RLS WITH CHECK is tricky for column-level security. A trigger is safer.
);

-- Trigger to protect sensitive fields on update
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is NOT an admin, prevent them from changing role or approval_status
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    NEW.role = OLD.role;
    NEW.approval_status = OLD.approval_status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_profile_fields_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- Handle new user signup automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
    NEW.email,
    'trainee',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
