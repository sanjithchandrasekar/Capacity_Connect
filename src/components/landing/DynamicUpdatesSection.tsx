import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, type Variants } from 'framer-motion';
import { Megaphone, Calendar, ArrowRight, Sparkles, Clock, Compass, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Thumbnail } from '@/components/ui/Thumbnail';

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };

interface CourseCardItem {
  id: string;
  title: string;
  description: string | null;
  course_type?: string;
  department?: string | null;
  duration_minutes?: number | null;
  thumbnail_path?: string | null;
  created_at?: string;
  trainer?: { full_name?: string } | null;
  trainers?: { full_name?: string } | null;
  rating?: number;
  enrolled_count?: string;
  badge?: string;
  custom_link?: string;
}

// Curated flagship fallback to guarantee 3 cards if database has fewer than 3 published courses
const fallbackCourses: CourseCardItem[] = [
  {
    id: 'doppler-radar-nowcasting',
    title: 'Doppler Weather Radar & Advanced Nowcasting Systems',
    description: 'Master operational radar telemetry, severe storm identification, mesocyclone tracking, and rapid nowcasting protocols for extreme weather events.',
    course_type: 'Technical',
    department: 'IMD, MoES',
    duration_minutes: 4320,
    trainer: { full_name: 'Dr. V. Ramakrishnan' },
    thumbnail_path: null,
    rating: 4.9,
    enrolled_count: '480+',
    badge: 'Popular',
    created_at: new Date().toISOString(),
  },
  {
    id: 'numerical-weather-prediction',
    title: 'Numerical Weather Prediction & Deep Learning Modeling',
    description: 'Comprehensive curriculum on high-performance computing, atmospheric dynamical equations, and AI-accelerated global ensemble forecast models.',
    course_type: 'Specialist',
    department: 'NCMRWF, MoES',
    duration_minutes: 5400,
    trainer: { full_name: 'Dr. A. Sengupta' },
    thumbnail_path: null,
    rating: 4.8,
    enrolled_count: '320+',
    badge: 'Featured',
    created_at: new Date().toISOString(),
  },
];

import { useHomePageSettings } from '@/hooks/useHomePageSettings';

