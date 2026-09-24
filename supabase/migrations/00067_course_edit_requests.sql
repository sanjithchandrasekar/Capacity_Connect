-- Migration 00067: Add Course Edit Permission Request Workflow columns and table

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS edit_request_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS edit_request_reason TEXT,
  ADD COLUMN IF NOT EXISTS edit_request_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_window_duration_hours INTEGER,
  ADD COLUMN IF NOT EXISTS admin_edit_notes TEXT;

-- Create course_edit_requests audit & history table
CREATE TABLE IF NOT EXISTS public.course_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
  duration_hours INTEGER DEFAULT 24,
  expires_at TIMESTAMPTZ,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policies for course_edit_requests
DROP POLICY IF EXISTS "Trainers can view and create their course edit requests" ON public.course_edit_requests;
CREATE POLICY "Trainers can view and create their course edit requests"
  ON public.course_edit_requests
  FOR ALL
  TO authenticated
  USING (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  )
  WITH CHECK (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );
