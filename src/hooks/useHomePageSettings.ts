import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface FeaturedProgramItem {
  id: string;
  title: string;
  description: string;
  department: string;
  badge: string;
  duration_hours: number;
  trainer_name: string;
  link: string;
  thumbnail_url?: string | null;
}

export interface AnnouncementItem {
  id: string;
  tag: string;
  tag_color: string;
  title: string;
  link: string;
}

export interface UpcomingTrackItem {
  id: string;
  title: string;
  status: string;
  status_color: string;
  level: string;
  date: string;
  duration: string;
  format: string;
  desc: string;
  key_skills: string;
  btn_text: string;
  link: string;
}

export interface HomePageSettings {
  id: string;
  // Section 1: Featured Programs
  featured_programs_enabled: boolean;
  featured_programs_tag: string;
  featured_programs_title: string;
  featured_programs_subtitle: string;
  featured_programs_btn_text: string;
  featured_programs_btn_link: string;
  featured_programs_items: FeaturedProgramItem[];

  // Section 2: Announcements Marquee
  announcements_bar_enabled: boolean;
  announcements_bar_label: string;
  announcements_bar_speed: number;
  announcements_items: AnnouncementItem[];

  // Section 3: Specialized Earth Sciences Tracks
  upcoming_tracks_enabled: boolean;
  upcoming_tracks_tag: string;
  upcoming_tracks_title: string;
  upcoming_tracks_subtitle: string;
  upcoming_tracks_btn_text: string;
  upcoming_tracks_items: UpcomingTrackItem[];

  updated_at?: string;
}

export const defaultFeaturedPrograms: FeaturedProgramItem[] = [
  {
    id: 'prog-1',
    title: 'Ocean Observation and Marine Data Analysis',
    description: 'This course introduces learners to ocean observation systems, marine data collection, oceanographic parameters, satellite observations, and basic marine data analysis.',
    department: 'INCOIS, MoES',
    badge: 'Top Rated',
    duration_hours: 80,
    trainer_name: 'Dr. V. Ramakrishnan',
    link: '/courses',
    thumbnail_url: null,
  },
  {
    id: 'prog-2',
    title: 'Cyclone Response and Early Warning Systems',
    description: 'Learn the fundamentals of weather forecasting, atmospheric processes, climate variability, climate change, and the use of meteorological data for disaster preparedness.',
    department: 'IMD, MoES',
    badge: 'Featured',
    duration_hours: 100,
    trainer_name: 'Dr. A. Sengupta',
    link: '/courses',
    thumbnail_url: null,
  },
  {
    id: 'prog-3',
    title: 'Doppler Weather Radar & Advanced Nowcasting Systems',
    description: 'Master operational radar telemetry, severe storm identification, mesocyclone tracking, and rapid nowcasting protocols for extreme weather events.',
    department: 'IMD, MoES',
    badge: 'Popular',
    duration_hours: 72,
    trainer_name: 'Dr. N. Mukherjee',
    link: '/courses',
    thumbnail_url: null,
  },
];

export const defaultAnnouncementItems: AnnouncementItem[] = [
  {
    id: 'ann-1',
    tag: 'MoES Live',
    tag_color: 'cyan',
    title: 'IMD Doppler Radar Network Calibration Workshop Open for Trainee Registration',
    link: '/courses',
  },
  {
    id: 'ann-2',
    tag: 'INCOIS Notice',
    tag_color: 'amber',
    title: 'Ocean State Forecast & In-Situ Buoy Data Analytics Winter Cohort Starts Oct 15',
    link: '/courses',
  },
  {
    id: 'ann-3',
    tag: 'Certification',
    tag_color: 'emerald',
    title: 'New Government-Accredited Micro-Credential Standards Published for Field Scientists',
    link: '/courses',
  },
  {
    id: 'ann-4',
    tag: 'Operational Alert',
    tag_color: 'sky',
    title: 'Numerical Weather Prediction (NWP) High-Performance Computing Portal Now Active',
    link: '/courses',
  },
  {
    id: 'ann-5',
    tag: 'Admissions',
    tag_color: 'purple',
    title: 'Dual-Pol Radar Nowcasting Batch Enrollment Closing Soon — Reserve Your Seat',
    link: '/register',
  },
];

