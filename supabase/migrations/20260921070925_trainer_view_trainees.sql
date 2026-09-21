-- 1. Allow trainers to view trainees for approval and management
DROP POLICY IF EXISTS "Trainers can view trainees" ON public.trainees;

CREATE POLICY "Trainers can view trainees" 
ON public.trainees FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.trainers WHERE id = auth.uid()));

-- 2. Allow trainees to insert notifications (needed when requesting enrollment)
DROP POLICY IF EXISTS "Trainees can insert notifications" ON public.notifications;

CREATE POLICY "Trainees can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.trainees WHERE id = auth.uid())
);
