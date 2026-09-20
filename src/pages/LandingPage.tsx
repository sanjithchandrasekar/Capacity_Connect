import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { StarfieldCanvas } from '@/components/space/StarfieldCanvas';
import { StickyScrollFeatures } from '@/components/landing/StickyScrollFeatures';
import {
  BookOpen,
  GraduationCap,
  ArrowRight,
  Zap,
  Globe,
  Users,
  BarChart3,
  Lock,
  Star,
  Sparkles,
  Compass,
  ChevronDown,
  Satellite,
  Radio,
  CloudRain,
  ShieldCheck,
  Award,
  Layers,
  Flame,
  ArrowUpRight,
  CheckCircle2,
  Quote,
  Building2,
  WifiOff,
  Cpu,
  HelpCircle,
  ExternalLink,
  Calendar,
} from 'lucide-react';

function AnimatedCounter({
  target,
  suffix = '',
  duration = 2.2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!isInView) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

const stats = [
  {
    label: 'Courses Available',
    target: 200,
    suffix: '+',
    icon: BookOpen,
    desc: 'All MoES-certified',
    glow: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-950/80 border border-purple-500/30',
  },
  {
    label: 'Active Users',
    target: 5000,
    suffix: '+',
    icon: Users,
    desc: 'Real scientists, real officers',
    glow: 'from-pink-500/20 to-pink-500/5',
    border: 'border-pink-500/30',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-950/80 border border-pink-500/30',
  },
  {
    label: 'Completion Rate',
    target: 94,
    suffix: '%',
    icon: BarChart3,
    desc: 'Learners who actually finish',
    glow: 'from-orange-500/20 to-orange-500/5',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-950/80 border border-orange-500/30',
  },
  {
    label: 'Certificates Issued',
    target: 12000,
    suffix: '+',
    icon: Star,
    desc: 'Credentials that hold up',
    glow: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-950/80 border border-cyan-500/30',
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: 'Trainees & Field Scientists',
    badge: 'Operational Learning',
    desc: 'Learn the way field work actually happens — hands-on radar labs, real assessments, and a certificate that means something when you show it.',
    highlights: [
      'Interactive satellite & telemetry lab modules',
      'Progress tracking with skill competency maps',
      'Verifiable government micro-credentials',
    ],
    border: 'border-purple-500/30 hover:border-purple-500/60',
    bg: 'bg-slate-900/80',
    iconBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-purple-600/30',
    badgeColor: 'text-purple-300 bg-purple-950/60 border-purple-500/30',
  },
  {
    icon: BookOpen,
    title: 'Trainers & Domain Experts',
    badge: 'Content Authoring',
    desc: 'Spend less time grading, more time teaching. Build your course once, let the platform handle scheduling and scoring.',
    highlights: [
      'Multi-format lecture & simulation builder',
      'Real-time student cohort performance analytics',
      'Automated assessment generation & scoring',
    ],
    border: 'border-pink-500/30 hover:border-pink-500/60',
    bg: 'bg-slate-900/80',
    iconBg: 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-lg shadow-pink-600/30',
    badgeColor: 'text-pink-300 bg-pink-950/60 border-pink-500/30',
  },
];

const upcomingCourses = [
  {
    title: 'Dual-Pol Doppler Radar & Severe Storm Nowcasting',
    status: 'Pre-Registration Open',
    statusColor: 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40',
    dotColor: 'bg-emerald-400',
    date: 'Starts Oct 15, 2026',
    duration: '4 Weeks • Live Radar Labs',
    level: 'Advanced Specialist',
    department: 'IMD Radar Operations Division',
    desc: "Go deep on polarimetric radar and real-time storm tracking, with live radar feeds you'll actually use in the field.",
    icon: Radio,
    color: 'from-purple-900/30 via-slate-900/90 to-slate-950',
    border: 'border-purple-500/30 hover:border-purple-400/70',
    glow: 'from-purple-500/20 to-transparent',
    iconBg: 'bg-purple-950/80 border border-purple-500/40 text-purple-300',
  },
  {
    title: 'AI & Deep Learning in Numerical Weather Prediction',
    status: 'Limited 60 Seats',
    statusColor: 'text-pink-300 bg-pink-950/70 border-pink-500/40',
    dotColor: 'bg-pink-400',
    date: 'Starts Nov 02, 2026',
    duration: '6 Weeks • Hybrid Cohort',
    level: 'Specialized Track',
    department: 'MoES High Performance Computing',
    desc: 'Hands-on machine learning for weather models and ensemble forecasts, built for real computational pipelines.',
    icon: Cpu,
    color: 'from-pink-900/30 via-slate-900/90 to-slate-950',
    border: 'border-pink-500/30 hover:border-pink-400/70',
    glow: 'from-pink-500/20 to-transparent',
    iconBg: 'bg-pink-950/80 border border-pink-500/40 text-pink-300',
  },
  {
    title: 'Coastal Early Warning & Ocean Telemetry Protocol',
    status: 'Announcing Soon',
    statusColor: 'text-amber-300 bg-amber-950/70 border-amber-500/40',
    dotColor: 'bg-amber-400',
    date: 'Starts Dec 01, 2026',
    duration: '3 Weeks • Field & Web',
    level: 'Executive Protocol',
    department: 'INCOIS & IMD Cyclone Center',
    desc: 'Master storm surge alerting and ocean buoy data workflows alongside joint INCOIS and IMD teams.',
    icon: Satellite,
    color: 'from-orange-900/30 via-slate-900/90 to-slate-950',
    border: 'border-orange-500/30 hover:border-orange-400/70',
    glow: 'from-orange-500/20 to-transparent',
    iconBg: 'bg-orange-950/80 border border-orange-500/40 text-orange-300',
  },
];

const testimonials = [
  {
    quote:
      'Capacity Connect revolutionized how our regional meteorologists train on Doppler radar feeds. The interactive simulations give real-time confidence before high-impact monsoon events.',
    author: 'Dr. V. Ramakrishnan',
    role: 'Scientist-F, Regional Meteorological Centre (Chennai)',
    division: 'India Meteorological Department',
  },
  {
    quote:
      'The ability to track field officers’ competency in AWS calibration across 500+ remote stations ensures high data fidelity for our Numerical Weather Prediction models.',
    author: 'Shri A. Sengupta',
    role: 'Director of Observational Networks',
    division: 'Ministry of Earth Sciences (MoES)',
  },
  {
    quote:
      'The role-based architecture and government-compliant learning paths allow us to seamlessly induct new trainees into cyclone tracking protocols with measurable certification.',
    author: 'Dr. N. Mukherjee',
    role: 'Lead Trainer & Synoptic Analyst',
    division: 'Mausam Bhawan, New Delhi',
  },
];

export function LandingPage() {
  const { session, profile, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleVideoTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const remaining = v.duration - v.currentTime;
    // When nearing end of video (last 1.4s), smoothly fade out
    if (remaining < 1.4) {
      setVideoOpacity(0);
    } else if (v.currentTime >= 0.1 && videoOpacity === 0) {
      // Smoothly fade back in on restart
      setVideoOpacity(1);
    }
  };

  if (!loading && session) {
    if (profile?.approval_status === 'pending') return <Navigate to="/pending-approval" replace />;
    if (profile?.approval_status === 'suspended') return <Navigate to="/account-suspended" replace />;
    if (profile?.approval_status === 'rejected') return <Navigate to="/access-denied" replace />;
    if (profile?.role === 'admin' || profile?.role === 'super_admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'trainer') return <Navigate to="/trainer" replace />;
    return <Navigate to="/trainee" replace />;
  }

  const scrollToFeatures = () => {
    const el = document.getElementById('sticky-features');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#05060F] text-slate-100 font-sans relative selection:bg-pink-500 selection:text-white overflow-x-hidden">
      {/* Background Starfield Particle Canvas */}
      <StarfieldCanvas />

      {/* Decorative cosmic background glow orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-purple-600/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-pink-600/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed bottom-10 left-1/4 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[150px] z-0" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Transparent/Glass over hero, Frosted Dark on scroll)        */}
      {/* ========================================================================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#05060F]/90 backdrop-blur-2xl border-b border-purple-500/20 py-3 shadow-2xl shadow-purple-950/20'
            : 'bg-transparent border-b border-white/10 py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 group cursor-pointer">
            <img src="/logo.png" alt="Capacity Connect Logo" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold font-display tracking-tight leading-tight">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                {' '}
                Connect
              </span>
            </span>
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-white/10 text-sm font-medium transition-all"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-pink-500/25 border-0 text-sm font-semibold transition-all duration-300 hover:scale-[1.02]">
                Get Started
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (Full-bleed Video + Right-Aligned Content)                */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-20 pb-16">
        {/* Autoplaying, Looping, Muted Background Video with Smooth Fade Loop */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedData={() => setVideoOpacity(1)}
          onPlay={() => setVideoOpacity(1)}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-1000 ease-in-out"
          style={{ opacity: videoOpacity }}
        >
          <source src="/home page/291398.mp4" type="video/mp4" />
        </video>

        {/* Dark Gradient Scrim Overlay for Contrast & Space Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060F]/30 via-[#05060F]/70 to-[#05060F]/90 z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060F] via-transparent to-[#05060F]/60 z-0 pointer-events-none" />

        {/* Hero Grid Container: Left Side Open to Video, Right Side Content Block */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row items-center justify-between my-auto">
          {/* Left Column (Left/Center open for cinematic video visibility) */}
          <div className="hidden lg:block lg:w-5/12 pointer-events-none" />

          {/* Right Column: ALL HERO TEXT CONTENT RIGHT-ALIGNED & POSITIONED RIGHT (NO BOUNDING CARD) */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-7/12 flex flex-col items-end text-right justify-center max-w-2xl"
          >
            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-display tracking-tight leading-[1.08] mb-4 text-white text-right drop-shadow-lg"
            >
              <span>Train Like the</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 text-glow-purple">
                Storm Is Already Here
              </span>
            </motion.h1>

            {/* Short & Catchy Subtitle */}
            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg md:text-xl text-slate-200/90 leading-relaxed mb-8 text-right font-normal max-w-lg drop-shadow-md"
            >
              India&apos;s meteorologists learn best under pressure &mdash; so we built a platform that simulates real satellite and radar data, not just slides. Get certified, get field-ready.
            </motion.p>

            {/* CTA Buttons (Right Aligned) */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-end gap-3.5 w-full"
            >
              <Link to="/courses" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-7 text-sm sm:text-base font-semibold border-purple-500/40 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 hover:text-white rounded-xl backdrop-blur-md transition-all duration-300 group shadow-lg shadow-purple-950/30"
                >
                  Browse Courses
                  <Compass className="w-4 h-4 ml-2 group-hover:rotate-45 transition-transform text-pink-400" />
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 text-sm sm:text-base font-semibold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-xl shadow-pink-500/30 border-0 rounded-xl hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  Join the Platform
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll-down Indicator (Bottom Center) */}
        <button
          onClick={scrollToFeatures}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-slate-400 hover:text-white transition-colors group cursor-pointer"
          aria-label="Scroll to explore"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 group-hover:text-pink-400 transition-colors">
            Scroll to explore
          </span>
          <div className="w-7 h-7 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:border-purple-500/40 transition-all">
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 animate-bounce" />
          </div>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 3. STICKY SCROLL SCROLLYTELLING SECTION (3 Ordered Images & Alternating Layout) */}
      {/* ========================================================================= */}
      <StickyScrollFeatures />

      {/* ========================================================================= */}
      {/* 4. FINAL CALL TO ACTION (CTA BAND WITH COSMIC ORBIT GLOW)                */}
      {/* ========================================================================= */}
      <section className="relative py-28 bg-[#05060F] border-t border-purple-500/10 overflow-hidden">
        {/* Orbital rings background visual */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-purple-500/20 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-pink-500/15 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-orange-600/20 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            Join the Next Generation of Earth Scientists
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-display text-white tracking-tight leading-tight mb-6">
            Ready to Build Capacity for a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
              Changing Climate?
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Join hundreds of field officers, meteorologists, and data analysts across India. Get started
            today with official government certification tracks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 px-10 text-base font-semibold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-2xl shadow-pink-500/30 rounded-xl"
              >
                Join the Platform
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/courses" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 rounded-xl"
              >
                Browse All Courses
                <Compass className="ml-2 w-4 h-4 text-pink-400" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "BUILT FOR EVERY ROLE" (Trainees, Trainers, Coordinators)              */}
      {/* ========================================================================= */}
      <section id="roles-section" className="relative py-24 bg-[#07091B] border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              Role-Specific Workspaces
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
              Built for Every Stakeholder
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Tailored dashboards and tools configured specifically for field trainees, scientific
              instructors, and ministry administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {roles.map((r) => (
              <motion.div
                key={r.title}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`group relative p-8 sm:p-10 rounded-3xl border ${r.border} ${r.bg} backdrop-blur-xl shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden flex flex-col justify-between`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${r.iconBg} flex items-center justify-center text-white`}>
                      <r.icon className="w-7 h-7" />
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border ${r.badgeColor}`}
                    >
                      {r.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold font-display text-white mb-3 tracking-tight">
                    {r.title}
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                    {r.desc}
                  </p>

                  <div className="space-y-3 mb-8">
                    {r.highlights.map((h) => (
                      <div key={h} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <span>Get Started in this Role</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <span className="text-xs font-mono text-slate-500">Fast-track Onboarding</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MISSION / IMPACT STATEMENT BAND & GLOWING STATS                        */}
      {/* ========================================================================= */}
      <section id="mission-section" className="relative py-24 bg-[#05060F] border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Mission statement */}
          <div className="relative rounded-3xl p-10 md:p-14 bg-gradient-to-b from-purple-950/30 via-slate-900/50 to-slate-950 border border-purple-500/20 backdrop-blur-xl mb-16 overflow-hidden">
            <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl" />

            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-wider text-purple-300 mb-6">
                <Globe className="w-3.5 h-3.5 text-pink-400" />
                National Earth Sciences Mission
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold font-display text-white tracking-tight leading-tight mb-6">
                Strengthening India&apos;s Meteorological Readiness for a Changing Climate
              </h2>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal max-w-3xl mx-auto">
                One platform, every skill IMD and MoES need &mdash; cyclone tracking, monsoon forecasting, seismology, ocean observation &mdash; built for the people doing the actual work.
              </p>
            </div>
          </div>

          {/* Glowing Cosmic Stat Cards */}
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className={`group relative bg-slate-900/70 backdrop-blur-xl border ${s.border} rounded-2xl p-6 text-center hover:scale-[1.02] transition-all duration-300 overflow-hidden`}
              >
                {/* Background gradient glow on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center mx-auto mb-4 ${s.iconColor} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-1 tracking-tight">
                    <AnimatedCounter target={s.target} suffix={s.suffix} />
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mb-1">{s.label}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. UPCOMING COURSES & ANNOUNCEMENTS PREVIEW                               */}
      {/* ========================================================================= */}
      <section id="courses-preview" className="relative py-24 bg-[#07091B] border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-950/60 border border-pink-500/30 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                Upcoming Announcements
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight">
                Upcoming Specialized Earth Sciences Tracks
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mt-3">
                Pre-register for next-generation meteorological cohorts, high-resolution radar masterclasses, and executive certification tracks.
              </p>
            </div>
            <Link to="/courses">
              <Button
                variant="outline"
                className="border-pink-500/40 bg-pink-950/30 text-pink-300 hover:text-white hover:bg-pink-900/50 rounded-xl"
              >
                View Complete Course Catalog
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {upcomingCourses.map((c) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative p-7 rounded-2xl bg-gradient-to-b ${c.color} border ${c.border} backdrop-blur-xl flex flex-col justify-between group transition-all duration-300 shadow-xl hover:shadow-2xl overflow-hidden`}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${c.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  {/* Icon & Department */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                      <c.icon className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-mono text-slate-300 line-clamp-1">
                      {c.department}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-xl font-bold font-display text-white mb-3 group-hover:text-pink-300 transition-colors leading-snug">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed mb-6">
                    {c.desc}
                  </p>
                </div>

                {/* Card Footer with schedule and action */}
                <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-pink-400" />
                      {c.date}
                    </span>
                    <span className="text-slate-400 text-[11px]">{c.duration}</span>
                  </div>

                  <Link
                    to="/register"
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 hover:from-pink-600/50 hover:to-purple-600/50 border border-pink-500/40 text-pink-200 hover:text-white font-semibold text-xs tracking-wide transition-all duration-200"
                  >
                    <span>Pre-Register Cohort</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. TESTIMONIALS & TRUST BAND                                              */}
      {/* ========================================================================= */}
      <section className="relative py-24 bg-[#05060F] border-t border-purple-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <Quote className="w-3.5 h-3.5 text-pink-400" />
              Field Impact
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
              Trusted by Meteorological Centres Across India
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.author}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-slate-900/70 border border-purple-500/20 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden"
              >
                <div className="text-pink-500/30 mb-4">
                  <Quote className="w-8 h-8" />
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-4 border-t border-white/10">
                  <div className="text-sm font-bold text-white">{t.author}</div>
                  <div className="text-xs text-purple-300">{t.role}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">{t.division}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. SPACE FOOTER                                                          */}
      {/* ========================================================================= */}
      <footer className="relative z-10 bg-[#03040A] border-t border-purple-500/20 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 mb-2 group cursor-pointer">
              <img src="/logo.png" alt="Capacity Connect" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold font-display text-white">
                Capacity
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                  {' '}
                  Connect
                </span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xl">
              Digital Capacity Building & Learning Portal developed for the Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD).
            </p>
          </div>

          <div className="text-xs font-mono text-slate-500 text-center md:text-right shrink-0">
            © 2026 Capacity Connect • All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
