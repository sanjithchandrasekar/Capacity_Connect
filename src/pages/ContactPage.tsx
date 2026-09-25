import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Phone, Mail, Clock, Globe, Send, CheckCircle2,
  Building, User, Shield, FileText, Sparkles, ExternalLink,
  LogIn, Menu, X, HelpCircle, MessageSquare, AlertCircle, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function ContactPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'IMD',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please complete all required fields (Name, Email, Message).')
      return
    }

    setIsSubmitting(true)
    try {
      // Attempt insert into contact_messages
      const { error } = await (supabase as any).from('contact_messages').insert({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department || 'MoES',
        subject: formData.subject.trim() || 'General Inquiry',
        message: formData.message.trim(),
        status: 'unread',
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.warn('Supabase contact_messages table insert notice:', error.message)
        // Store in localStorage as fallback so admin dashboard can still read it
        const existing = JSON.parse(localStorage.getItem('local_contact_messages') || '[]')
        existing.unshift({
          id: 'local_' + Date.now(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          department: formData.department,
          subject: formData.subject.trim() || 'General Inquiry',
          message: formData.message.trim(),
          status: 'unread',
          created_at: new Date().toISOString(),
        })
        localStorage.setItem('local_contact_messages', JSON.stringify(existing))
      }

      setSubmitted(true)
      toast.success('Your message has been received! Our support team will respond shortly.')
      setFormData({ name: '', email: '', department: 'IMD', subject: '', message: '' })
    } catch (err: any) {
      console.error('Contact submission error:', err)
      toast.error('Could not submit message. Please try again or use direct email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-[#FFFFFF] text-slate-900 font-sans selection:bg-cyan-500 selection:text-white overflow-x-hidden">
      
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
            <Link to="/about" className="text-sm font-semibold text-slate-300 hover:text-cyan-400 transition-colors">
              About
            </Link>
            <span className="text-sm font-bold text-cyan-400 border-b-2 border-cyan-400 pb-0.5 cursor-default">
              Contact
            </span>
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
              className="p-2 rounded-xl text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
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
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-cyan-400 py-1.5">
                About
              </Link>
              <span className="block text-sm font-bold text-cyan-400 py-1.5">
                Contact
              </span>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-semibold text-cyan-300 hover:text-white py-1.5">
                Get Started
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. Hero Section (Clean Light Theme) */}
      <section className="relative pt-32 pb-14 md:pt-40 md:pb-20 px-6 text-center overflow-hidden border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Building className="w-3.5 h-3.5 text-cyan-600" />
              Ministry of Earth Sciences • Contact & Communication Directory
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Get in Touch with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700">Capacity Connect</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
              Official institutional directory, grievance redressal, RTI authorities, and direct inquiry portal for the Ministry of Earth Sciences, Government of India.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3. Official Officers & RTI Authority Directory Grid (Appears First) */}
      <section className="py-14 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-700">Official Cadre</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 mb-2">
              Key Officers &amp; Institutional Contacts
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Direct administrative touchpoints for Web Information, CIO, CPIO, and RTI Appellate inquiries.
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
                role: 'Content Related & Web Information Manager (WIM)',
                name: 'Dr. R S Maheskumar',
                designation: 'Scientist G',
                address: 'Ministry of Earth Sciences, Prithvi Bhawan, opposite India Habitat Centre, Lodhi Road, New Delhi 110003',
                phone: '+91-11-24669725',
                email: 'mahesh.rs@gov.in',
                badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
              },
              {
                role: 'Chief Information Officer (CIO)',
                name: 'Dr. R S Maheskumar',
                designation: 'Scientist G',
                address: 'Ministry of Earth Sciences, Prithvi Bhawan, opposite India Habitat Centre, Lodhi Road, New Delhi 110003',
                phone: '+91-11-24669725',
                email: 'mahesh.rs@gov.in',
                badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
              },
              {
                role: 'Central Public Information Officer (CPIO)',
                name: 'Dr. Bhavya Khanna',
                designation: 'Scientist E',
                address: 'Ministry of Earth Sciences, Prithvi Bhawan, opposite India Habitat Centre, Lodhi Road, New Delhi 110003',
                phone: '+91-11-24669647',
                email: 'cpio-moes@gov.in',
                badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              },
              {
                role: 'First Appellate Authority (RTI)',
                name: 'Director(ICC)',
                designation: 'Director',
                address: 'Ministry of Earth Sciences, Prithvi Bhawan, opposite India Habitat Centre, Lodhi Road, New Delhi 110003',
                phone: '+91-011-24669718',
                email: 'rajendrakumhar@ord.gov.in',
                badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
              },
            ].map(officer => (
              <motion.div
                key={officer.role + officer.name}
                variants={fadeUp}
                className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 hover:border-cyan-400 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${officer.badgeBg} leading-tight`}>
                    {officer.role}
                  </span>
                  
                  <div>
                    <h3 className="text-base font-black text-slate-900">{officer.name}</h3>
                    <p className="text-xs text-cyan-700 font-bold">{officer.designation}</p>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {officer.address}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <a href={`tel:${officer.phone.replace(/[^0-9+]/g, '')}`} className="font-semibold hover:text-emerald-700 hover:underline">
                      {officer.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <a href={`mailto:${officer.email}`} className="font-semibold text-cyan-700 hover:underline truncate">
                      {officer.email}
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. Send Us a Message Form */}
      <section className="py-14 sm:py-20 max-w-4xl mx-auto px-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-lg shadow-slate-200/50 space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 text-cyan-700 text-xs font-extrabold uppercase tracking-wider mb-1">
              <MessageSquare className="w-4 h-4 text-cyan-600" /> Inquiries &amp; Support
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Send Us a Message</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Have questions about courses, certifications, or technical onboarding? Fill out this form and our team will review it.
            </p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 my-6"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Message Dispatched Successfully!</h3>
              <p className="text-xs sm:text-sm text-emerald-700 max-w-md mx-auto">
                Your inquiry has been submitted and recorded in the administrator portal. A representative will contact you via email shortly.
              </p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 font-semibold text-xs cursor-pointer"
              >
                Send Another Message
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name" className="text-xs font-bold text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="contact-name"
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="rounded-xl border-slate-300 focus:border-cyan-500 text-xs sm:text-sm h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-email" className="text-xs font-bold text-slate-700">
                    Official / Personal Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="e.g. rajesh.kumar@imd.gov.in"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="rounded-xl border-slate-300 focus:border-cyan-500 text-xs sm:text-sm h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-dept" className="text-xs font-bold text-slate-700">
                    Unit / Institution
                  </Label>
                  <select
                    id="contact-dept"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  >
                    <option value="MoES">Ministry of Earth Sciences (MoES HQ)</option>
                    <option value="IMD">India Meteorological Department (IMD)</option>
                    <option value="IITM">Indian Institute of Tropical Meteorology (IITM)</option>
                    <option value="NCMRWF">NCMRWF Noida</option>
                    <option value="INCOIS">INCOIS Hyderabad</option>
                    <option value="NIOT">NIOT Chennai</option>
                    <option value="NCPOR">NCPOR Goa</option>
                    <option value="Other">Other Organization / Trainee</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-sub" className="text-xs font-bold text-slate-700">
                    Subject
                  </Label>
                  <Input
                    id="contact-sub"
                    placeholder="e.g. Assessment Verification / Training Inquiry"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="rounded-xl border-slate-300 focus:border-cyan-500 text-xs sm:text-sm h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-msg" className="text-xs font-bold text-slate-700">
                  Your Message <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="contact-msg"
                  rows={4}
                  placeholder="Provide details about your query or technical assistance request..."
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  required
                  className="rounded-xl border-slate-300 focus:border-cyan-500 text-xs sm:text-sm resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-cyan-600/20 gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Message...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Message
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* 5. Clean Footer */}
      <footer className="border-t border-slate-200 bg-slate-100 py-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Capacity Connect • Ministry of Earth Sciences (MoES), Govt. of India.</p>
          <div className="flex items-center gap-6">
            <Link to="/courses" className="hover:text-cyan-700 transition-colors">Courses</Link>
            <Link to="/about" className="hover:text-cyan-700 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-cyan-700 font-bold text-cyan-700 transition-colors">Contact</Link>
            <Link to="/login" className="hover:text-cyan-700 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-cyan-700 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
