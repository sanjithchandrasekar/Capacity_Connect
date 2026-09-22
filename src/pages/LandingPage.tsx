import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { StarfieldCanvas } from '@/components/space/StarfieldCanvas';
import { StickyScrollFeatures } from '@/components/landing/StickyScrollFeatures';
import { MissionExplodedView } from '@/components/landing/MissionExplodedView';
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
  Mail,
  Phone,
  MapPin,
  Send,
  Menu,
  X,
  Loader2,
} from 'lucide-react';

function AnimatedCounter({
  target,
  suffix = '',
  duration = 1.8,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: false, margin: '-20px' });

  useEffect(() => {
    let animationFrameId: number;

    if (isInView) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        // Ease out cubic for smooth accelerating-to-settling counter
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * target));

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setCount(target);
        }
      };

      animationFrameId = requestAnimationFrame(step);
    } else {
      setCount(0);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

function IndianAshokaChakraIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ashoka Chakra - Emblem of India"
    >
      <circle cx="12" cy="12" r="10" stroke="#FF9933" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="8" stroke="#138808" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="2.2" fill="#000080" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="12"
          y1="12"
          x2="12"
          y2="4"
          stroke="#000080"
          strokeWidth="0.6"
          strokeLinecap="round"
          transform={`rotate(${i * 15} 12 12)`}
        />
      ))}
    </svg>
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
    glow: 'from-cyan-500/20 to-transparent',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-950/80 border border-cyan-500/40',
  },
  {
    label: 'Active Users',
    target: 5000,
    suffix: '+',
    icon: Users,
    desc: 'Real scientists, real officers',
    glow: 'from-sky-500/20 to-transparent',
    border: 'border-sky-500/30 hover:border-sky-400',
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-950/80 border border-sky-500/40',
  },
  {
    label: 'Completion Rate',
    target: 94,
    suffix: '%',
    icon: BarChart3,
    desc: 'Learners who actually finish',
    glow: 'from-amber-500/20 to-transparent',
    border: 'border-amber-500/30 hover:border-amber-400',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-950/80 border border-amber-500/40',
  },
  {
    label: 'Certificates Issued',
    target: 12000,
    suffix: '+',
    icon: Star,
    desc: 'Credentials that hold up',
    glow: 'from-emerald-500/20 to-transparent',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-950/80 border border-emerald-500/40',
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: 'Trainees & Field Scientists',
    badge: 'Operational Learning',
    desc: 'Learn the way field work actually happens — hands-on radar labs, real telemetry assessments, and verifiable government micro-credentials.',
    highlights: [
      'Interactive satellite & telemetry lab modules',
      'Progress tracking with skill competency maps',
      'Verifiable government micro-credentials',
    ],
    border: 'border-cyan-500/30 hover:border-cyan-400',
    bg: 'bg-[#081022]/90',
    iconBg: 'bg-gradient-to-br from-cyan-600 to-blue-700 shadow-lg shadow-cyan-600/30',
    badgeColor: 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40',
  },
  {
    icon: BookOpen,
    title: 'Trainers & Domain Experts',
    badge: 'Content Authoring',
    desc: 'Spend less time grading, more time teaching. Build your course once, let the platform handle telemetry simulation grading and cohort analytics.',
    highlights: [
      'Multi-format lecture & simulation builder',
      'Real-time student cohort performance analytics',
      'Automated assessment generation & scoring',
    ],
    border: 'border-amber-500/30 hover:border-amber-400',
    bg: 'bg-[#081022]/90',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30',
    badgeColor: 'text-amber-300 bg-amber-950/80 border-amber-500/40',
  },
];

