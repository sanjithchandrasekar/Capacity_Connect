import React from 'react';
import { Megaphone, Bell, Radio, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';

const defaultAnnouncements = [
  {
    id: 'ann-1',
    tag: 'MoES Live',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    title: 'IMD Doppler Radar Network Calibration Workshop Open for Trainee Registration',
    icon: Radio,
    link: '/courses',
  },
  {
    id: 'ann-2',
    tag: 'INCOIS Notice',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    title: 'Ocean State Forecast & In-Situ Buoy Data Analytics Winter Cohort Starts Oct 15',
    icon: Sparkles,
    link: '/courses',
  },
  {
    id: 'ann-3',
    tag: 'Certification',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    title: 'New Government-Accredited Micro-Credential Standards Published for Field Scientists',
    icon: Bell,
    link: '/courses',
  },
  {
    id: 'ann-4',
    tag: 'Operational Alert',
    tagColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    title: 'Numerical Weather Prediction (NWP) High-Performance Computing Portal Now Active',
    icon: AlertCircle,
    link: '/courses',
  },
  {
    id: 'ann-5',
    tag: 'Admissions',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    title: 'Dual-Pol Radar Nowcasting Batch Enrollment Closing Soon — Reserve Your Seat',
    icon: Megaphone,
    link: '/register',
  },
];

import { useHomePageSettings } from '@/hooks/useHomePageSettings';

export function HorizontalAnnouncementBar() {
  const { settings } = useHomePageSettings();

  const { data: dbAnnouncements } = useQuery({
    queryKey: ['landing_horizontal_announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) return [];
      return data || [];
    },
  });

  const getTagColorClass = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'sky':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cyan':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  // Prioritize admin configured items when present
  const announcementsList = React.useMemo(() => {
    if (settings?.announcements_items && settings.announcements_items.length > 0) {
      return settings.announcements_items.map((item, idx) => ({
        id: item.id || `admin-ann-${idx}`,
        tag: item.tag || 'Notice',
        tagColor: getTagColorClass(item.tag_color),
        title: item.title,
        icon: Megaphone,
        link: item.link || '/courses',
      }));
    }

    const items: Array<{
      id: string;
      tag: string;
      tagColor: string;
      title: string;
      icon: any;
      link?: string;
    }> = [];

    if (dbAnnouncements && dbAnnouncements.length > 0) {
      dbAnnouncements.forEach((ann: any) => {
        items.push({
          id: ann.id,
          tag: 'Official Update',
          tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          title: ann.title || ann.content,
          icon: Megaphone,
          link: '/courses',
        });
      });
    }

    // Append fallback curated items only if no admin items exist
    defaultAnnouncements.forEach((d) => {
      if (!items.some((i) => i.title === d.title)) {
        items.push(d);
      }
    });

    return items;
  }, [settings?.announcements_items, dbAnnouncements]);

  // If toggled off by admin, do not render
  if (settings && !settings.announcements_bar_enabled) {
    return null;
  }

  // Quadruple items so there is a rich uninterrupted stream on any screen size
  const marqueeItems = [
    ...announcementsList,
    ...announcementsList,
    ...announcementsList,
    ...announcementsList,
  ];

  return (
    <div className="group/bar relative w-full bg-[#020612] border-y border-cyan-500/20 py-3 overflow-hidden select-none z-20 shadow-xl shadow-black/60">
      <div className="w-full flex items-center relative">
        {/* Left side fixed pill label */}
        <div className="flex items-center gap-2 pl-5 pr-5 py-1 border-r border-cyan-500/30 z-30 shrink-0 bg-[#020612] shadow-md shadow-black/80">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-display flex items-center gap-1.5 whitespace-nowrap">
            <Megaphone className="w-3.5 h-3.5 text-cyan-400" /> {settings?.announcements_bar_label && settings.announcements_bar_label !== 'Announcements' ? settings.announcements_bar_label : 'Updates'}
          </span>
        </div>

        {/* Right gradient edge fade for seamless text exit */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-[#020612] to-transparent z-20" />

        {/* Pure CSS Infinite Marquee Track (Smooth, comfortable reading speed, zero-flicker instant hover pause) */}
        <div className="flex-1 overflow-hidden relative cursor-pointer pl-4">
          <div 
            className="animate-marquee-infinite flex items-center gap-8 w-max whitespace-nowrap will-change-transform group-hover/bar:[animation-play-state:paused]"
            style={{ animationDuration: `${(settings?.announcements_bar_speed && settings.announcements_bar_speed >= 40) ? settings.announcements_bar_speed : 65}s` }}
          >
            {marqueeItems.map((item, idx) => {
              return (
                <Link
                  key={`${item.id}-${idx}`}
                  to={item.link || '/courses'}
                  className="inline-flex items-center gap-3 text-slate-200 hover:text-cyan-300 transition-colors group/item shrink-0"
                >
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.tagColor} shrink-0`}>
                    {item.tag}
                  </span>

                  <span className="text-xs sm:text-sm font-medium tracking-[-0.01em] text-slate-200 group-hover/item:text-cyan-300 transition-colors flex items-center gap-1">
                    {item.title}
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 group-hover/item:-translate-y-0.5 transition-all text-cyan-400" />
                  </span>

                  {/* Dot separator */}
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 ml-4 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
