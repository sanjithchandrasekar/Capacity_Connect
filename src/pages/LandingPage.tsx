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
    color: 'from-obsidian/5 to-cream',
    border: 'hover:border-obsidian/30 border-obsidian/15',
    iconColor: 'text-cream',
    iconBg: 'bg-obsidian',
    glow: '',
  },
  {
    icon: BookOpen,
    title: 'Trainers',
    desc: 'Create, manage, and deliver impactful learning content with rich media support.',
    color: 'from-teal/10 to-cream',
    border: 'hover:border-teal/40 border-teal/20',
    iconColor: 'text-cream',
    iconBg: 'bg-teal',
    glow: '',
  },
  {
    icon: ShieldCheck,
    title: 'Admins',
    desc: 'Oversee operations, manage users, approve content, and monitor analytics.',
    color: 'from-olive/10 to-cream',
    border: 'hover:border-olive/40 border-olive/25',
    iconColor: 'text-cream',
    iconBg: 'bg-olive',
    glow: '',
  },
];

const stats = [
  { label: 'Courses Available', value: '200+', icon: BookOpen, color: 'text-obsidian', bg: 'bg-obsidian/10' },
  { label: 'Active Users', value: '5,000+', icon: Users, color: 'text-teal', bg: 'bg-teal/10' },
  { label: 'Completion Rate', value: '94%', icon: BarChart3, color: 'text-olive', bg: 'bg-olive/15' },
  { label: 'Certificates Issued', value: '12,000+', icon: Star, color: 'text-teal', bg: 'bg-ice' },
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
    <div className="min-h-screen bg-cream text-obsidian font-sans">

      {/* === NAVBAR === */}
      <header className="sticky top-0 z-50 border-b border-obsidian/10 bg-cream/90 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Capacity Connect" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-obsidian">Capacity</span>
              <span className="text-teal"> Connect</span>
            </span>
          </div>
          <nav className="flex items-center gap-2 md:gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-obsidian/80 hover:text-teal hover:bg-teal/5 transition-all font-medium">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-teal hover:bg-teal/90 text-cream shadow-md shadow-teal/20 border-0 transition-all font-semibold">
                Get Started
                <ArrowRight className="ml-1 w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-8 md:pt-12 pb-20 text-center">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ice border border-ice-400/40 text-obsidian text-sm font-medium mb-8 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-teal" />
              Ministry of Earth Sciences (MoES) — SIH 2026 Initiative
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
              <span className="text-obsidian">Digital Capacity</span>
              <br />
              <span className="text-teal">
                Building & Learning
              </span>
              <br />
              <span className="text-obsidian">Portal</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-obsidian/70 max-w-2xl mx-auto leading-relaxed mb-10">
              A secure, role-based platform powering organizational training,
              competency development, knowledge sharing, and advanced learning analytics.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="group relative h-14 px-10 text-base font-semibold bg-teal hover:bg-teal/90 text-cream shadow-xl shadow-teal/25 border-0 hover:-translate-y-0.5 transition-all duration-300 rounded-xl overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                      Join the Platform
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="group h-14 px-10 text-base font-semibold border-obsidian/20 bg-obsidian/5 hover:bg-obsidian/10 text-obsidian hover:-translate-y-0.5 transition-all duration-300 rounded-xl">
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
                className="group relative bg-white border border-obsidian/10 rounded-2xl p-6 text-center hover:border-teal/40 hover:shadow-md transition-all duration-300 cursor-default overflow-hidden"
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-3 ${s.color} group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-obsidian mb-1">{s.value}</div>
                  <div className="text-sm text-obsidian/60">{s.label}</div>
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
            <motion.div variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-obsidian mb-4">Built for Every Role</h2>
              <p className="text-obsidian/70 max-w-xl mx-auto">One platform, three specialized experiences — each designed to maximize impact.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {roles.map((r) => (
                <motion.div
                  key={r.title}
                  variants={scaleIn}
                  className={`group relative p-8 rounded-2xl border ${r.border} bg-gradient-to-br ${r.color} shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg cursor-default overflow-hidden`}
                >
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl ${r.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <r.icon className={`w-7 h-7 ${r.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-obsidian mb-3">For {r.title}</h3>
                    <p className="text-obsidian/70 leading-relaxed text-sm">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* === FEATURES === */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="relative border border-obsidian/10 rounded-3xl p-10 md:p-16 bg-gradient-to-br from-cream to-ice/20 overflow-hidden">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {features.map((f) => (
                <motion.div key={f.title} variants={fadeUp} className="group flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-teal" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-obsidian mb-1 group-hover:text-teal transition-colors">{f.title}</h4>
                    <p className="text-sm text-obsidian/60 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* === FOOTER === */}
      <footer className="relative z-10 border-t border-obsidian/10 py-10 bg-cream">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-obsidian flex items-center justify-center">
              <Globe className="w-4 h-4 text-cream" />
            </div>
            <span className="text-sm font-semibold">
              <span className="text-obsidian">Capacity</span>
              <span className="text-teal"> Connect</span>
            </span>
          </div>
          <p className="text-sm text-obsidian/50">
            Smart India Hackathon 2026 &nbsp;•&nbsp; Problem Statement: SIH26075 &nbsp;•&nbsp; Team InnoX
          </p>
        </div>
      </footer>
    </div>
  );
}
