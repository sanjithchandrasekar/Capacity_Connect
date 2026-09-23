-- =========================================================================
-- Migration: 00053_home_page_settings.sql
-- Description: Home Page management settings table, view, RLS, and seed data
-- =========================================================================

-- 1. Create home_page_settings table
CREATE TABLE IF NOT EXISTS public.home_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    featured_programs_enabled BOOLEAN NOT NULL DEFAULT true,
    featured_programs_title TEXT NOT NULL DEFAULT 'Featured Learning Programs',
    featured_programs_subtitle TEXT NOT NULL DEFAULT 'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.',
    announcements_bar_enabled BOOLEAN NOT NULL DEFAULT true,
    announcements_bar_speed INTEGER NOT NULL DEFAULT 24,
    upcoming_tracks_enabled BOOLEAN NOT NULL DEFAULT true,
    upcoming_tracks_title TEXT NOT NULL DEFAULT 'Specialized Earth Sciences Tracks.',
    upcoming_tracks_subtitle TEXT NOT NULL DEFAULT 'Pre-register for next-generation cohorts and masterclasses.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create alias view "home_page" for direct querying
CREATE OR REPLACE VIEW public.home_page AS 
SELECT * FROM public.home_page_settings;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.home_page_settings ENABLE ROW LEVEL SECURITY;

-- 4. Allow public read access (for landing page visitors)
DROP POLICY IF EXISTS "Allow public read access on home_page_settings" ON public.home_page_settings;
CREATE POLICY "Allow public read access on home_page_settings" 
ON public.home_page_settings 
FOR SELECT 
USING (true);

-- 5. Allow authenticated admins to insert and update settings
DROP POLICY IF EXISTS "Allow authenticated admin update on home_page_settings" ON public.home_page_settings;
CREATE POLICY "Allow authenticated admin update on home_page_settings" 
ON public.home_page_settings 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Insert initial default record
INSERT INTO public.home_page_settings (
    id, 
    featured_programs_enabled, 
    featured_programs_title, 
    featured_programs_subtitle, 
    announcements_bar_enabled, 
    announcements_bar_speed, 
    upcoming_tracks_enabled, 
    upcoming_tracks_title, 
    upcoming_tracks_subtitle
) VALUES (
    'default_settings',
    true,
    'Featured Learning Programs',
    'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.',
    true,
    24,
    true,
    'Specialized Earth Sciences Tracks.',
    'Pre-register for next-generation cohorts and masterclasses.'
) ON CONFLICT (id) DO NOTHING;
