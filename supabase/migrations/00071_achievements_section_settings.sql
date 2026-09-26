-- =========================================================================
-- Capacity Connect: Add Achievements & Results Section Columns
-- Migration: 00071_achievements_section_settings.sql
-- =========================================================================

-- 1. Add Section 4 (Achievements & Results) columns to home_page_settings
ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_tag TEXT NOT NULL DEFAULT 'Proven National Impact';

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_title TEXT NOT NULL DEFAULT 'Inspired trainees. Inspired results';

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_subtitle TEXT NOT NULL DEFAULT 'National Benchmark Results & Field Recognitions';

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_moes_badge TEXT NOT NULL DEFAULT '100% Verified Operational Skill Credentials';

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_moes_desc TEXT NOT NULL DEFAULT 'Direct alignment with WMO, IMD & INCOIS forecast protocols.';

ALTER TABLE public.home_page_settings 
ADD COLUMN IF NOT EXISTS achievements_stories JSONB DEFAULT '[]'::jsonb;

-- 2. Refresh permissions and RLS
GRANT ALL ON TABLE public.home_page_settings TO anon, authenticated, service_role, postgres;

-- 3. Notify postgrest schema reload
NOTIFY pgrst, 'reload schema';
