-- 1. Create the separate role tables

CREATE TABLE public.admins (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  admin_level TEXT DEFAULT 'standard',
  permissions_granted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.trainers (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  expertise_areas TEXT[] DEFAULT '{}',
  years_of_experience INTEGER,
  bio TEXT
);

CREATE TABLE public.trainees (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  department TEXT,
  designation TEXT,
  learning_goals TEXT
);

-- 2. Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainees ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Admins can view all admins" ON public.admins FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can view themselves" ON public.admins FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Anyone can view trainers" ON public.trainers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can update themselves" ON public.trainers FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can view trainees" ON public.trainees FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Trainees can view themselves" ON public.trainees FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Trainees can update themselves" ON public.trainees FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. Seed existing data from profiles into the new tables
INSERT INTO public.admins (id, admin_level)
SELECT id, CASE WHEN role = 'super_admin' THEN 'super_admin' ELSE 'standard' END
FROM public.profiles
WHERE role IN ('admin', 'super_admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.trainers (id)
SELECT id FROM public.profiles WHERE role = 'trainer'
ON CONFLICT DO NOTHING;

INSERT INTO public.trainees (id, department, designation)
SELECT id, department, designation FROM public.profiles WHERE role = 'trainee'
ON CONFLICT DO NOTHING;

-- 5. Trigger to automatically route data when profile is inserted or updated
CREATE OR REPLACE FUNCTION public.handle_role_tables()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('admin', 'super_admin') THEN
      INSERT INTO public.admins (id, admin_level) VALUES (NEW.id, CASE WHEN NEW.role = 'super_admin' THEN 'super_admin' ELSE 'standard' END) ON CONFLICT DO NOTHING;
    ELSIF NEW.role = 'trainer' THEN
      INSERT INTO public.trainers (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
    ELSIF NEW.role = 'trainee' THEN
      INSERT INTO public.trainees (id, department, designation) VALUES (NEW.id, NEW.department, NEW.designation) ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If role changed, delete from old and insert to new
    IF OLD.role != NEW.role THEN
      DELETE FROM public.admins WHERE id = NEW.id;
      DELETE FROM public.trainers WHERE id = NEW.id;
      DELETE FROM public.trainees WHERE id = NEW.id;
      
      IF NEW.role IN ('admin', 'super_admin') THEN
        INSERT INTO public.admins (id, admin_level) VALUES (NEW.id, CASE WHEN NEW.role = 'super_admin' THEN 'super_admin' ELSE 'standard' END);
      ELSIF NEW.role = 'trainer' THEN
        INSERT INTO public.trainers (id) VALUES (NEW.id);
      ELSIF NEW.role = 'trainee' THEN
        INSERT INTO public.trainees (id, department, designation) VALUES (NEW.id, NEW.department, NEW.designation);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_role_tables
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_role_tables();