const upcomingCourses = [
  {
    title: 'Dual-Pol Doppler Radar & Severe Storm Nowcasting',
    status: 'Pre-Registration Open',
    statusColor: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40',
    dotColor: 'bg-emerald-400',
    date: 'Starts Oct 15, 2026',
    duration: '4 Weeks',
    format: 'Live Radar Labs',
    seatsLeft: '24 Seats Left',
    level: 'Advanced Specialist',
    department: 'IMD Radar Operations Division',
    badge: 'IMD-ROD',
    desc: "Go deep on polarimetric radar and real-time storm tracking, with live radar feeds you'll actually use in the field.",
    keySkills: ['Polarimetric Refl.', 'Hydrometeor Class.', 'Mesocyclone Detection'],
    icon: Radio,
    color: 'from-[#081226] via-[#060D1E] to-[#040814]',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    glow: 'from-cyan-500/20 via-sky-500/10 to-transparent',
    iconBg: 'bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-500/40 text-cyan-400',
    accentColor: 'text-cyan-400',
  },
  {
    title: 'AI & Deep Learning in Numerical Weather Prediction',
    status: 'Limited Cohort',
    statusColor: 'text-sky-300 bg-sky-950/80 border-sky-500/40',
    dotColor: 'bg-sky-400',
    date: 'Starts Nov 02, 2026',
    duration: '6 Weeks',
    format: 'HPC Supercomputing',
    seatsLeft: '18 Seats Left',
    level: 'Specialized Track',
    department: 'MoES High Performance Computing',
    badge: 'MoES-HPC',
    desc: 'Hands-on machine learning for weather models and ensemble forecasts, built for real computational pipelines.',
    keySkills: ['Graph Neural Nets', 'Ensemble Prediction', 'CUDA Acceleration'],
    icon: Cpu,
    color: 'from-[#081226] via-[#060D1E] to-[#040814]',
    border: 'border-sky-500/30 hover:border-sky-400',
    glow: 'from-sky-500/20 via-blue-500/10 to-transparent',
    iconBg: 'bg-gradient-to-br from-sky-950 to-indigo-950 border border-sky-500/40 text-sky-400',
    accentColor: 'text-sky-400',
  },
  {
    title: 'Coastal Early Warning & Ocean Telemetry Protocol',
    status: 'Fast Filling',
    statusColor: 'text-amber-300 bg-amber-950/80 border-amber-500/40',
    dotColor: 'bg-amber-400',
    date: 'Starts Dec 01, 2026',
    duration: '3 Weeks',
    format: 'Field Buoy & In-Situ',
    seatsLeft: '12 Seats Left',
    level: 'Executive Protocol',
    department: 'INCOIS & IMD Cyclone Center',
    badge: 'INCOIS-MoES',
    desc: 'Master storm surge alerting and ocean buoy data workflows alongside joint INCOIS and IMD teams.',
    keySkills: ['Tsunami Sensor Array', 'Storm Surge Modeling', 'In-Situ Buoy QC'],
    icon: Satellite,
    color: 'from-[#081226] via-[#060D1E] to-[#040814]',
    border: 'border-amber-500/30 hover:border-amber-400',
    glow: 'from-amber-500/20 via-orange-500/10 to-transparent',
    iconBg: 'bg-gradient-to-br from-amber-950 to-orange-950 border border-amber-500/40 text-amber-400',
    accentColor: 'text-amber-400',
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
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    department: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const scrollToAbout = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('mission-section') || document.getElementById('sticky-features');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsContactOpen(false);
      toast.success('Thank you for reaching out! A ministry support representative will respond shortly.');
      setContactForm({ name: '', email: '', department: '', message: '' });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans relative selection:bg-cyan-500 selection:text-white overflow-x-hidden">
      {/* Background Starfield Particle Canvas */}
      <StarfieldCanvas />

      {/* Decorative subtle ambient atmospheric glow orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed bottom-10 left-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[150px] z-0" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Clean Transparent, Get Started in Middle, No Sign In)      */}
      {/* ========================================================================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#040814]/90 backdrop-blur-xl border-b border-cyan-500/20 py-3 shadow-2xl shadow-cyan-950/60'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 group cursor-pointer shrink-0">
            <img src="/logo.png" alt="Capacity Connect Logo" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold font-display tracking-tight leading-tight">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                {' '}
                Connect
              </span>
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              to="/courses"
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors drop-shadow-sm"
            >
              Courses
            </Link>
            <button
              type="button"
              onClick={scrollToAbout}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer drop-shadow-sm"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer drop-shadow-sm"
            >
              Contact
            </button>
            <Link
              to="/register"
              className="text-sm font-semibold text-cyan-300 hover:text-white transition-colors drop-shadow-sm"
            >
              Get Started
            </Link>
          </nav>

          {/* Right side spacer for balanced symmetrical centering */}
          <div className="hidden md:block w-36 shrink-0" />

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl transition-colors cursor-pointer text-white hover:text-cyan-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-cyan-500/20 bg-[#040814]/98 backdrop-blur-xl px-6 py-4 mt-3 space-y-3 shadow-2xl"
            >
              <Link
                to="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5"
              >
                Courses
              </Link>
              <button
                type="button"
                onClick={scrollToAbout}
                className="block w-full text-left text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5 cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsContactOpen(true);
                }}
                className="block w-full text-left text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5 cursor-pointer"
              >
                Contact
              </button>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-cyan-300 hover:text-white py-1.5"
              >
                Get Started
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (Apple SF Pro Display Typographic Hierarchy)              */}
      {/* ========================================================================= */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 md:pt-40 md:pb-32 bg-black">
        {/* Background Image: Spacecraft & Satellite in Earth Orbit with Cinematic Dark Contrast */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
          <img
            src="/home%20page/astronauts-flying-spaceship-explore-galactic-planets-generated-by-ai.jpg"
            alt="Spacecraft and satellite in Earth orbit"
            className="w-full h-full object-cover object-center brightness-[0.52] contrast-[1.15] saturate-[1.1] scale-[1.01]"
          />
        </div>

        {/* Hero Container: Center Aligned Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 w-full flex flex-col items-center justify-center text-center my-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="w-full flex flex-col items-center text-center justify-center max-w-4xl mx-auto"
          >
            {/* Tier 1: Eyebrow Tag Pill (Uppercase, letter-spaced, Ashoka Chakra Indian Emblem) */}
            <motion.div variants={fadeUp} className="mb-4 sm:mb-5 max-w-full flex justify-center">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1 rounded-full bg-white/10 border border-white/20 text-zinc-200 backdrop-blur-md text-[8.5px] min-[380px]:text-[9.5px] sm:text-xs font-semibold tracking-wide sm:tracking-wider uppercase shadow-sm whitespace-nowrap max-w-full">
                <IndianAshokaChakraIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-white" />
                <span className="truncate">Ministry of Earth Sciences, Government of India</span>
              </div>
            </motion.div>

            {/* Tier 2: Headline: SF Pro Display Bold (700) */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[80px] font-bold tracking-[-0.035em] leading-[1.04] text-white text-center select-none mb-3 sm:mb-4"
            >
              <span>Building India's Next Generation of</span>
              <br />
              <span className="bg-gradient-to-b from-white via-white/95 to-zinc-300 bg-clip-text text-transparent">
                Earth Scientists.
              </span>
            </motion.h1>

            {/* Tier 3: Subhead: SF Pro Display Medium (500) */}
            <motion.p
              variants={fadeUp}
              className="text-base sm:text-xl md:text-2xl lg:text-[25px] font-medium tracking-[-0.015em] leading-snug text-zinc-200 text-center max-w-3xl mx-auto mb-2.5 sm:mb-3 select-none"
            >
              Live satellite telemetry. Real forecasting simulations. Government-certified expertise.
            </motion.p>

            {/* Tier 4: Smaller / Lighter LMS Supporting Line */}
            <motion.p
              variants={fadeUp}
              className="text-xs sm:text-sm md:text-base text-zinc-400 font-normal leading-relaxed text-center max-w-2xl mx-auto tracking-[-0.01em]"
            >
              A digital learning platform for MoES and IMD field officers — courses, certifications, and simulations in one place.
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll-down Indicator (Bottom Center) */}
        <button
          onClick={scrollToFeatures}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-white/70 hover:text-white transition-colors group cursor-pointer"
          aria-label="Scroll to explore"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/70 group-hover:text-cyan-400 transition-colors">
            Scroll to explore
          </span>
          <div className="w-7 h-7 rounded-full border border-white/30 bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:border-white shadow-sm transition-all">
            <ChevronDown className="w-3.5 h-3.5 text-white animate-bounce" />
          </div>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 2. CORE PLATFORM ARCHITECTURE (Sticky Scroll Scrollytelling)              */}
      {/* ========================================================================= */}
      <StickyScrollFeatures />

      {/* ========================================================================= */}
      {/* 3. STATS OVERVIEW SECTION (200+ Courses, 5000+ Users, 94% Completion, etc) */}
      {/* ========================================================================= */}
      <section id="stats-section" className="relative py-20 bg-[#030712] border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className={`group relative bg-[#070E20]/90 border ${s.border} rounded-2xl p-6 text-center hover:scale-[1.02] shadow-xl shadow-cyan-950/40 transition-all duration-300 overflow-hidden`}
              >
                {/* Background gradient glow on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center mx-auto mb-4 ${s.iconColor} group-hover:scale-110 transition-transform duration-300 shadow-md`}
                  >
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-display text-white mb-1 tracking-tight">
                    <AnimatedCounter target={s.target} suffix={s.suffix} />
                  </div>
                  <div className="text-sm font-semibold text-slate-200 mb-1 tracking-[-0.01em]">{s.label}</div>
                  <div className="text-xs text-slate-400 font-mono">{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. "BUILT FOR EVERY ROLE" (Trainees, Trainers, Coordinators)              */}
      {/* ========================================================================= */}
      <section id="roles-section" className="relative py-24 bg-[#040814] border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4 shadow-lg shadow-cyan-950/50">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Role-Specific Workspaces
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-white tracking-[-0.02em] mb-4">
              Designed for Every Stakeholder
            </h2>
            <p className="text-slate-300 text-base sm:text-lg tracking-[-0.01em]">
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
                className={`group relative p-8 sm:p-10 rounded-3xl border ${r.border} ${r.bg} backdrop-blur-xl shadow-2xl shadow-cyan-950/60 hover:shadow-cyan-500/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden flex flex-col justify-between`}
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

                  <h3 className="text-2xl font-bold font-display text-white mb-3 tracking-[-0.015em]">
                    {r.title}
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 tracking-[-0.01em]">
                    {r.desc}
                  </p>

                  <div className="space-y-3 mb-8">
                    {r.highlights.map((h) => (
                      <div key={h} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200 tracking-[-0.005em]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-cyan-500/20 flex items-center justify-between relative z-10">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors tracking-[-0.01em]"
                  >
                    <span>Get Started in this Role</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <span className="text-xs font-mono text-slate-400">Fast-track Onboarding</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "3D LAYER SPLIT / EXPLODED VIEW" MISSION SECTION                        */}
      {/* ========================================================================= */}
      <MissionExplodedView id="mission-section" />

      {/* ========================================================================= */}
      {/* 6. FINAL CALL TO ACTION (CTA BAND)                                       */}
      {/* ========================================================================= */}
      <section className="relative py-28 bg-gradient-to-b from-[#040814] via-[#081226] to-[#030712] border-t border-cyan-500/20 overflow-hidden">
        {/* Orbital rings background visual */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-cyan-500/20 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-amber-500/15 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-amber-500/15 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-lg shadow-amber-950/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Join the Next Generation of Earth Scientists
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-white tracking-[-0.02em] leading-tight mb-6">
            Ready to Build Capacity for a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
              Changing Climate?
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 tracking-[-0.01em]">
            Join hundreds of field officers, meteorologists, and data analysts across India. Get started
            today with official government certification tracks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 px-10 text-base font-semibold bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 hover:opacity-95 text-white shadow-2xl shadow-cyan-500/25 rounded-xl tracking-[-0.01em]"
              >
                Join the Platform
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/courses" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/50 text-white rounded-xl shadow-none hover:border-cyan-400 transition-all duration-300 tracking-[-0.01em]"
              >
                Browse All Courses
                <Compass className="ml-2 w-4 h-4 text-cyan-400" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. UPCOMING COURSES & ANNOUNCEMENTS PREVIEW                               */}
      {/* ========================================================================= */}
      <section
        id="courses-preview"
        className="relative py-24 sm:py-32 bg-[#030712] border-t border-cyan-500/20 overflow-hidden font-['SF_Pro_Display',-apple-system,BlinkMacSystemFont,'Inter',sans-serif]"
      >
        {/* Ambient atmospheric backdrop glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-200 text-[11px] font-medium tracking-wide uppercase mb-3 sm:mb-4 shadow-sm backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upcoming Announcements</span>
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-[-0.025em] leading-[1.08] text-white">
                Specialized Earth Sciences Tracks.
              </h2>
              <p className="text-base sm:text-xl md:text-2xl font-normal text-slate-200 tracking-[-0.015em] leading-snug mt-2 sm:mt-3 max-w-2xl">
                Pre-register for next-generation cohorts and masterclasses.
              </p>
            </div>
            <Link to="/courses">
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white text-zinc-200 hover:text-black rounded-full shadow-sm transition-all duration-300 tracking-[-0.01em] group h-11 px-6 font-medium text-sm"
              >
                <span>View Complete Catalog</span>
                <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {upcomingCourses.map((c) => (
              <motion.div
                key={c.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b ${c.color} border ${c.border} backdrop-blur-xl flex flex-col justify-between group transition-all duration-300 shadow-xl shadow-black/70 hover:shadow-[0_0_30px_rgba(0,210,255,0.12)] hover:-translate-y-1 overflow-hidden`}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${c.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                />
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Top Header: Icon + Badge + Department */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                      <c.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 tracking-wider font-semibold">
                          {c.badge}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400 font-medium truncate">{c.level}</span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate mt-0.5">
                        {c.department}
                      </div>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors leading-snug tracking-[-0.02em] min-h-[52px] flex items-center">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed mb-4 tracking-[-0.01em] line-clamp-3">
                    {c.desc}
                  </p>

                  {/* Key Skills Tags */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {c.keySkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 group-hover:border-cyan-500/30 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer with Schedule Grid and Pre-Register CTA */}
                <div className="relative z-10 pt-3.5 border-t border-cyan-500/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-1">
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{c.date}</span>
                    </div>
                    <div className="text-slate-400">
                      <span>{c.duration}</span>
                    </div>
                  </div>

                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-cyan-950/70 hover:bg-gradient-to-r hover:from-cyan-500 hover:via-blue-600 hover:to-amber-500 border border-cyan-500/30 hover:border-transparent text-cyan-200 hover:text-white font-semibold text-xs tracking-wide transition-all duration-300 shadow-none hover:shadow-lg hover:shadow-cyan-500/20 group/btn"
                  >
                    <span>Pre-Register Cohort</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
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
      <section className="relative py-24 bg-[#040814] border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
              <Quote className="w-3.5 h-3.5 text-cyan-400" />
              Field Impact
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-[-0.02em] mb-4">
              Trusted by Meteorological Centres Across India
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <motion.div
                key={t.author}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-[#070E20]/90 border border-cyan-500/20 shadow-2xl shadow-cyan-950/60 hover:border-cyan-400/40 flex flex-col justify-between relative overflow-hidden transition-all duration-300"
              >
                <div className="text-cyan-400/30 mb-4">
                  <Quote className="w-8 h-8" />
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic tracking-[-0.01em]">&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-4 border-t border-cyan-500/20">
                  <div className="text-sm font-bold text-white tracking-[-0.01em]">{t.author}</div>
                  <div className="text-xs text-cyan-400 font-semibold">{t.role}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">{t.division}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. DEEP SPACE FOOTER                                                      */}
      {/* ========================================================================= */}
      <footer className="relative z-10 bg-[#02050E] border-t border-cyan-500/20 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 mb-2 group cursor-pointer">
              <img src="/logo.png" alt="Capacity Connect" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold font-display">
                <span className="text-white">Capacity</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
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

      {/* ========================================================================= */}
      {/* 10. GET IN TOUCH MODAL DIALOG                                             */}
      {/* ========================================================================= */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-[#081022] border border-cyan-500/30 shadow-2xl text-white p-6 sm:p-8">
          <DialogHeader className="text-left space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 text-cyan-300 text-xs font-semibold uppercase tracking-wider w-fit mb-1 border border-cyan-500/30">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Contact & Inquiries
            </div>
            <DialogTitle className="text-2xl font-bold font-display text-white tracking-tight">
              Get in Touch
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              Have questions about MoES certifications, Doppler radar training tracks, or institutional onboarding? Reach out to our team.
            </DialogDescription>
          </DialogHeader>

          {/* Quick contact info cards */}
          <div className="grid grid-cols-2 gap-3 my-1 text-xs">
            <div className="p-3 rounded-2xl bg-[#040816] border border-cyan-500/20 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Email Support</span>
                <span className="text-slate-400 text-[11px] block break-all">support@moes.gov.in</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-[#040816] border border-amber-500/20 flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Helpline</span>
                <span className="text-slate-400 text-[11px] block">+91 11 24669500</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-3.5 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name" className="text-xs font-semibold text-slate-200">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="contact-name"
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="bg-[#040816] border-slate-700 text-white placeholder:text-slate-500 text-sm rounded-xl focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs font-semibold text-slate-200">
                Work / Official Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                required
                placeholder="name@imd.gov.in"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="bg-[#040816] border-slate-700 text-white placeholder:text-slate-500 text-sm rounded-xl focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-dept" className="text-xs font-semibold text-slate-200">
                Department / Organization (Optional)
              </Label>
              <Input
                id="contact-dept"
                placeholder="e.g. IMD Radar Operations, RMC Chennai"
                value={contactForm.department}
                onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                className="bg-[#040816] border-slate-700 text-white placeholder:text-slate-500 text-sm rounded-xl focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-msg" className="text-xs font-semibold text-slate-200">
                Message / Inquiry <span className="text-red-400">*</span>
              </Label>
              <textarea
                id="contact-msg"
                required
                rows={3}
                placeholder="How can we help your division?"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full bg-[#040816] border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Message...
                </>
              ) : (
                <>
                  Send Message
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