export function DynamicUpdatesSection() {
  const { settings } = useHomePageSettings();

  const { data: announcements } = useQuery({
    queryKey: ['landing_announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) return [];
      return data || [];
    }
  });

  const { data: dbCourses } = useQuery({
    queryKey: ['landing_top_courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          course_type,
          department,
          duration_minutes,
          thumbnail_path,
          created_at,
          trainer:trainers!courses_trainer_id_fkey(full_name)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) return [];
      return (data as unknown as CourseCardItem[]) || [];
    }
  });

  // Combine admin customized items or database courses with high-quality fallback cards
  const displayedCourses = React.useMemo<CourseCardItem[]>(() => {
    if (settings?.featured_programs_items && settings.featured_programs_items.length > 0) {
      return settings.featured_programs_items.map((item, index) => ({
        id: item.id || `prog-${index}`,
        title: item.title,
        description: item.description,
        department: item.department || 'MoES Specialist Track',
        course_type: 'Technical',
        duration_minutes: (item.duration_hours || 40) * 60,
        trainer: { full_name: item.trainer_name || 'MoES Scientific Faculty' },
        badge: item.badge || (index === 0 ? 'Top Rated' : index === 1 ? 'Featured' : 'Popular'),
        thumbnail_path: item.thumbnail_url || null,
        custom_link: item.link || '/courses',
      }));
    }

    const list: CourseCardItem[] = [...(dbCourses || [])];
    let fallbackIdx = 0;
    while (list.length < 3 && fallbackIdx < fallbackCourses.length) {
      list.push(fallbackCourses[fallbackIdx]);
      fallbackIdx++;
    }
    return list.slice(0, 3);
  }, [settings?.featured_programs_items, dbCourses]);

  // If section is toggled off by admin, do not render
  if (settings && !settings.featured_programs_enabled) {
    return null;
  }

  const sectionTag = settings?.featured_programs_tag || 'Top Certified Tracks';
  const sectionTitle = settings?.featured_programs_title || 'Featured Learning Programs';
  const sectionSubtitle = settings?.featured_programs_subtitle || 'Explore government-certified, high-impact earth science and meteorological training tracks led by premier MoES scientific institutions.';
  const btnText = settings?.featured_programs_btn_text || 'Explore All Courses';
  const btnLink = settings?.featured_programs_btn_link || '/courses';

  return (
    <section className="relative py-20 sm:py-28 bg-gradient-to-b from-[#f8fafc] via-white to-[#f1f5f9] text-slate-900 border-t border-slate-200 overflow-hidden">
      {/* Decorative ambient subtle radial lighting */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent opacity-60" />
      <div className="pointer-events-none absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-[130px]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-16">
        
        {/* Optional Active Announcements Banner / Section */}
        {announcements && announcements.length > 0 && (
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="p-6 rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xl shadow-slate-200/60">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Megaphone className="w-3.5 h-3.5 text-cyan-600" /> Latest Announcements
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((ann: any) => (
                <div key={ann.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:border-cyan-500/40 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3 text-cyan-600" />
                    <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">{ann.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Courses Section */}
        <div className="space-y-10">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold tracking-wider uppercase mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> {sectionTag}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-slate-900 tracking-[-0.02em] leading-tight mb-3">
                {sectionTitle}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {sectionSubtitle}
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Link to={btnLink}>
                <button className="h-11 px-6 rounded-full border border-cyan-600/30 bg-cyan-600 text-white hover:bg-cyan-700 text-sm font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg shadow-cyan-600/20 group">
                  <Compass className="w-4 h-4 text-cyan-200 group-hover:rotate-45 transition-transform" />
                  <span>{btnText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>
          </div>

          {/* 3 Cards Grid */}
          <motion.div 
            variants={stagger} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, amount: 0.1 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {displayedCourses.map((course: any, idx: number) => {
              const trainerName = (course.trainer as any)?.full_name || (course.trainers as any)?.full_name || 'MoES Scientific Faculty';
              const durationHours = course.duration_minutes ? Math.round(course.duration_minutes / 60) : 60;
              const isDatabaseCourse = !course.id.startsWith('doppler-') && !course.id.startsWith('numerical-') && !course.id.startsWith('prog-');
              const courseLink = course.custom_link || (isDatabaseCourse ? `/courses/${course.id}` : '/courses');

              return (
                <motion.div
                  key={course.id || idx}
                  variants={fadeUp}
                  className="group flex flex-col bg-white border border-slate-200/90 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 hover:-translate-y-1.5"
                >
                  {/* Thumbnail Banner */}
                  <div className="h-48 relative overflow-hidden bg-slate-900">
                    {course.thumbnail_path && (course.thumbnail_path.startsWith('http') || course.thumbnail_path.startsWith('data:') || course.thumbnail_path.startsWith('/')) ? (
                      <img 
                        src={course.thumbnail_path} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <Thumbnail 
                        path={course.thumbnail_path} 
                        alt={course.title} 
                        type={course.course_type} 
                        className="group-hover:scale-105 transition-transform duration-700"
                      />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                        <Award className="w-3 h-3 text-amber-300" />
                        {course.badge || (idx === 0 ? 'Top Rated' : idx === 1 ? 'Featured' : 'Certified')}
                      </span>

                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-100 bg-black/75 backdrop-blur-md border border-white/15 flex items-center gap-1 shadow-sm">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{durationHours}h Track</span>
                      </span>
                    </div>

                    {/* Department Tag at Bottom of Image */}
                    <div className="absolute bottom-3 left-3.5 pointer-events-none">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                        {course.department || 'MoES Certified'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4 bg-white">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg sm:text-xl text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-2 leading-snug tracking-[-0.01em]">
                        {course.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {course.description || 'Comprehensive government curriculum designed for operational forecasting and earth science excellence.'}
                      </p>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-2 truncate max-w-[150px]">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {trainerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-500 truncate font-medium">
                          {trainerName}
                        </span>
                      </div>

                      <Link
                        to={courseLink}
                        className="inline-flex items-center gap-1 text-xs font-bold text-cyan-600 hover:text-cyan-700 group-hover:gap-1.5 transition-all"
                      >
                        <span>{isDatabaseCourse ? 'View Details' : 'Enroll Now'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </section>
  );
}

