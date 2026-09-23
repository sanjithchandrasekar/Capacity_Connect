-- =========================================================================
-- Capacity Connect: Complete Home Page Management Table & RLS Policies
-- Migration: 00053_home_page_settings.sql
-- =========================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.home_page_settings (
    id TEXT PRIMARY KEY DEFAULT 'default_settings',
    featured_programs_enabled BOOLEAN NOT NULL DEFAULT true,
    featured_programs_tag TEXT NOT NULL DEFAULT 'Top Certified Tracks',
    featured_programs_title TEXT NOT NULL DEFAULT 'Featured Learning Programs',
    featured_programs_subtitle TEXT NOT NULL DEFAULT 'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.',
    featured_programs_btn_text TEXT NOT NULL DEFAULT 'Explore All Courses',
    featured_programs_btn_link TEXT NOT NULL DEFAULT '/courses',
    featured_programs_items JSONB DEFAULT '[]'::jsonb,

    announcements_bar_enabled BOOLEAN NOT NULL DEFAULT true,
    announcements_bar_label TEXT NOT NULL DEFAULT 'Announcements',
    announcements_bar_speed INTEGER NOT NULL DEFAULT 24,
    announcements_items JSONB DEFAULT '[]'::jsonb,

    upcoming_tracks_enabled BOOLEAN NOT NULL DEFAULT true,
    upcoming_tracks_tag TEXT NOT NULL DEFAULT 'Upcoming Announcements',
    upcoming_tracks_title TEXT NOT NULL DEFAULT 'Specialized Earth Sciences Tracks.',
    upcoming_tracks_subtitle TEXT NOT NULL DEFAULT 'Pre-register for next-generation cohorts and masterclasses.',
    upcoming_tracks_btn_text TEXT NOT NULL DEFAULT 'View Complete Catalog',
    upcoming_tracks_items JSONB DEFAULT '[]'::jsonb,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Add any missing columns for existing tables
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_tag TEXT NOT NULL DEFAULT 'Top Certified Tracks';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_title TEXT NOT NULL DEFAULT 'Featured Learning Programs';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_subtitle TEXT NOT NULL DEFAULT 'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_btn_text TEXT NOT NULL DEFAULT 'Explore All Courses';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_btn_link TEXT NOT NULL DEFAULT '/courses';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS featured_programs_items JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS announcements_bar_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS announcements_bar_label TEXT NOT NULL DEFAULT 'Announcements';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS announcements_bar_speed INTEGER NOT NULL DEFAULT 24;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS announcements_items JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_tag TEXT NOT NULL DEFAULT 'Upcoming Announcements';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_title TEXT NOT NULL DEFAULT 'Specialized Earth Sciences Tracks.';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_subtitle TEXT NOT NULL DEFAULT 'Pre-register for next-generation cohorts and masterclasses.';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_btn_text TEXT NOT NULL DEFAULT 'View Complete Catalog';
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS upcoming_tracks_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.home_page_settings ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 3. Create alias view "home_page"
CREATE OR REPLACE VIEW public.home_page AS 
SELECT * FROM public.home_page_settings;

-- 4. Grant table privileges to anon, authenticated, and service_role
GRANT ALL ON TABLE public.home_page_settings TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.home_page TO anon, authenticated, service_role, postgres;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.home_page_settings ENABLE ROW LEVEL SECURITY;

-- 6. Allow all operations (select, insert, update, upsert) for anon and authenticated users
DROP POLICY IF EXISTS "Allow all operations for home_page_settings" ON public.home_page_settings;
DROP POLICY IF EXISTS "Allow public read access on home_page_settings" ON public.home_page_settings;
DROP POLICY IF EXISTS "Allow authenticated admin update on home_page_settings" ON public.home_page_settings;

CREATE POLICY "Allow all operations for home_page_settings" 
ON public.home_page_settings 
FOR ALL 
TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 7. Seed initial default configuration row
INSERT INTO public.home_page_settings (
    id,
    featured_programs_enabled,
    featured_programs_tag,
    featured_programs_title,
    featured_programs_subtitle,
    featured_programs_btn_text,
    featured_programs_btn_link,
    announcements_bar_enabled,
    announcements_bar_label,
    announcements_bar_speed,
    upcoming_tracks_enabled,
    upcoming_tracks_tag,
    upcoming_tracks_title,
    upcoming_tracks_subtitle,
    upcoming_tracks_btn_text
) VALUES (
    'default_settings',
    true,
    'Top Certified Tracks',
    'Featured Learning Programs',
    'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.',
    'Explore All Courses',
    '/courses',
    true,
    'Announcements',
    24,
    true,
    'Upcoming Announcements',
    'Specialized Earth Sciences Tracks.',
    'Pre-register for next-generation cohorts and masterclasses.',
    'View Complete Catalog'
) ON CONFLICT (id) DO NOTHING;
