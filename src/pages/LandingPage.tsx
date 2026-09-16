import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  BookOpen, GraduationCap, ShieldCheck, ArrowRight,
  Zap, Globe, Users, BarChart3, Lock, Star, ChevronRight, Sparkles
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const roles = [
  {
    icon: GraduationCap,
    title: 'Trainees',
    desc: 'Access personalized courses, skill tracks, assessments, and digital certificates.',
    color: 'from-ink/5 to-ink/5',
    border: 'hover:border-ink/20',
    iconColor: 'text-ink',
    iconBg: 'bg-ink/5',
    glow: '',
  },
  {
    icon: BookOpen,
    title: 'Trainers',
    desc: 'Create, manage, and deliver impactful learning content with rich media support.',
    color: 'from-ink/5 to-ink/5',
    border: 'hover:border-ink/20',
    iconColor: 'text-ink',
    iconBg: 'bg-ink/5',
    glow: '',
  },
  {
    icon: ShieldCheck,
    title: 'Admins',
    desc: 'Oversee operations, manage users, approve content, and monitor analytics.',
    color: 'from-ink/10 to-ink/5',
    border: 'hover:border-ink/20',
    iconColor: 'text-ink',
    iconBg: 'bg-ink/10',
    glow: '',
  },
];

const stats = [
  { label: 'Courses Available', value: '200+', icon: BookOpen, color: 'text-ink' },
  { label: 'Active Users', value: '5,000+', icon: Users, color: 'text-ink' },
  { label: 'Completion Rate', value: '94%', icon: BarChart3, color: 'text-ink' },
  { label: 'Certificates Issued', value: '12,000+', icon: Star, color: 'text-ink' },
];

const features = [
  { icon: Lock, title: 'Secure & Role-Based', desc: 'Military-grade RLS policies protect every data point.' },
  { icon: Zap, title: 'Real-Time Learning', desc: 'Live updates, instant feedback, and progress tracking.' },
  { icon: Globe, title: 'Government Compliant', desc: 'Built for Ministry of Earth Sciences standards.' },
];

export function LandingPage() {
  const { session, profile, loading } = useAuth();

  if (!loading && session) {
    if (profile?.approval_status === 'pending') return <Navigate to="/pending-approval" replace />;
    if (profile?.approval_status === 'suspended') return <Navigate to="/account-suspended" replace />;
    if (profile?.approval_status === 'rejected') return <Navigate to="/access-denied" replace />;
    if (profile?.role === 'admin' || profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'trainer') return <Navigate to="/trainer" replace />;
    return <Navigate to="/trainee" replace />;
  }

  return (
    <div className="min-h-screen bg-cream text-ink overflow-x-hidden font-sans">

      {/* === NAVBAR === */}
      <header className="relative z-20 sticky top-0 border-b border-ink/10 bg-cream backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-9 md:h-9 object-contain" />
            <span className="text-base md:text-lg font-bold tracking-tight">
              <span className="text-ink">Capacity</span>
              <span className="text-ink"> Connect</span>
            </span>
          </div>
          <nav className="flex items-center gap-2 md:gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-ink/70 hover:text-ink hover:bg-ink/5 transition-all text-sm h-9 px-3">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-ink hover:bg-ink/90 text-cream border-0 transition-all text-sm h-9 px-3 md:px-4">
                Get Started
                <ArrowRight className="ml-1 w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-16 text-center">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-ink/5 border border-ink/10 text-ink text-xs md:text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">MoES — SIH 2026 Initiative</span>
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
              <span className="text-ink">Digital Capacity Building</span>
              <br />
              <span className="text-ink">& Learning Portal</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} className="text-base md:text-lg text-ink/70 max-w-2xl mx-auto leading-relaxed mb-8">
              A secure, role-based platform powering organizational training,
              competency development, knowledge sharing, and advanced learning analytics.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="group h-11 px-8 text-sm font-semibold bg-ink hover:bg-ink/90 text-cream border-0 transition-all rounded-xl">
                    <span className="flex items-center gap-2">
                      Join the Platform
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-11 px-8 text-sm font-semibold border-ink/20 bg-ink/5 hover:bg-ink/10 text-ink transition-all rounded-xl">
                  Access Dashboard
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="group relative bg-ink/5 border border-ink/10 rounded-2xl p-5 text-center hover:border-ink/20 transition-all duration-300 cursor-default"
              >
                <div className="relative">
                  <div className={`w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center mx-auto mb-2 ${s.color} group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-ink mb-0.5">{s.value}</div>
                  <div className="text-xs text-ink/60">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* === ROLE CARDS === */}
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-3">Built for Every Role</h2>
              <p className="text-ink/70 max-w-xl mx-auto text-sm">One platform, three specialized experiences — each designed to maximize impact.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {roles.map((r) => (
                <motion.div
                  key={r.title}
                  variants={scaleIn}
                  className={`group relative p-6 rounded-2xl border border-ink/10 ${r.border} bg-gradient-to-br ${r.color} transition-all duration-500 hover:-translate-y-1 cursor-default overflow-hidden ${r.glow}`}
                >
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl ${r.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <r.icon className={`w-6 h-6 ${r.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">For {r.title}</h3>
                    <p className="text-ink/70 leading-relaxed text-sm">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* === FEATURES === */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="relative border border-ink/10 rounded-3xl p-8 md:p-12 bg-ink/5 overflow-hidden">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {features.map((f) => (
                <motion.div key={f.title} variants={fadeUp} className="group flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-ink/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-all duration-300">
                    <f.icon className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-ink mb-1 group-hover:text-ink transition-colors">{f.title}</h4>
                    <p className="text-xs text-ink/60 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* === FOOTER === */}
      <footer className="relative z-10 border-t border-ink/10 py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            <span className="text-sm font-semibold text-ink/70">
              <span className="text-ink">Capacity</span>
              <span className="text-ink"> Connect</span>
            </span>
          </div>
          <p className="text-xs md:text-sm text-ink/50 text-center md:text-right">
            Smart India Hackathon 2026 &nbsp;•&nbsp; SIH26075 &nbsp;•&nbsp; Team InnoX
          </p>
        </div>
      </footer>
    </div>
  );
}
