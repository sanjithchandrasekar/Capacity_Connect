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
    color: 'from-cyan-500/20 to-cyan-500/5',
    border: 'hover:border-wheat/20',
    iconColor: 'text-wheat',
    iconBg: 'bg-wheat/10',
    glow: 'group-hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]',
  },
  {
    icon: BookOpen,
    title: 'Trainers',
    desc: 'Create, manage, and deliver impactful learning content with rich media support.',
    color: 'from-blue-500/20 to-blue-500/5',
    border: 'hover:border-wheat/20',
    iconColor: 'text-wheat',
    iconBg: 'bg-wheat/10',
    glow: 'group-hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
  },
  {
    icon: ShieldCheck,
    title: 'Admins',
    desc: 'Oversee operations, manage users, approve content, and monitor analytics.',
    color: 'from-indigo-500/20 to-indigo-500/5',
    border: 'hover:border-indigo-500/40',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10',
    glow: 'group-hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]',
  },
];

const stats = [
  { label: 'Courses Available', value: '200+', icon: BookOpen, color: 'text-wheat' },
  { label: 'Active Users', value: '5,000+', icon: Users, color: 'text-wheat' },
  { label: 'Completion Rate', value: '94%', icon: BarChart3, color: 'text-indigo-400' },
  { label: 'Certificates Issued', value: '12,000+', icon: Star, color: 'text-violet-400' },
];

const features = [
  { icon: Lock, title: 'Secure & Role-Based', desc: 'Military-grade RLS policies protect every data point.' },
  { icon: Zap, title: 'Real-Time Learning', desc: 'Live updates, instant feedback, and progress tracking.' },
  { icon: Globe, title: 'Government Compliant', desc: 'Built for Ministry of Earth Sciences standards.' },
];

export function LandingPage() {
  const { session, profile, loading } = useAuth();

  if (!loading && session) {
    if (profile?.role === 'admin' || profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'trainer') return <Navigate to="/trainer" replace />;
    return <Navigate to="/trainee" replace />;
  }

  return (
    <div className="min-h-screen bg-feldgrau text-wheat overflow-x-hidden font-sans">

      {/* === AURORA BACKGROUND === */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1400px] h-[800px] rounded-full bg-gradient-to-b from-cyan-600/20 via-blue-700/12 to-transparent blur-[120px]" />
        <div className="absolute top-[50%] -left-[15%] w-[600px] h-[600px] rounded-full bg-indigo-700/8 blur-[100px]" />
        <div className="absolute top-[35%] -right-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[80px]" />

        {/* Star dots */}
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.1,
              animation: `pulse ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}

        {/* Grid lines overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* === NAVBAR === */}
      <header className="relative z-20 sticky top-0 border-b border-wheat/10 bg-feldgrau backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <Globe className="w-5 h-5 text-wheat" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-wheat">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wheat to-wheat/70"> Connect</span>
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-wheat/70 hover:text-wheat hover:bg-wheat/10 transition-all">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transition-all">
                Get Started
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* === HERO === */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-20 text-center">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-wheat/10 border border-wheat/20 text-wheat text-sm font-medium mb-8 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Ministry of Earth Sciences (MoES) — SIH 2026 Initiative
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
              <span className="text-wheat">Digital Capacity</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500">
                Building & Learning
              </span>
              <br />
              <span className="text-wheat">Portal</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-wheat/70/90 max-w-2xl mx-auto leading-relaxed mb-10">
              A secure, role-based platform powering organizational training,
              competency development, knowledge sharing, and advanced learning analytics.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="group relative h-14 px-10 text-base font-semibold bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_40px_rgba(14,165,233,0.3)] hover:shadow-[0_0_60px_rgba(14,165,233,0.5)] hover:-translate-y-0.5 transition-all duration-300 rounded-xl overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">
                    Join the Platform
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-wheat to-wheat/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="group h-14 px-10 text-base font-semibold border-wheat/10 bg-wheat/5 hover:bg-white/[0.08] text-wheat hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm rounded-xl">
                  Access Dashboard
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-0.5 transition-transform" />
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
            className="mt-28 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="group relative bg-wheat/5 backdrop-blur-sm border border-wheat/10 rounded-2xl p-6 text-center hover:border-wheat/20 hover:bg-white/[0.04] transition-all duration-300 cursor-default overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/[0.02] to-transparent transition-opacity duration-300" />
                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-wheat/5 flex items-center justify-center mx-auto mb-3 ${s.color} group-hover:scale-110 transition-transform duration-300`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-wheat mb-1">{s.value}</div>
                  <div className="text-sm text-wheat0">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* === ROLE CARDS === */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div variants={fadeUp} className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-wheat mb-4">Built for Every Role</h2>
              <p className="text-wheat/70 max-w-xl mx-auto">One platform, three specialized experiences — each designed to maximize impact.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roles.map((r) => (
                <motion.div
                  key={r.title}
                  variants={scaleIn}
                  className={`group relative p-8 rounded-2xl border border-wheat/10 ${r.border} bg-gradient-to-br ${r.color} backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 cursor-default overflow-hidden ${r.glow}`}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/[0.04] to-transparent transition-opacity duration-500 rounded-2xl" />
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl ${r.iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <r.icon className={`w-7 h-7 ${r.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-wheat mb-3">For {r.title}</h3>
                    <p className="text-wheat/70 leading-relaxed text-sm">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* === FEATURES === */}
        <section className="max-w-7xl mx-auto px-6 pb-32">
          <div className="relative border border-wheat/10 rounded-3xl p-10 md:p-16 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]" />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative grid grid-cols-1 md:grid-cols-3 gap-10"
            >
              {features.map((f) => (
                <motion.div key={f.title} variants={fadeUp} className="group flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-wheat/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-wheat/10 group-hover:scale-110 transition-all duration-300">
                    <f.icon className="w-5 h-5 text-wheat" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-wheat mb-1 group-hover:text-wheat transition-colors">{f.title}</h4>
                    <p className="text-sm text-wheat/70 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* === FOOTER === */}
      <footer className="relative z-10 border-t border-wheat/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center">
              <Globe className="w-4 h-4 text-wheat" />
            </div>
            <span className="text-sm font-semibold text-wheat/70">
              <span className="text-wheat">Capacity</span>
              <span className="text-wheat"> Connect</span>
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Smart India Hackathon 2026 &nbsp;•&nbsp; Problem Statement: SIH26075 &nbsp;•&nbsp; Team InnoX
          </p>
        </div>
      </footer>
    </div>
  );
}
