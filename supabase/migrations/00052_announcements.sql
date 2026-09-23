-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active announcements
CREATE POLICY "Allow public read access to active announcements"
  ON public.announcements
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow admins to manage announcements
CREATE POLICY "Allow admins to manage announcements"
  ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id = auth.uid()
    )
  );

-- Insert a mock announcement for the landing page
INSERT INTO public.announcements (title, content, is_active)
VALUES 
  ('MoES Certification Track 2027 Announced', 'The Ministry of Earth Sciences has officially launched the new certification track for field meteorologists and data analysts.', true),
  ('Doppler Radar Maintenance Downtime', 'Scheduled maintenance for East Coast Doppler radar telemetry feeds will occur on Oct 1st. Simulations will use cached datasets during this time.', true)
ON CONFLICT DO NOTHING;
