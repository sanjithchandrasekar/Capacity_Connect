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
    glow: 'from-purple-500/10 to-purple-500/0',
    border: 'border-purple-200 hover:border-purple-300',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50 border border-purple-200',
  },
  {
    label: 'Active Users',
    target: 5000,
    suffix: '+',
    icon: Users,
    desc: 'Real scientists, real officers',
    glow: 'from-pink-500/10 to-pink-500/0',
    border: 'border-pink-200 hover:border-pink-300',
    iconColor: 'text-pink-600',
    iconBg: 'bg-pink-50 border border-pink-200',
  },
  {
    label: 'Completion Rate',
    target: 94,
    suffix: '%',
    icon: BarChart3,
    desc: 'Learners who actually finish',
    glow: 'from-orange-500/10 to-orange-500/0',
    border: 'border-orange-200 hover:border-orange-300',
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-50 border border-orange-200',
  },
  {
    label: 'Certificates Issued',
    target: 12000,
    suffix: '+',
    icon: Star,
    desc: 'Credentials that hold up',
    glow: 'from-cyan-500/10 to-cyan-500/0',
    border: 'border-cyan-200 hover:border-cyan-300',
    iconColor: 'text-cyan-600',
    iconBg: 'bg-cyan-50 border border-cyan-200',
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
    border: 'border-purple-200 hover:border-purple-400',
    bg: 'bg-white',
    iconBg: 'bg-gradient-to-br from-purple-600 to-indigo-600 shadow-md shadow-purple-600/25',
    badgeColor: 'text-purple-800 bg-purple-50 border-purple-200',
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
    border: 'border-pink-200 hover:border-pink-400',
    bg: 'bg-white',
    iconBg: 'bg-gradient-to-br from-pink-600 to-rose-600 shadow-md shadow-pink-600/25',
    badgeColor: 'text-pink-800 bg-pink-50 border-pink-200',
  },
];

