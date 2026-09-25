import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Calendar, Shield, Award, CheckCircle, Clock, Ban,
  ExternalLink, FileText, Globe, Link2,
  BookOpen, Layers, X, Sparkles, AlertCircle
} from 'lucide-react'

interface AdminUserDetailsModalProps {
  user: any | null
  isOpen: boolean
  onClose: () => void
  onUpdateStatus?: (userId: string, email: string | null, role: any, status: any) => void
  onViewProof?: (proofPath: string) => void
}

export function AdminUserDetailsModal({
  user,
  isOpen,
  onClose,
  onUpdateStatus,
  onViewProof,
}: AdminUserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'contact' | 'courses'>('overview')
  const [userCourses, setUserCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset tab when user changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview')
    }
  }, [isOpen, user?.id])

  // Fetch real-time enrollments or authored courses
  useEffect(() => {
    if (!user || !isOpen) {
      setUserCourses([])
      return
    }

    const fetchUserActivity = async () => {
      setLoadingCourses(true)
      try {
        if (user.role === 'trainee') {
          const { data, error } = await supabase
            .from('enrollments')
            .select('*, courses(id, title, course_type, delivery_mode, duration_minutes)')
            .eq('user_id', user.id)
            .order('enrolled_at', { ascending: false })
          
          if (!error && data) {
            setUserCourses(data)
          }
        } else if (user.role === 'trainer') {
          const { data, error } = await supabase
            .from('courses')
            .select('id, title, course_type, delivery_mode, status, max_trainees, created_at')
            .eq('trainer_id', user.id)
            .order('created_at', { ascending: false })

          if (!error && data) {
            setUserCourses(data)
          }
        }
      } catch (e) {
        console.error('Error fetching user courses in modal:', e)
      } finally {
        setLoadingCourses(false)
      }
    }

    fetchUserActivity()
  }, [user, isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!mounted) return null

  const isTrainer = user?.role === 'trainer'
  const isTrainee = user?.role === 'trainee'

  // Extract skills/expertise
  const skillsList: string[] = user ? (Array.isArray(user.skills)
    ? user.skills
    : Array.isArray(user.expertise_areas)
    ? user.expertise_areas
    : typeof user.skills === 'string'
    ? user.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []) : []

  const interestsList: string[] = user ? (Array.isArray(user.interests)
    ? user.interests
    : typeof user.interests === 'string'
    ? user.interests.split(',').map((s: string) => s.trim()).filter(Boolean)
    : []) : []

  return createPortal(
    <AnimatePresence>
      {isOpen && user && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
          />

          {/* Modal Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl bg-white border border-slate-200/90 text-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
            title="Close Window"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Hero Banner */}
          <div className="relative p-6 sm:p-7 bg-gradient-to-r from-slate-900 via-[#0a1628] to-[#0d2242] text-white shrink-0">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 pr-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-cyan-500/30 shrink-0 border border-white/20">
                  {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-extrabold text-white tracking-tight">{user.full_name || 'Anonymous User'}</h3>
                    <span className={`capitalize text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      user.role === 'trainer' ? 'bg-purple-500/20 text-purple-200 border-purple-400/40' :
                      user.role === 'admin' || user.role === 'super_admin' ? 'bg-rose-500/20 text-rose-200 border-rose-400/40' :
                      'bg-cyan-500/20 text-cyan-200 border-cyan-400/40'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`capitalize text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      user.approval_status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' :
                      user.approval_status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' :
                      'bg-rose-500/20 text-rose-300 border-rose-400/40'
                    }`}>
                      {user.approval_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1 flex-wrap">
                    <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{user.email || 'No email provided'}</span>
                    {user.department && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-300 font-semibold">{user.department}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {user.proof_path && onViewProof && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => onViewProof(user.proof_path)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> View ID Proof
                </Button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-6 border-b border-white/10 pb-0 overflow-x-auto hide-scrollbar">
              {[
                { id: 'overview', label: 'Overview & Profile', icon: User },
                { id: 'credentials', label: isTrainer ? 'Experience & Qualifications' : 'Academic & Skills', icon: GraduationCap },
                { id: 'contact', label: 'Contact & Location', icon: MapPin },
                { id: 'courses', label: isTrainer ? `Courses Created (${userCourses.length})` : `Enrolled Programs (${userCourses.length})`, icon: BookOpen },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">MoES Department / Institute</p>
                    <p className="text-sm font-bold text-slate-900">{user.department || 'MoES Central Secretariat'}</p>
                    <p className="text-xs text-slate-500">{user.designation || 'Scientific / Administrative Officer'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Registration</p>
                    <p className="text-sm font-bold text-slate-900">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Verified Account'}
                    </p>
                    <p className="text-xs text-slate-500">System UID: {user.id ? `${user.id.slice(0, 13)}...` : '—'}</p>
                  </div>
                </div>

                {/* Bio / Summary */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Briefcase className="w-4 h-4 text-cyan-600" />
                    <span>About & Professional Profile</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {user.bio || 'No specialized bio or biography details have been recorded yet.'}
                  </p>
                </div>

                {/* Learning Goals or Trainer Availability */}
                {user.learning_goals && (
                  <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/70 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-900">
                      <Sparkles className="w-4 h-4 text-cyan-600" />
                      <span>Capacity & Learning Goals</span>
                    </div>
                    <p className="text-sm text-cyan-950">{user.learning_goals}</p>
                  </div>
                )}

                {user.availability && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs">
                    <span className="font-semibold text-slate-700">Trainer Availability:</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold capitalize">
                      {user.availability}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CREDENTIALS & SKILLS */}
            {activeTab === 'credentials' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Educational Qualifications</p>
                    <p className="text-sm font-bold text-slate-900">{user.qualifications || '—'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain Experience</p>
                    <p className="text-sm font-bold text-slate-900">
                      {user.years_of_experience ? `${user.years_of_experience} Years in Ministry / Research` : (user.work_experience ? 'Experience recorded' : '—')}
                    </p>
                  </div>
                </div>

                {user.work_experience && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Work Experience Narrative</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{user.work_experience}</p>
                  </div>
                )}

                {/* Skills Tags */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Technical Skills & Competencies</p>
                  {skillsList.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {skillsList.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200/80 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific competency tags listed.</p>
                  )}
                </div>

                {/* Interests Tags */}
                {interestsList.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Research & Focus Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {interestsList.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONTACT & LOCATION */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Email Address</p>
                    <p className="text-sm font-bold text-slate-900">{user.email || '—'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telephone / Contact</p>
                    <p className="text-sm font-bold text-slate-900">{user.phone || 'Not recorded'}</p>
                    {user.alternate_phone && (
                      <p className="text-xs text-slate-500">Alternate: {user.alternate_phone}</p>
                    )}
                  </div>
                </div>

                {/* Address Details */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    <span>Location & Postal Address</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block">Address</span>
                      <span className="text-slate-800 font-bold">{user.address || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">City</span>
                      <span className="text-slate-800 font-bold">{user.city || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">State</span>
                      <span className="text-slate-800 font-bold">{user.state || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block">Pincode / Country</span>
                      <span className="text-slate-800 font-bold">{user.pincode || '—'}, {user.country || 'India'}</span>
                    </div>
                  </div>
                </div>

                {/* Social / Portfolio Links */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Online Profiles & Links</p>
                  <div className="flex flex-wrap gap-3">
                    {user.linkedin_url ? (
                      <a
                        href={user.linkedin_url.startsWith('http') ? user.linkedin_url : `https://${user.linkedin_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" /> LinkedIn Profile
                      </a>
                    ) : null}
                    {user.github_url ? (
                      <a
                        href={user.github_url.startsWith('http') ? user.github_url : `https://${user.github_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" /> GitHub Profile
                      </a>
                    ) : null}
                    {user.website_url ? (
                      <a
                        href={user.website_url.startsWith('http') ? user.website_url : `https://${user.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold hover:bg-cyan-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Official Website
                      </a>
                    ) : null}
                    {!user.linkedin_url && !user.github_url && !user.website_url && (
                      <p className="text-xs text-slate-400 italic">No external web profiles linked.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COURSES & ACTIVITY */}
            {activeTab === 'courses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isTrainer ? 'Courses Authored & Assigned' : 'Enrolled MoES Programs'}
                  </h4>
                  <Badge variant="outline" className="text-xs font-bold bg-white border-slate-300">
                    Total: {userCourses.length}
                  </Badge>
                </div>

                {loadingCourses ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Loading activity records...</div>
                ) : userCourses.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                    {isTrainer ? 'No courses have been created by or assigned to this trainer yet.' : 'This trainee has not enrolled in any training courses yet.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {userCourses.map((item, idx) => {
                      if (isTrainee) {
                        const c = item.courses
                        return (
                          <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{c?.title || 'Course Details'}</p>
                              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                {c?.course_type} • {c?.delivery_mode || 'Recorded'} • Enrolled on {item.enrolled_at ? new Date(item.enrolled_at).toLocaleDateString() : '—'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge className={`capitalize font-bold text-xs ${
                                item.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                item.status === 'in_progress' ? 'bg-cyan-100 text-cyan-800 border-cyan-300' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {item.status}
                              </Badge>
                              {item.progress_pct !== undefined && (
                                <p className="text-[11px] font-bold text-slate-600 mt-1">{item.progress_pct}% Completed</p>
                              )}
                            </div>
                          </div>
                        )
                      } else {
                        // Trainer's course
                        return (
                          <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                {item.course_type} • Delivery: {item.delivery_mode || 'Recorded'} • Capacity: {item.max_trainees || 'Unlimited'}
                              </p>
                            </div>
                            <Badge className={`capitalize font-bold text-xs ${
                              item.status === 'published' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              item.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                              'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {item.status}
                            </Badge>
                          </div>
                        )
                      }
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Action Footer */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {onUpdateStatus && (
                <>
                  {user.approval_status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => {
                          onUpdateStatus(user.id, user.email, user.role, 'approved')
                          onClose()
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve Account
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => {
                          onUpdateStatus(user.id, user.email, user.role, 'rejected')
                          onClose()
                        }}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1.5" /> Reject Account
                      </Button>
                    </>
                  )}
                  {user.approval_status === 'approved' && (
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onUpdateStatus(user.id, user.email, user.role, 'suspended')
                        onClose()
                      }}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold rounded-xl text-xs cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend Account
                    </Button>
                  )}
                  {user.approval_status === 'suspended' && (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        onUpdateStatus(user.id, user.email, user.role, 'approved')
                        onClose()
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Unsuspend Account
                    </Button>
                  )}
                </>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-100"
            >
              Close Window
            </Button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
