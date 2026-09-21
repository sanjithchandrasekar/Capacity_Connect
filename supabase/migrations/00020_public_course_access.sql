-- Add RLS policy to allow anyone (including unauthenticated users) to view published courses
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;
CREATE POLICY "Anyone can view published courses" 
ON public.courses FOR SELECT 
USING (status = 'published');

-- Make sure trainers table is readable so public courses can show trainer names
DROP POLICY IF EXISTS "Anyone can view trainers" ON public.trainers;
CREATE POLICY "Anyone can view trainers"
ON public.trainers FOR SELECT
USING (true);