const upcomingCourses = [
  {
    title: 'Dual-Pol Doppler Radar & Severe Storm Nowcasting',
    status: 'Pre-Registration Open',
    statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotColor: 'bg-emerald-500',
    date: 'Starts Oct 15, 2026',
    duration: '4 Weeks • Live Radar Labs',
    level: 'Advanced Specialist',
    department: 'IMD Radar Operations Division',
    desc: "Go deep on polarimetric radar and real-time storm tracking, with live radar feeds you'll actually use in the field.",
    icon: Radio,
    color: 'from-purple-50/80 via-white to-purple-50/40',
    border: 'border-purple-200 hover:border-purple-400',
    glow: 'from-purple-500/10 to-transparent',
    iconBg: 'bg-purple-100/90 border border-purple-200 text-purple-700',
  },
  {
    title: 'AI & Deep Learning in Numerical Weather Prediction',
    status: 'Limited 60 Seats',
    statusColor: 'text-pink-700 bg-pink-50 border-pink-200',
    dotColor: 'bg-pink-500',
    date: 'Starts Nov 02, 2026',
    duration: '6 Weeks • Hybrid Cohort',
    level: 'Specialized Track',
    department: 'MoES High Performance Computing',
    desc: 'Hands-on machine learning for weather models and ensemble forecasts, built for real computational pipelines.',
    icon: Cpu,
    color: 'from-pink-50/80 via-white to-pink-50/40',
    border: 'border-pink-200 hover:border-pink-400',
    glow: 'from-pink-500/10 to-transparent',
    iconBg: 'bg-pink-100/90 border border-pink-200 text-pink-700',
  },
  {
    title: 'Coastal Early Warning & Ocean Telemetry Protocol',
    status: 'Announcing Soon',
    statusColor: 'text-amber-800 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
    date: 'Starts Dec 01, 2026',
    duration: '3 Weeks • Field & Web',
    level: 'Executive Protocol',
    department: 'INCOIS & IMD Cyclone Center',
    desc: 'Master storm surge alerting and ocean buoy data workflows alongside joint INCOIS and IMD teams.',
    icon: Satellite,
    color: 'from-orange-50/80 via-white to-orange-50/40',
    border: 'border-orange-200 hover:border-orange-400',
    glow: 'from-orange-500/10 to-transparent',
    iconBg: 'bg-orange-100/90 border border-orange-200 text-orange-700',
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
    <div className="min-h-screen bg-[#FAF9F6] text-midnight font-sans relative selection:bg-pink-500 selection:text-white overflow-x-hidden">
      {/* Background Starfield Particle Canvas */}
      <StarfieldCanvas />

      {/* Decorative subtle ambient glow orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-purple-400/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-pink-400/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed bottom-10 left-1/4 w-[500px] h-[500px] rounded-full bg-orange-400/10 blur-[150px] z-0" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Clean Transparent, Get Started in Middle, No Sign In)      */}
      {/* ========================================================================= */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#FAF9F6]/85 backdrop-blur-xl border-b border-purple-100/60 py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 group cursor-pointer shrink-0">
            <img src="/logo.png" alt="Capacity Connect Logo" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold font-display tracking-tight leading-tight">
              <span className={scrolled ? 'text-purple-900' : 'text-white'}>Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
                {' '}
                Connect
              </span>
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              to="/courses"
              className={`text-sm font-semibold transition-colors ${
                scrolled ? 'text-midnight/80 hover:text-purple-700' : 'text-white/90 hover:text-white drop-shadow-sm'
              }`}
            >
              Courses
            </Link>
            <button
              type="button"
              onClick={scrollToAbout}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                scrolled ? 'text-midnight/80 hover:text-purple-700' : 'text-white/90 hover:text-white drop-shadow-sm'
              }`}
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className={`text-sm font-semibold transition-colors cursor-pointer ${
                scrolled ? 'text-midnight/80 hover:text-purple-700' : 'text-white/90 hover:text-white drop-shadow-sm'
              }`}
            >
              Contact
            </button>
            <Link
              to="/register"
              className={`text-sm font-semibold transition-colors ${
                scrolled ? 'text-midnight/80 hover:text-purple-700' : 'text-white/90 hover:text-white drop-shadow-sm'
              }`}
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
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                scrolled ? 'text-midnight/80 hover:text-purple-700' : 'text-white hover:text-pink-300'
              }`}
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
              className="md:hidden border-t border-purple-100 bg-[#FAF9F6]/95 backdrop-blur-xl px-6 py-4 mt-3 space-y-3 shadow-xl"
            >
              <Link
                to="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-midnight/80 hover:text-purple-700 py-1.5"
              >
                Courses
              </Link>
              <button
                type="button"
                onClick={scrollToAbout}
                className="block w-full text-left text-sm font-semibold text-midnight/80 hover:text-purple-700 py-1.5 cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsContactOpen(true);
                }}
                className="block w-full text-left text-sm font-semibold text-midnight/80 hover:text-purple-700 py-1.5 cursor-pointer"
              >
                Contact
              </button>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-midnight/80 hover:text-purple-700 py-1.5"
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
            <motion.div variants={fadeUp} className="mb-4 sm:mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-200 backdrop-blur-md text-[10px] sm:text-xs font-semibold tracking-wider uppercase shadow-sm">
                <IndianAshokaChakraIcon className="w-3.5 h-3.5 shrink-0" />
                Ministry of Earth Sciences, Government of India
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
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/70 group-hover:text-pink-400 transition-colors">
            Scroll to explore
          </span>
          <div className="w-7 h-7 rounded-full border border-white/30 bg-black/40 backdrop-blur-md flex items-center justify-center group-hover:border-white shadow-sm transition-all">
            <ChevronDown className="w-3.5 h-3.5 text-white animate-bounce" />
          </div>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 3. STICKY SCROLL SCROLLYTELLING SECTION                                    */}
      {/* ========================================================================= */}
      <StickyScrollFeatures />

      {/* ========================================================================= */}
      {/* 4. FINAL CALL TO ACTION (CTA BAND)                                       */}
      {/* ========================================================================= */}
      <section className="relative py-28 bg-gradient-to-b from-[#FAF9F6] via-purple-50/40 to-white border-t border-purple-100 overflow-hidden">
        {/* Orbital rings background visual */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-purple-300/30 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-pink-300/20 animate-orbit-slow" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-orange-400/10 blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Join the Next Generation of Earth Scientists
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display text-midnight tracking-[-0.02em] leading-tight mb-6">
            Ready to Build Capacity for a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500">
              Changing Climate?
            </span>
          </h2>

          <p className="text-midnight/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 tracking-[-0.01em]">
            Join hundreds of field officers, meteorologists, and data analysts across India. Get started
            today with official government certification tracks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-14 px-10 text-base font-semibold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-2xl shadow-pink-500/25 rounded-xl tracking-[-0.01em]"
              >
                Join the Platform
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link to="/courses" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-14 px-8 text-base font-semibold border-purple-300/80 bg-transparent hover:bg-purple-100/50 text-midnight rounded-xl shadow-none hover:border-purple-500 transition-all duration-300 tracking-[-0.01em]"
              >
                Browse All Courses
                <Compass className="ml-2 w-4 h-4 text-pink-600" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. "BUILT FOR EVERY ROLE" (Trainees, Trainers, Coordinators)              */}
      {/* ========================================================================= */}
      <section id="roles-section" className="relative py-24 bg-white border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-pink-600" />
              Role-Specific Workspaces
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-midnight tracking-[-0.02em] mb-4">
              Designed for Every Stakeholder
            </h2>
            <p className="text-midnight/60 text-base sm:text-lg tracking-[-0.01em]">
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
                className={`group relative p-8 sm:p-10 rounded-3xl border ${r.border} ${r.bg} backdrop-blur-xl shadow-lg shadow-purple-900/5 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden flex flex-col justify-between`}
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

                  <h3 className="text-2xl font-bold font-display text-midnight mb-3 tracking-[-0.015em]">
                    {r.title}
                  </h3>
                  <p className="text-midnight/70 text-sm sm:text-base leading-relaxed mb-6 tracking-[-0.01em]">
                    {r.desc}
                  </p>

                  <div className="space-y-3 mb-8">
                    {r.highlights.map((h) => (
                      <div key={h} className="flex items-start gap-3 text-xs sm:text-sm text-midnight/80 tracking-[-0.005em]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-purple-100 flex items-center justify-between relative z-10">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors tracking-[-0.01em]"
                  >
                    <span>Get Started in this Role</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <span className="text-xs font-mono text-midnight/40">Fast-track Onboarding</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MISSION / IMPACT STATEMENT BAND & GLOWING STATS                        */}
      {/* ========================================================================= */}
      <section id="mission-section" className="relative py-24 bg-[#FAF9F6] border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-6">
          {/* Mission statement */}
          <div className="relative rounded-3xl p-10 md:p-14 bg-white border border-purple-100/80 shadow-xl shadow-purple-900/5 mb-16 overflow-hidden">
            <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-80 h-80 bg-orange-400/10 rounded-full blur-3xl" />

            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-xs font-mono uppercase tracking-wider text-purple-800 mb-6">
                <Globe className="w-3.5 h-3.5 text-pink-600" />
                National Earth Sciences Mission
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-display text-midnight tracking-[-0.02em] leading-tight mb-6">
                Strengthening India&apos;s Meteorological Readiness for a Changing Climate
              </h2>
              <p className="text-midnight/70 text-base sm:text-lg leading-relaxed font-normal max-w-3xl mx-auto tracking-[-0.01em]">
                One platform, every skill IMD and MoES need &mdash; cyclone tracking, monsoon forecasting, seismology, ocean observation &mdash; built for the people doing the actual work.
              </p>
            </div>
          </div>

          {/* Glowing Stat Cards */}
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
                className={`group relative bg-white border ${s.border} rounded-2xl p-6 text-center hover:scale-[1.02] shadow-md shadow-purple-900/5 hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                {/* Background gradient glow on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${s.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center mx-auto mb-4 ${s.iconColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}
                  >
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-display text-midnight mb-1 tracking-tight">
                    <AnimatedCounter target={s.target} suffix={s.suffix} />
                  </div>
                  <div className="text-sm font-semibold text-midnight/90 mb-1 tracking-[-0.01em]">{s.label}</div>
                  <div className="text-xs text-midnight/50 font-mono">{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. UPCOMING COURSES & ANNOUNCEMENTS PREVIEW                               */}
      {/* ========================================================================= */}
      <section id="courses-preview" className="relative py-24 bg-white border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-pink-600 animate-pulse" />
                Upcoming Announcements
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-midnight tracking-[-0.02em]">
                Upcoming Specialized Earth Sciences Tracks
              </h2>
              <p className="text-midnight/60 text-sm sm:text-base max-w-2xl mt-3 tracking-[-0.01em]">
                Pre-register for next-generation meteorological cohorts, high-resolution radar masterclasses, and executive certification tracks.
              </p>
            </div>
            <Link to="/courses">
              <Button
                variant="outline"
                className="border-pink-200 bg-pink-50/60 text-pink-700 hover:text-pink-800 hover:bg-pink-100 rounded-xl shadow-sm tracking-[-0.01em]"
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
                className={`relative p-7 rounded-2xl bg-gradient-to-b ${c.color} border ${c.border} backdrop-blur-xl flex flex-col justify-between group transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden`}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${c.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                <div className="relative z-10">
                  {/* Icon & Department */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg} shadow-sm`}>
                      <c.icon className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-mono text-midnight/60 line-clamp-1">
                      {c.department}
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-xl font-bold font-display text-midnight mb-3 group-hover:text-purple-700 transition-colors leading-snug tracking-[-0.015em]">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-midnight/70 leading-relaxed mb-6 tracking-[-0.01em]">
                    {c.desc}
                  </p>
                </div>

                {/* Card Footer with schedule and action */}
                <div className="relative z-10 pt-4 border-t border-purple-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-mono text-midnight/70">
                    <span className="flex items-center gap-1.5 text-midnight/80 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-pink-600" />
                      {c.date}
                    </span>
                    <span className="text-midnight/50 text-[11px]">{c.duration}</span>
                  </div>

                  <Link
                    to="/register"
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-50 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:via-pink-500 group-hover:to-orange-500 border border-purple-200 group-hover:border-transparent text-purple-900 group-hover:text-white font-semibold text-xs tracking-wide transition-all duration-300 shadow-none group-hover:shadow-md group-hover:shadow-pink-500/25"
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
      <section className="relative py-24 bg-[#FAF9F6] border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/90 border border-purple-200 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
              <Quote className="w-3.5 h-3.5 text-pink-600" />
              Field Impact
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-midnight tracking-[-0.02em] mb-4">
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
                className="p-8 rounded-3xl bg-white border border-purple-100 shadow-md shadow-purple-900/5 hover:shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-300"
              >
                <div className="text-pink-500/30 mb-4">
                  <Quote className="w-8 h-8" />
                </div>
                <p className="text-midnight/75 text-sm leading-relaxed mb-6 italic tracking-[-0.01em]">&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-4 border-t border-purple-100">
                  <div className="text-sm font-bold text-midnight tracking-[-0.01em]">{t.author}</div>
                  <div className="text-xs text-purple-700 font-semibold">{t.role}</div>
                  <div className="text-[11px] font-mono text-midnight/50 mt-1">{t.division}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. LIGHT THEME FOOTER                                                     */}
      {/* ========================================================================= */}
      <footer className="relative z-10 bg-white border-t border-purple-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 mb-2 group cursor-pointer">
              <img src="/logo.png" alt="Capacity Connect" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
              <span className="text-xl font-bold font-display">
                <span className="text-purple-900">Capacity</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
                  {' '}
                  Connect
                </span>
              </span>
            </Link>
            <p className="text-sm text-midnight/60 max-w-xl">
              Digital Capacity Building & Learning Portal developed for the Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD).
            </p>
          </div>

          <div className="text-xs font-mono text-midnight/40 text-center md:text-right shrink-0">
            © 2026 Capacity Connect • All rights reserved.
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 10. GET IN TOUCH MODAL DIALOG                                             */}
      {/* ========================================================================= */}
      <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white border border-purple-100 shadow-2xl p-6 sm:p-8">
          <DialogHeader className="text-left space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold uppercase tracking-wider w-fit mb-1">
              <Mail className="w-3.5 h-3.5 text-pink-600" />
              Contact & Inquiries
            </div>
            <DialogTitle className="text-2xl font-bold font-display text-midnight tracking-tight">
              Get in Touch
            </DialogTitle>
            <DialogDescription className="text-sm text-midnight/65">
              Have questions about MoES certifications, Doppler radar training tracks, or institutional onboarding? Reach out to our team.
            </DialogDescription>
          </DialogHeader>

          {/* Quick contact info cards */}
          <div className="grid grid-cols-2 gap-3 my-1 text-xs">
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-midnight block">Email Support</span>
                <span className="text-midnight/60 text-[11px] block break-all">support@moes.gov.in</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-100 flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-midnight block">Helpline</span>
                <span className="text-midnight/60 text-[11px] block">+91 11 24669500</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-3.5 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name" className="text-xs font-semibold text-midnight/80">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact-name"
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="bg-purple-50/30 border-purple-200 text-midnight text-sm rounded-xl focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs font-semibold text-midnight/80">
                Work / Official Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                required
                placeholder="name@imd.gov.in"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="bg-purple-50/30 border-purple-200 text-midnight text-sm rounded-xl focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-dept" className="text-xs font-semibold text-midnight/80">
                Department / Organization (Optional)
              </Label>
              <Input
                id="contact-dept"
                placeholder="e.g. IMD Radar Operations, RMC Chennai"
                value={contactForm.department}
                onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                className="bg-purple-50/30 border-purple-200 text-midnight text-sm rounded-xl focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-msg" className="text-xs font-semibold text-midnight/80">
                Message / Inquiry <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="contact-msg"
                required
                rows={3}
                placeholder="How can we help your division?"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full bg-purple-50/30 border border-purple-200 rounded-xl p-3 text-sm text-midnight placeholder:text-midnight/40 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-pink-500/20 hover:opacity-95"
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