export const defaultUpcomingTracks: UpcomingTrackItem[] = [
  {
    id: 'track-1',
    title: 'Dual-Pol Doppler Radar & Severe Storm Nowcasting',
    status: 'Pre-Registration Open',
    status_color: 'emerald',
    level: 'Advanced Specialist',
    date: 'Starts Oct 15, 2026',
    duration: '4 Weeks',
    format: 'Live Radar Labs',
    desc: "Go deep on polarimetric radar and real-time storm tracking, with live radar feeds you'll actually use in the field.",
    key_skills: 'Polarimetric Refl., Hydrometeor Class., Mesocyclone Detection',
    btn_text: 'Pre-Register Cohort',
    link: '/register',
  },
  {
    id: 'track-2',
    title: 'Coastal Early Warning & Ocean Telemetry Protocol',
    status: 'Fast Filling',
    status_color: 'amber',
    level: 'Executive Protocol',
    date: 'Starts Dec 01, 2026',
    duration: '3 Weeks',
    format: 'Field Buoy & In-Situ',
    desc: 'Master storm surge alerting and ocean buoy data workflows alongside joint INCOIS and IMD teams.',
    key_skills: 'Tsunami Sensor Array, Storm Surge Modeling, In-Situ Buoy QC',
    btn_text: 'Pre-Register Cohort',
    link: '/register',
  },
  {
    id: 'track-3',
    title: 'AI & Deep Learning in Numerical Weather Prediction',
    status: 'Limited Cohort',
    status_color: 'sky',
    level: 'Specialized Track',
    date: 'Starts Nov 02, 2026',
    duration: '6 Weeks',
    format: 'HPC Supercomputing',
    desc: 'Hands-on machine learning for weather models and ensemble forecasts, built for real computational pipelines.',
    key_skills: 'Graph Neural Nets, Ensemble Prediction, CUDA Acceleration',
    btn_text: 'Pre-Register Cohort',
    link: '/register',
  },
];

export const defaultHomePageSettings: HomePageSettings = {
  id: 'default_settings',
  // Section 1
  featured_programs_enabled: true,
  featured_programs_tag: 'Top Certified Tracks',
  featured_programs_title: 'Featured Learning Programs',
  featured_programs_subtitle: 'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.',
  featured_programs_btn_text: 'Explore All Courses',
  featured_programs_btn_link: '/courses',
  featured_programs_items: defaultFeaturedPrograms,

  // Section 2
  announcements_bar_enabled: true,
  announcements_bar_label: 'Announcements',
  announcements_bar_speed: 24,
  announcements_items: defaultAnnouncementItems,

  // Section 3
  upcoming_tracks_enabled: true,
  upcoming_tracks_tag: 'Upcoming Announcements',
  upcoming_tracks_title: 'Specialized Earth Sciences Tracks.',
  upcoming_tracks_subtitle: 'Pre-register for next-generation cohorts and masterclasses.',
  upcoming_tracks_btn_text: 'View Complete Catalog',
  upcoming_tracks_items: defaultUpcomingTracks,
};

const LOCAL_STORAGE_KEY = 'capacity_connect_home_page_settings';

export function getLocalSettings(): HomePageSettings {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultHomePageSettings,
        ...parsed,
        featured_programs_items: parsed.featured_programs_items?.length ? parsed.featured_programs_items : defaultFeaturedPrograms,
        announcements_items: parsed.announcements_items?.length ? parsed.announcements_items : defaultAnnouncementItems,
        upcoming_tracks_items: parsed.upcoming_tracks_items?.length ? parsed.upcoming_tracks_items : defaultUpcomingTracks,
      };
    }
  } catch (e) {
    // Ignore storage errors
  }
  return defaultHomePageSettings;
}

export function useHomePageSettings() {
  const queryClient = useQueryClient();

  const { data: settings = defaultHomePageSettings, isLoading } = useQuery<HomePageSettings>({
    queryKey: ['home_page_settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('home_page_settings' as any)
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          return getLocalSettings();
        }

        if (data && typeof data === 'object') {
          const raw = data as Record<string, any>;
          const merged: HomePageSettings = {
            ...defaultHomePageSettings,
            ...raw,
            featured_programs_items: raw.featured_programs_items?.length ? raw.featured_programs_items : defaultFeaturedPrograms,
            announcements_items: raw.announcements_items?.length ? raw.announcements_items : defaultAnnouncementItems,
            upcoming_tracks_items: raw.upcoming_tracks_items?.length ? raw.upcoming_tracks_items : defaultUpcomingTracks,
          };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      } catch (err) {
        // Fallback gracefully
      }
      return getLocalSettings();
    },
    staleTime: 1000 * 60 * 5,
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<HomePageSettings>) => {
      const updated: HomePageSettings = {
        ...settings,
        ...newSettings,
        id: 'default_settings',
        updated_at: new Date().toISOString(),
      };

      // Always save to local cache for instant zero-latency UI update
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      // Attempt DB upsert
      try {
        const { error } = await supabase
          .from('home_page_settings' as any)
          .upsert(updated, { onConflict: 'id' });

        if (error) {
          console.warn('Database table home_page_settings not configured yet. Changes saved locally:', error.message);
          return { ...updated, _dbError: true };
        }
      } catch (err) {
        return { ...updated, _dbError: true };
      }

      return updated;
    },
    onSuccess: (result: any) => {
      queryClient.setQueryData(['home_page_settings'], result);
      queryClient.invalidateQueries({ queryKey: ['home_page_settings'] });
      if (result._dbError) {
        toast.success('Home page settings updated! (Saved locally. Run the SQL query in Supabase to sync DB)');
      } else {
        toast.success('Home page sections successfully published!');
      }
    },
    onError: (err: any) => {
      toast.error('Failed to update settings: ' + (err.message || 'Unknown error'));
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
