import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, Shield, Award, Users, BookOpen, CheckCircle2,
  ArrowRight, Globe, Sparkles, Building, Landmark, Target,
  Eye, GraduationCap, Server, Layers, BarChart3, WifiOff,
  Cpu, Check, ChevronRight, LogIn, Menu, X, Mail, Phone
} from 'lucide-react'
import { StarfieldCanvas } from '@/components/space/StarfieldCanvas'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function AboutPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#030712] font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden">
      {/* Background Starfield Particle Canvas */}
      <StarfieldCanvas />

      {/* Decorative ambient atmospheric glow orbs */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[150px] z-0" />
      <div className="pointer-events-none fixed top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] z-0" />

      {/* 1. Header Navigation Bar (Dark Theme with Center Links) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#040814]/95 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl shadow-cyan-950/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer shrink-0">
            <img src="/logo.png" alt="Capacity Connect Logo" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
            <span className="text-lg font-bold font-display tracking-tight leading-tight">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                {' '}Connect
              </span>
            </span>
          </Link>

          {/* Center Navigation Links (Desktop: Courses, About, Contact, Get Started) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/courses" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
              Courses
            </Link>
            <span className="text-sm font-bold text-cyan-400 border-b-2 border-cyan-400 pb-0.5 cursor-default">
              About
            </span>
            <Link to="/contact" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
              Contact
            </Link>
            <Link to="/register" className="text-sm font-semibold text-cyan-300 hover:text-white transition-colors">
              Get Started
            </Link>
          </nav>

          {/* Desktop Right Placeholder (Empty for clean balanced alignment) */}
          <div className="hidden md:block w-32" />

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-white hover:text-cyan-300 transition-colors cursor-pointer"
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
              className="md:hidden border-t border-cyan-500/20 bg-[#040814]/98 backdrop-blur-xl px-6 py-4 space-y-3 shadow-2xl"
            >
              <Link to="/courses" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5">
                Courses
              </Link>
              <span className="block text-sm font-bold text-cyan-400 py-1.5">
                About
              </span>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5">
                Contact
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-cyan-300 hover:text-white py-1.5">
                Get Started
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section (Clean Crisp Light Theme) */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 text-center px-6 overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#E2E8F0] text-slate-900 border-b border-slate-200/80">
        {/* Subtle decorative radial gradients */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/60 via-transparent to-transparent opacity-70" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              Smart India Hackathon • Problem Statement SIH26075
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              About the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700">Learning Management System</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-3xl mx-auto font-normal">
              A dedicated digital training and institutional capacity-building platform developed for the{' '}
              <span className="text-cyan-800 font-bold">Ministry of Earth Sciences (MoES)</span>, Government of India, and its constituent premier scientific units.
            </p>
          </motion.div>

          {/* Institutional Badges Banner (Light Themed Cards) */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-4xl mx-auto"
          >
            {[
              { code: 'MoES', label: 'Ministry of Earth Sciences', sub: 'Govt. of India' },
              { code: 'IMD', label: 'India Meteorological Dept.', sub: 'Est. 1875' },
              { code: 'IITM', label: 'Tropical Meteorology', sub: 'Pune Research Hub' },
              { code: 'NCMRWF', label: 'Medium Range Forecasting', sub: 'Noida Center' },
            ].map((inst) => (
              <motion.div
                key={inst.code}
                variants={fadeUp}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-md hover:border-cyan-400 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 text-center"
              >
                <span className="text-cyan-600 font-black text-lg block tracking-wider">{inst.code}</span>
                <span className="text-slate-800 text-xs font-bold block truncate mt-0.5">{inst.label}</span>
                <span className="text-[10px] text-slate-500 font-medium">{inst.sub}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3. Featured Institutional Landmarks (Visual Heritage Gallery - Dark BG with Light Themed Cards) */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-[#030712] via-[#07132a] to-[#040814] text-white relative z-10 border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 flex items-center justify-center gap-2">
              <Landmark className="w-6 h-6 text-cyan-400" />
              Institutions of Scientific Excellence
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Anchored at the forefront of atmospheric, oceanographic, seismological, and climate sciences in India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Card 1: MoES Headquarters (Light Themed Card) */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-2xl shadow-cyan-950/80 hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all duration-300 flex flex-col"
            >
              <div className="h-72 sm:h-80 w-full overflow-hidden relative bg-slate-100">
                <img
                  src="/MOES.jpg"
                  alt="Ministry of Earth Sciences (MoES) Headquarters"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-cyan-800 text-xs font-extrabold uppercase tracking-wide shadow-md">
                    Prithvi Bhavan • New Delhi
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7 bg-white text-slate-900 border-t border-slate-100 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-cyan-700 transition-colors">
                    Ministry of Earth Sciences (MoES)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Reorganized in 2006 to bring together premier scientific institutions under an integrated mandate spanning atmospheric science, ocean technology, polar exploration, and seismological research for socio-economic development.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Image Card 2: IMD Iconic Campus (Light Themed Card) */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-2xl shadow-cyan-950/80 hover:border-amber-400 hover:shadow-amber-500/20 transition-all duration-300 flex flex-col"
            >
              <div className="h-72 sm:h-80 w-full overflow-hidden relative bg-slate-100">
                <img
                  src="/IMD.jpg"
                  alt="India Meteorological Department (IMD) Headquarters"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 text-amber-800 text-xs font-extrabold uppercase tracking-wide shadow-md">
                    Mausam Bhavan • Est. 1875
                  </span>
                </div>
              </div>
              <div className="p-6 sm:p-7 bg-white text-slate-900 border-t border-slate-100 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-amber-700 transition-colors">
                    India Meteorological Department (IMD)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    Tracing its lineage back to 1875, IMD manages one of the world's most extensive meteorological and Doppler radar networks, delivering 24/7 weather forecasting, cyclone warnings, and climate monitoring.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Balanced Light Content Section: Genesis, Background & Vision/Mission */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-[#f8fafc] via-white to-[#f1f5f9] text-slate-900 relative z-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left Column: Background & The Challenge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-7 space-y-6"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-extrabold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-cyan-700" /> Genesis & Background
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Bridging the Gap from Scattered Resources to Unified Learning
                </h2>
              </div>

              <div className="text-slate-700 space-y-4 text-sm sm:text-base leading-relaxed">
                <p>
                  The Ministry of Earth Sciences depends on a highly specialized, continuously evolving workforce of scientists, forecasters, radar engineers, and observation officers. With its mandate spanning atmospheric sciences, ocean science and technology, seismology, and polar research, standardizing operational competencies across diverse field stations is a genuine operational imperative.
                </p>
                <p>
                  Historically, training for MoES personnel — from field-level observers at remote meteorological stations to high-performance computing research scientists — relied on fragmented channels: in-person workshops, disconnected PDFs, circulars, and institutional knowledge passed down informally.
                </p>
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-sm font-semibold leading-relaxed">
                  This LMS was conceived under Smart India Hackathon problem statement SIH26075 to close that gap — providing a unified, centralized, and measurable digital learning environment accessible anytime, anywhere.
                </div>
              </div>
            </motion.div>

            {/* Right Column: Vision & Mission Cards */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:col-span-5 space-y-6"
            >
              {/* Vision Card */}
              <motion.div variants={fadeUp} className="p-7 rounded-3xl bg-gradient-to-br from-[#040814] to-[#07132a] text-white border border-cyan-500/30 shadow-xl shadow-slate-200/80">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-sm">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Our Vision</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  To build a unified knowledge and training ecosystem that mirrors MoES's own vision — <em>"to excel as a knowledge and technology enterprise in the earth system science realm towards socio-economic benefit of the society"</em> — ensuring every scientist, officer, and technical staff member has structured access to the training they need.
                </p>
              </motion.div>

              {/* Mission Pillars Card */}
              <motion.div variants={fadeUp} className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Our Mission</h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <span>Delivers structured courses on meteorology, climatology, oceanography, and seismology.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <span>Tracks learner progress, certifications, and skill development across MoES units.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <span>Reduces dependence on ad hoc training by enabling self-paced & blended learning.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                    <span>Gives ministry heads instant visibility into compliance and institutional skill gaps.</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. "Who It's For" Stakeholder Grid */}
      <section className="py-20 sm:py-28 bg-[#040814] text-white border-t border-cyan-500/20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Target Cadres</span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 mb-3">
              Who Is Capacity Connect For?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Configured specifically to support roles and operational workflows across every tier of the Ministry.
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                title: 'New Recruits & Trainees',
                badge: 'Onboarding',
                icon: GraduationCap,
                color: 'from-cyan-500 to-blue-600',
                border: 'border-cyan-500/30',
                desc: 'Structured onboarding pathways for new personnel joining IMD, IITM, NCMRWF, and other MoES units to build domain fundamentals quickly.',
              },
              {
                title: 'Field Officers & Observers',
                badge: 'Field Operations',
                icon: Shield,
                color: 'from-blue-500 to-indigo-600',
                border: 'border-blue-500/30',
                desc: 'Refreshers on weather instrumentation, Doppler radar operations, surface observation protocols, and automated data reporting standards.',
              },
              {
                title: 'Scientists & Forecasters',
                badge: 'Research & NWP',
                icon: Cpu,
                color: 'from-teal-500 to-emerald-600',
                border: 'border-teal-500/30',
                desc: 'Upskilling on numerical weather prediction models, satellite meteorology, cyclone analysis, and seasonal forecasting techniques.',
              },
              {
                title: 'Department Administrators',
                badge: 'Compliance',
                icon: BarChart3,
                color: 'from-amber-500 to-orange-600',
                border: 'border-amber-500/30',
                desc: 'Visibility to assign mandatory modules, monitor completion metrics, verify certifications, and address organizational skill gaps.',
              },
            ].map((cadre) => (
              <motion.div
                key={cadre.title}
                variants={fadeUp}
                className={`p-6 sm:p-7 rounded-3xl bg-slate-900/90 border ${cadre.border} shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cadre.color} flex items-center justify-center text-white shadow-md`}>
                      <cadre.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 text-cyan-300 border border-white/15">
                      {cadre.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{cadre.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{cadre.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. Key Platform Features Grid (Balanced Light Backdrop) */}
      <section className="py-20 sm:py-28 bg-[#f8fafc] text-slate-900 border-t border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Platform Features</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1 mb-3">
              Key Platform Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Engineered to meet the mission-critical training requirements of scientific organizations.
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                title: 'Role-Based Course Catalogs',
                icon: Layers,
                desc: 'Tailored course tracks aligned specifically to observers, radar technicians, scientific researchers, and administrative personnel.',
              },
              {
                title: 'Digital Certification & Badges',
                icon: Award,
                desc: 'Automated certificate issuance upon 100% curriculum completion and verified 80%+ quiz score achievement.',
              },
              {
                title: 'Multilingual Accessibility',
                icon: Globe,
                desc: 'English and Hindi interface support mirroring MoES national accessibility standards for government workforce portals.',
              },
              {
                title: 'Offline-Resilient Architecture',
                icon: WifiOff,
                desc: 'Optimized performance for remote coastal observatories, island radars, and high-altitude weather stations with limited connectivity.',
              },
              {
                title: 'Department-Wide Dashboards',
                icon: BarChart3,
                desc: 'Real-time analytics for department heads to inspect completion percentages, test scores, and compliance across ministries.',
              },
              {
                title: 'Integration-Ready Design',
                icon: Server,
                desc: 'Modular schema ready for future connection with HRMS service records and MoES’s existing digital infrastructure.',
              },
            ].map((feat) => (
              <motion.div
                key={feat.title}
                variants={fadeUp}
                className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 flex items-start gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
                  <feat.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1.5">{feat.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 7. Alignment with MoES Broader Goals & Call to Action Banner */}
      <section className="py-20 sm:py-28 bg-[#02050E] text-white border-t border-cyan-500/20 relative z-10">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-[#040814] to-[#07132a] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">National Mandate</span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Empowering India's Scientific Workforce for Tomorrow
              </h2>
              <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
                Directly supporting MoES's core function to <em>"develop skilled and trained manpower in Earth Sciences with the support of academic institutions in the country and abroad"</em> by making training scalable, measurable, and consistent across every national unit.
              </p>

              <div className="pt-6 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/courses"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Course Catalog</span>
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Register for Training</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Deep Space Clean Footer */}
      <footer className="border-t border-slate-800 bg-[#02050E] py-8 text-xs text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Capacity Connect • Ministry of Earth Sciences (MoES), Govt. of India.</p>
          <div className="flex items-center gap-6">
            <Link to="/courses" className="hover:text-cyan-400 transition-colors">Courses</Link>
            <Link to="/about" className="hover:text-cyan-400 font-bold text-cyan-400 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-cyan-400 transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-cyan-400 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-cyan-400 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
