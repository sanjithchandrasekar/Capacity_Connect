import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Megaphone, BookOpen, Star, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }

export function DynamicUpdatesSection() {
  const { data: announcements } = useQuery({
    queryKey: ['landing_announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: latestCourses } = useQuery({
    queryKey: ['landing_courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`id, title, description, created_at, trainers(full_name)`)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    }
  });

  if (!announcements?.length && !latestCourses?.length) return null;

  return (
    <section className="relative py-24 bg-[#030712] border-t border-cyan-500/10 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12">
          
          {/* Announcements Column */}
          {announcements && announcements.length > 0 && (
            <div className="lg:col-span-5 space-y-8">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                  <Megaphone className="w-3.5 h-3.5" /> Updates
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-display">Latest Announcements</h2>
                <p className="text-slate-400 text-sm">Official notifications from the Ministry and Admins.</p>
              </motion.div>
              
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
                {announcements.map(ann => (
                  <motion.div key={ann.id} variants={fadeUp} className="group relative p-6 rounded-2xl bg-[#070E20]/90/5 border border-white/10 hover:bg-[#070E20]/90/[0.07] hover:border-cyan-500/30 transition-all overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30`}>
                        Update
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">{ann.title}</h3>
                    <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{ann.content}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* New Courses Column */}
          {latestCourses && latestCourses.length > 0 && (
            <div className={`space-y-8 ${announcements && announcements.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">
                  <Star className="w-3.5 h-3.5" /> Featured
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 font-display">New Learning Content</h2>
                <p className="text-slate-400 text-sm">Recently published courses and modules.</p>
              </motion.div>
              
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid sm:grid-cols-2 gap-5">
                {(latestCourses as any[]).map(course => (
                  <motion.div key={course.id} variants={fadeUp} className="group flex flex-col bg-[#090e1a] border border-white/5 rounded-3xl overflow-hidden hover:border-amber-500/30 transition-all">
                    <div className="h-40 overflow-hidden relative bg-slate-900">
                      {(course as any).thumbnail_url ? (
                        <img src={(course as any).thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-slate-700" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-bold text-amber-400 border border-amber-500/20">
                        NEW
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-white text-lg mb-2 line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{course.description}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">
                          By {((course.trainers as any)?.full_name) || 'IMD Expert'}
                        </span>
                        <Link to="/register" className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Enroll <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
          
        </div>
      </div>
    </section>
  );
}
