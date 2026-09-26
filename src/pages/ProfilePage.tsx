import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { TrainerLayout } from '@/features/trainer/TrainerLayout'
import { DashboardShell } from './Dashboards'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  User, Mail, Phone, MapPin, GraduationCap, Briefcase, Sparkles,
  Shield, Key, Globe, Save, Loader2, Plus, X,
  CheckCircle2, Compass, BookOpen, BarChart3, Award, Calendar,
  Building, Layers, Lock, FileText, Check, Code, ExternalLink,
  Trophy, Medal, Star, ChevronRight, ArrowRight, Eye, EyeOff,
  Camera, Upload, Trash2, Image as ImageIcon, Bell
} from 'lucide-react'

function LinkedinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

function GithubIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }

const SUGGESTED_SKILLS = [
  'Python', 'Atmospheric Modeling', 'WRF Model', 'Numerical Weather Prediction (NWP)',
  'Doppler Weather Radar', 'Satellite Remote Sensing', 'GIS & ArcGIS', 'Ocean State Forecasting',
  'Buoy Data Analysis', 'Climate Data Operators (CDO)', 'MATLAB', 'NetCDF / GRIB',
  'Machine Learning & AI', 'High-Performance Computing (HPC)', 'R Programming', 'Fortran'
]

const SUGGESTED_INTERESTS = [
  'Monsoon Dynamics', 'Tropical Cyclones', 'Ocean Buoy Networks', 'Satellite Oceanography',
  'Flood & Drought Modeling', 'Urban Meteorology', 'Deep Ocean Mission', 'Data Assimilation',
  'Cloud Physics & Radar', 'Renewable Energy Forecasting', 'Coastal Disaster Warning'
]

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'qualifications' | 'experience' | 'skills' | 'links' | 'security'>('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch completed course enrollments for Badges section
  const { data: completedEnrollments = [], isLoading: badgesLoading } = useQuery({
    queryKey: ['trainee-profile-completed-badges', profile?.id, user?.id],
    queryFn: async () => {
      const uid = profile?.id || user?.id
      if (!uid) return []
      
      let enrollmentsList: any[] = []
      try {
        const { data: enrollmentsData, error } = await supabase
          .from('enrollments')
          .select(`
            id, status, progress_percent, enrolled_at, course_id, user_id,
            course:courses!enrollments_course_id_fkey(
              id, title, course_type, thumbnail_path, duration_minutes, modules,
              trainer:trainers!courses_trainer_id_fkey(full_name)
            )
          `)
          .eq('user_id', uid)
          .order('enrolled_at', { ascending: false })

        if (!error && enrollmentsData && enrollmentsData.length > 0) {
          enrollmentsList = enrollmentsData
        } else {
          // Resilient fallback query
          const { data: fallbackEnrs } = await supabase
            .from('enrollments')
            .select('*')
            .eq('user_id', uid)
          
          if (fallbackEnrs && fallbackEnrs.length > 0) {
            const courseIds = fallbackEnrs.map((e: any) => e.course_id).filter(Boolean)
            const { data: coursesData } = await supabase
              .from('courses')
              .select('id, title, course_type, thumbnail_path, duration_minutes, modules, trainer:trainers!courses_trainer_id_fkey(full_name)')
              .in('id', courseIds)

            const courseMap = new Map((coursesData || []).map((c: any) => [c.id, c]))
            enrollmentsList = fallbackEnrs.map((e: any) => ({
              ...e,
              course: courseMap.get(e.course_id)
            }))
          }
        }
      } catch (err) {
        console.warn('Error fetching enrollments for badges:', err)
      }

      // Also check certificates if any
      const { data: certsData } = await supabase
        .from('certificates')
        .select('course_id')
        .eq('user_id', uid)

      const certCourseIds = new Set((certsData || []).map((c: any) => c.course_id))

      const list = (enrollmentsList || []).filter((e: any) => {
        if (!e.course && !e.course_id) return false
        if (e.status === 'completed' || (e.progress_percent ?? 0) >= 100) return true
        if (certCourseIds.has(e.course_id || e.course?.id)) return true
        
        try {
          const keysToCheck = [
            `cc_mod_progress_${e.course_id}_${uid}`,
            `cc_mod_progress_${e.course?.id}_${uid}`,
            `cc_mod_progress_${e.course_id}_${user?.id}`,
            `cc_mod_progress_${e.course?.id}_${user?.id}`,
          ]
          for (const k of keysToCheck) {
            const raw = localStorage.getItem(k)
            if (raw) {
              const parsed = JSON.parse(raw)
              const totalMods = Array.isArray(e.course?.modules) ? e.course.modules.length : 0
              if (totalMods > 0 && Array.isArray(parsed.completed) && parsed.completed.length >= totalMods) {
                return true
              }
            }
          }
        } catch {
          // ignore
        }
        return false
      })

      return list
    },
    enabled: !!(profile?.id || user?.id) && (profile?.role === 'trainee' || !profile?.role),
  })

  // Profile Form State
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    avatar_path: '',
    phone: '',
    alternate_phone: '',
    department: '',
    designation: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    qualifications: '',
    work_experience: '',
    years_of_experience: '',
    bio: '',
    learning_goals: '',
    availability: 'available',
    linkedin_url: '',
    website_url: '',
    github_url: '',
    skills: [] as string[],
    interests: [] as string[],
  })

  // Skill & Interest input fields
  const [newSkillInput, setNewSkillInput] = useState('')
  const [newInterestInput, setNewInterestInput] = useState('')

  // Password update states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Fetch user data from role tables
      const [adminRes, trainerRes, traineeRes] = await Promise.all([
        supabase.from('admins').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('trainers').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('trainees').select('*').eq('id', user.id).maybeSingle()
      ])

      const data: any = adminRes.data || trainerRes.data || traineeRes.data || {}

      setForm({
        full_name: data.full_name || profile?.full_name || '',
        email: data.email || user.email || '',
        avatar_path: data.avatar_path || profile?.avatar_path || '',
        phone: data.phone || '',
        alternate_phone: data.alternate_phone || '',
        department: data.department || '',
        designation: data.designation || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        country: data.country || 'India',
        pincode: data.pincode || '',
        qualifications: data.qualifications || '',
        work_experience: data.work_experience || '',
        years_of_experience: data.years_of_experience ? String(data.years_of_experience) : '',
        bio: data.bio || '',
        learning_goals: data.learning_goals || '',
        availability: data.availability || 'available',
        linkedin_url: data.linkedin_url || '',
        website_url: data.website_url || '',
        github_url: data.github_url || '',
        skills: Array.isArray(data.skills) ? data.skills : (Array.isArray(data.expertise_areas) ? data.expertise_areas : []),
        interests: Array.isArray(data.interests) ? data.interests : [],
      })
    } catch (err: any) {
      console.error('Error loading profile:', err)
      toast.error('Failed to load profile details')
    } finally {
      setLoading(false)
    }
  }, [user, profile?.full_name, profile?.avatar_path])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Handle Avatar Photo Upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, JPEG, WEBP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size cannot exceed 10MB limit')
      return
    }

    setUploadingAvatar(true)
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`
    const table = profile?.role === 'trainer' ? 'trainers' : profile?.role === 'trainee' ? 'trainees' : 'admins'

    try {
      let finalAvatarUrl: string | null = null

      // Attempt upload to Supabase storage bucket
      const { error: uploadError } = await supabase.storage
        .from('Homepage')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Fallback: Try materials bucket or DataURL
        const { error: matError } = await supabase.storage
          .from('materials')
          .upload(filePath, file, { upsert: true })

        if (!matError) {
          const { data: urlData } = supabase.storage.from('materials').getPublicUrl(filePath)
          finalAvatarUrl = urlData.publicUrl
        } else {
          // Robust DataURL fallback for instant resilience
          await new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = (event) => {
              finalAvatarUrl = event.target?.result as string
              resolve()
            }
            reader.readAsDataURL(file)
          })
        }
      } else {
        const { data: urlData } = supabase.storage.from('Homepage').getPublicUrl(filePath)
        finalAvatarUrl = urlData.publicUrl
      }

      if (finalAvatarUrl) {
        setForm(prev => ({ ...prev, avatar_path: finalAvatarUrl! }))

        // Update database table for user's role
        await supabase
          .from(table as any)
          .update({ avatar_path: finalAvatarUrl })
          .eq('id', user.id)

        await refreshProfile()
        toast.success('Profile photo updated successfully!')
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err)
      toast.error('Failed to upload profile photo')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handle Avatar Photo Removal
  const handleRemoveAvatar = async () => {
    if (!user) return
    setUploadingAvatar(true)
    const table = profile?.role === 'trainer' ? 'trainers' : profile?.role === 'trainee' ? 'trainees' : 'admins'
    try {
      setForm(prev => ({ ...prev, avatar_path: '' }))
      await supabase
        .from(table as any)
        .update({ avatar_path: null })
        .eq('id', user.id)

      await refreshProfile()
      toast.success('Profile photo removed')
    } catch (err: any) {
      toast.error('Failed to remove profile photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Handle Tag Addition
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed) return
    if (!form.skills.includes(trimmed)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }))
    }
    setNewSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }))
  }

  const handleAddInterest = (interest: string) => {
    const trimmed = interest.trim()
    if (!trimmed) return
    if (!form.interests.includes(trimmed)) {
      setForm(prev => ({ ...prev, interests: [...prev.interests, trimmed] }))
    }
    setNewInterestInput('')
  }

  const handleRemoveInterest = (interestToRemove: string) => {
    setForm(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interestToRemove) }))
  }

  // Save Profile Handler
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const table = profile?.role === 'trainer' ? 'trainers' : profile?.role === 'trainee' ? 'trainees' : 'admins'
      const payload: Record<string, any> = {
        full_name: form.full_name,
        avatar_path: form.avatar_path || null,
        phone: form.phone || null,
        alternate_phone: form.alternate_phone || null,
        department: form.department || null,
        designation: form.designation || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || 'India',
        pincode: form.pincode || null,
        qualifications: form.qualifications || null,
        work_experience: form.work_experience || null,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
        bio: form.bio || null,
        linkedin_url: form.linkedin_url || null,
        website_url: form.website_url || null,
        github_url: form.github_url || null,
        skills: form.skills,
        interests: form.interests,
      }

      if (profile?.role === 'trainer') {
        payload.availability = form.availability || 'available'
      }

      if (profile?.role === 'trainee') {
        payload.learning_goals = form.learning_goals || null
      }

      const { error } = await supabase
        .from(table as any)
        .update(payload)
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      toast.success('Profile details saved successfully!')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      toast.error(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  // Update Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Please enter your current password')
      return
    }
    if (!newPassword) {
      toast.error('Please enter a new password')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from your current password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    const userEmail = user?.email || form.email
    if (!userEmail) {
      toast.error('Account email not found')
      return
    }

    setPasswordLoading(true)
    try {
      // 1. Verify current password by signing in
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      })
      if (verifyErr) {
        toast.error('Current password is incorrect. Please check and try again.')
        setPasswordLoading(false)
        return
      }

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw updateErr

      // 3. Keep role tables in sync if needed
      try {
        const table = profile?.role === 'trainer' ? 'trainers' : profile?.role === 'trainee' ? 'trainees' : 'admins'
        await (supabase.from(table as any) as any).update({ password: newPassword }).eq('id', user!.id)
      } catch {
        // non-fatal
      }

      toast.success('Password updated successfully! 🔒')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    const loadingView = (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="w-10 h-10 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading profile data...</p>
      </div>
    )
    if (profile?.role === 'trainer') return <TrainerLayout>{loadingView}</TrainerLayout>
    return (
      <DashboardShell title="Profile" icon={User}>
        {loadingView}
      </DashboardShell>
    )
  }

  const mainContent = (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Profile Hero Card */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#040814] via-[#081329] to-[#040d21] text-white p-6 sm:p-8 border border-cyan-500/30 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group/avatar w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-cyan-500/30 ring-4 ring-white/10 shrink-0 overflow-hidden">
                {form.avatar_path ? (
                  <img src={form.avatar_path} alt={form.full_name} className="w-full h-full object-cover" />
                ) : (
                  form.full_name?.charAt(0)?.toUpperCase() || <User className="w-10 h-10" />
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer backdrop-blur-2xs"
                  title="Change profile photo"
                >
                  {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 mb-0.5" />}
                  <span>Edit</span>
                </button>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {form.full_name || 'My Profile'}
                  </h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border bg-cyan-500/20 text-cyan-300 border-cyan-500/40 capitalize font-bold">
                    {profile?.role?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> {form.email || user?.email}
                </p>
                {(form.designation || form.department) && (
                  <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    {[form.designation, form.department].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Verified Account Status Badge */}
            <div className="flex items-center gap-3.5 bg-slate-900/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-950/40 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">
                    {profile?.approval_status === 'rejected' ? 'Action Required' : profile?.approval_status === 'pending' ? 'Verification Pending' : 'Verified Member'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Official Capacity Connect Member
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Trainee Course Badges Section */}
      {profile?.role === 'trainee' && (
        <motion.div variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-cyan-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/25 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                      Earned Course Badges
                    </CardTitle>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-extrabold px-2">
                      {completedEnrollments.length} Earned
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Official milestone achievement credentials awarded for 100% course curriculum completion.
                  </CardDescription>
                </div>
              </div>

              <Link
                to="/trainee/my-learning"
                className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 shrink-0 group transition-colors"
              >
                <span>View All in My Learning</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {badgesLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                  <span className="text-xs font-semibold">Loading badges...</span>
                </div>
              ) : completedEnrollments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedEnrollments.map((enr: any, idx: number) => {
                    const course = enr.course
                    if (!course) return null

                    const colorThemes = [
                      {
                        bg: 'from-amber-500/15 via-orange-500/5 to-amber-500/10 border-amber-200/90 hover:border-amber-400',
                        medal: 'from-amber-400 via-amber-500 to-orange-500 text-white shadow-amber-500/30',
                        tag: 'bg-amber-100 text-amber-900 border-amber-300',
                        icon: Trophy,
                        tier: 'Mastery Badge',
                      },
                      {
                        bg: 'from-emerald-500/15 via-teal-500/5 to-emerald-500/10 border-emerald-200/90 hover:border-emerald-400',
                        medal: 'from-emerald-400 via-teal-500 to-emerald-600 text-white shadow-emerald-500/30',
                        tag: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        icon: Award,
                        tier: 'Certified Specialist',
                      },
                      {
                        bg: 'from-cyan-500/15 via-blue-500/5 to-cyan-500/10 border-cyan-200/90 hover:border-cyan-400',
                        medal: 'from-cyan-400 via-sky-500 to-blue-600 text-white shadow-cyan-500/30',
                        tag: 'bg-cyan-100 text-cyan-900 border-cyan-300',
                        icon: Medal,
                        tier: 'Graduate Badge',
                      },
                      {
                        bg: 'from-purple-500/15 via-indigo-500/5 to-purple-500/10 border-purple-200/90 hover:border-purple-400',
                        medal: 'from-purple-400 via-indigo-500 to-violet-600 text-white shadow-purple-500/30',
                        tag: 'bg-purple-100 text-purple-900 border-purple-300',
                        icon: Star,
                        tier: 'Excellence Award',
                      },
                    ]
                    const theme = colorThemes[idx % colorThemes.length]
                    const IconComp = theme.icon

                    return (
                      <div
                        key={enr.id}
                        className={`p-4 rounded-2xl border bg-gradient-to-br transition-all duration-200 shadow-xs hover:shadow-md flex items-start gap-3.5 group relative ${theme.bg}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform ${theme.medal}`}>
                          <IconComp className="w-6 h-6" />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${theme.tag}`}>
                              {theme.tier}
                            </span>
                            {course.department && (
                              <span className="text-[10px] text-slate-500 font-semibold truncate">
                                • {course.department}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-cyan-700 transition-colors">
                            {course.title}
                          </h4>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                            </span>
                            <Link
                              to={`/trainee/courses/${course.id}/learn`}
                              className="text-[11px] font-bold text-slate-600 hover:text-cyan-600 flex items-center gap-0.5"
                            >
                              Review <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
                  <div className="flex justify-center items-center gap-2 text-slate-300">
                    <Trophy className="w-8 h-8 opacity-40" />
                    <Award className="w-9 h-9 opacity-60 text-amber-400" />
                    <Star className="w-8 h-8 opacity-40" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">No Course Badges Earned Yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Complete all modules in your enrolled courses and score at least 80% on module quizzes to unlock your official skill achievement badges here.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs Navigation Bar */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 backdrop-blur-sm rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none shadow-xs">
          {[
            { id: 'general', label: 'Personal & Contact', icon: User },
            { id: 'qualifications', label: 'Qualifications', icon: GraduationCap },
            { id: 'experience', label: 'Experience & Bio', icon: Briefcase },
            { id: 'skills', label: 'Skills & Interests', icon: Sparkles },
            { id: 'links', label: 'Social & Links', icon: Globe },
            { id: 'security', label: 'Security & Settings', icon: Shield },
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {/* 1. Personal & Contact Tab */}
        {activeTab === 'general' && (
          <motion.div key="general" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-600" /> Personal & Contact Details
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Manage your personal contact info, official affiliations, and address.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Profile Photo Uploader Section */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-md shrink-0 ring-2 ring-cyan-500/30 overflow-hidden">
                      {form.avatar_path ? (
                        <img src={form.avatar_path} alt={form.full_name} className="w-full h-full object-cover" />
                      ) : (
                        form.full_name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />
                      )}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Profile Photo</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        PNG, JPG, or WEBP (Max 10MB). High-resolution square image recommended.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold rounded-xl h-9 flex-1 sm:flex-initial cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                      )}
                      {form.avatar_path ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {form.avatar_path && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl h-9 px-3 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Full Name *</Label>
                    <Input
                      value={form.full_name}
                      onChange={e => updateField('full_name', e.target.value)}
                      placeholder="e.g. Dr. Rajesh Kumar"
                      className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Address (Registered)</Label>
                    <Input
                      value={form.email}
                      disabled
                      className="bg-slate-100 border-slate-200 rounded-xl h-10 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Primary Phone / Mobile Number *</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        value={form.phone}
                        onChange={e => updateField('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="bg-slate-50 border-slate-200 rounded-xl h-10 pl-9 text-slate-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Alternate Contact / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        value={form.alternate_phone}
                        onChange={e => updateField('alternate_phone', e.target.value)}
                        placeholder="+91 98765 00000"
                        className="bg-slate-50 border-slate-200 rounded-xl h-10 pl-9 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Department / Institute / Ministry</Label>
                    <Input
                      value={form.department}
                      onChange={e => updateField('department', e.target.value)}
                      placeholder="e.g. INCOIS / IMD / NCMRWF / IITM"
                      className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Designation / Role Title</Label>
                    <Input
                      value={form.designation}
                      onChange={e => updateField('designation', e.target.value)}
                      placeholder="e.g. Scientist-D / Meteorologist / Field Trainee"
                      className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600" /> Complete Address & Location
                  </Label>
                  <Textarea
                    value={form.address}
                    onChange={e => updateField('address', e.target.value)}
                    rows={2}
                    placeholder="Street address, building, campus, postal location..."
                    className="bg-slate-50 border-slate-200 rounded-xl text-slate-900 resize-none"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">City</Label>
                      <Input
                        value={form.city}
                        onChange={e => updateField('city', e.target.value)}
                        placeholder="e.g. Hyderabad"
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">State</Label>
                      <Input
                        value={form.state}
                        onChange={e => updateField('state', e.target.value)}
                        placeholder="e.g. Telangana"
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Postal PIN Code</Label>
                      <Input
                        value={form.pincode}
                        onChange={e => updateField('pincode', e.target.value)}
                        placeholder="e.g. 500090"
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Country</Label>
                      <Input
                        value={form.country}
                        onChange={e => updateField('country', e.target.value)}
                        placeholder="India"
                        className="bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveProfile()}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 h-11 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 2. Qualifications Tab */}
        {activeTab === 'qualifications' && (
          <motion.div key="qualifications" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-600" /> Academic & Professional Qualifications
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Add your degrees, certifications, specializations, and institutional credentials.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">
                    Degrees, Diplomas & Institutional Certifications
                  </Label>
                  <Textarea
                    value={form.qualifications}
                    onChange={e => updateField('qualifications', e.target.value)}
                    rows={5}
                    placeholder="e.g.
• Ph.D. in Atmospheric Sciences - IIT Delhi (2020)
• M.Tech in Meteorology & Oceanography - Andhra University (2015)
• WMO Level 2 Meteorological Forecaster Certification (2018)
• B.Sc. in Physics & Mathematics - University of Hyderabad (2013)"
                    className="bg-slate-50 border-slate-200 rounded-xl text-slate-900 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tip: Mention degree name, university / institute, year of graduation, and special honors.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveProfile()}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 h-11 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Qualifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 3. Experience & Bio Tab */}
        {activeTab === 'experience' && (
          <motion.div key="experience" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-cyan-600" /> Work Experience & Biography
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Highlight your scientific track record, years of service, and professional summary.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Total Years of Experience</Label>
                    <Input
                      type="number"
                      value={form.years_of_experience}
                      onChange={e => updateField('years_of_experience', e.target.value)}
                      placeholder="e.g. 8"
                      className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                    />
                  </div>

                  {profile?.role === 'trainer' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Trainer Availability</Label>
                      <Select value={form.availability} onValueChange={v => updateField('availability', v)}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">🟢 Available for Sessions</SelectItem>
                          <SelectItem value="busy">🟡 Busy with Ongoing Cohorts</SelectItem>
                          <SelectItem value="unavailable">🔴 Currently Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Professional Summary / Biography</Label>
                  <Textarea
                    value={form.bio}
                    onChange={e => updateField('bio', e.target.value)}
                    rows={4}
                    placeholder="Write a brief professional overview outlining your research interests, teaching methodology, or scientific contributions..."
                    className="bg-slate-50 border-slate-200 rounded-xl text-slate-900 leading-relaxed font-sans"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Label className="text-xs font-bold text-slate-700">Detailed Work Experience & Key Projects</Label>
                  <Textarea
                    value={form.work_experience}
                    onChange={e => updateField('work_experience', e.target.value)}
                    rows={4}
                    placeholder="e.g.
• Senior Research Scientist - INCOIS (2021 - Present): Leading numerical ocean modeling and storm surge advisory pipelines.
• Meteorological Officer - IMD (2016 - 2021): Handled Doppler Radar observations and daily aviation forecasting."
                    className="bg-slate-50 border-slate-200 rounded-xl text-slate-900 leading-relaxed font-sans"
                  />
                </div>

                {profile?.role === 'trainee' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-bold text-slate-700">Learning Goals & Aspirations</Label>
                    <Textarea
                      value={form.learning_goals}
                      onChange={e => updateField('learning_goals', e.target.value)}
                      rows={3}
                      placeholder="What specific skills or masterclasses are you aiming to master on Capacity Connect?"
                      className="bg-slate-50 border-slate-200 rounded-xl text-slate-900"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => handleSaveProfile()}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 h-11 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Experience
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 4. Skills & Interests Tab */}
        {activeTab === 'skills' && (
          <motion.div key="skills" variants={fadeUp} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
            {/* Skills Card */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-600" /> Technical & Domain Skills
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Tag your technical software, meteorological modeling frameworks, and observational tools.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Active Skills Pills */}
                <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  {form.skills.length > 0 ? (
                    form.skills.map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold shadow-xs animate-in fade-in"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="w-4 h-4 rounded-full hover:bg-cyan-200 flex items-center justify-center text-cyan-900 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 font-medium py-1">
                      No skills added yet. Type below or pick suggestions.
                    </span>
                  )}
                </div>

                {/* Add Custom Skill Input */}
                <div className="flex gap-2">
                  <Input
                    value={newSkillInput}
                    onChange={e => setNewSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill(newSkillInput)
                      }
                    }}
                    placeholder="Type a skill and press Enter..."
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddSkill(newSkillInput)}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl px-4 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Skill
                  </Button>
                </div>

                {/* Quick Add Suggestions */}
                <div className="space-y-2 pt-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Recommended Suggestions:
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SKILLS.filter(s => !form.skills.includes(s)).slice(0, 10).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleAddSkill(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 border border-slate-200 text-xs text-slate-600 font-medium transition-all"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interests Card */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" /> Research & Learning Interests
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select domain themes, meteorological specializations, or earth science topics.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Active Interests Pills */}
                <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  {form.interests.length > 0 ? (
                    form.interests.map(interest => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-bold shadow-xs animate-in fade-in"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="w-4 h-4 rounded-full hover:bg-indigo-200 flex items-center justify-center text-indigo-900 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 font-medium py-1">
                      No interests tagged yet. Type below or pick suggestions.
                    </span>
                  )}
                </div>

                {/* Add Custom Interest Input */}
                <div className="flex gap-2">
                  <Input
                    value={newInterestInput}
                    onChange={e => setNewInterestInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddInterest(newInterestInput)
                      }
                    }}
                    placeholder="Type an interest area and press Enter..."
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddInterest(newInterestInput)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Interest
                  </Button>
                </div>

                {/* Quick Add Suggestions */}
                <div className="space-y-2 pt-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Suggested Earth Science Topics:
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_INTERESTS.filter(i => !form.interests.includes(i)).slice(0, 8).map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddInterest(i)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-xs text-slate-600 font-medium transition-all"
                      >
                        + {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => handleSaveProfile()}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 h-11 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Skills & Interests
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 5. Social & Links Tab */}
        {activeTab === 'links' && (
          <motion.div key="links" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-600" /> Professional Profiles & External Links
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Connect your LinkedIn, GitHub, ResearchGate, or personal website.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <LinkedinIcon className="w-4 h-4 text-blue-600" /> LinkedIn Profile
                  </Label>
                  <Input
                    value={form.linkedin_url}
                    onChange={e => updateField('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" /> ResearchGate / Google Scholar / Portfolio URL
                  </Label>
                  <Input
                    value={form.website_url}
                    onChange={e => updateField('website_url', e.target.value)}
                    placeholder="https://researchgate.net/profile/username"
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <GithubIcon className="w-4 h-4 text-slate-800" /> GitHub / Code Repository
                  </Label>
                  <Input
                    value={form.github_url}
                    onChange={e => updateField('github_url', e.target.value)}
                    placeholder="https://github.com/username"
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => handleSaveProfile()}
                    disabled={saving}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 h-11 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Links
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 6. Security & Settings Tab */}
        {activeTab === 'security' && (
          <motion.div key="security" variants={fadeUp} initial="hidden" animate="visible" exit="hidden" className="space-y-6">
            {/* Password Update Card */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" /> Change Account Password
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your authentication credentials to keep your workspace secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                        className="bg-slate-50 border-slate-200 rounded-xl h-10 pr-10 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        className="bg-slate-50 border-slate-200 rounded-xl h-10 pr-10 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        minLength={6}
                        className="bg-slate-50 border-slate-200 rounded-xl h-10 pr-10 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl px-5 h-10 shadow-sm cursor-pointer"
                  >
                    {passwordLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Metadata Card */}
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-cyan-600" /> Account Information & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">User ID</span>
                    <span className="text-slate-800 font-mono font-bold break-all">{user?.id}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Account Role</span>
                    <span className="text-cyan-700 font-bold capitalize">{profile?.role?.replace('_', ' ')}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-slate-400 block font-semibold">Verification Status</span>
                    <span className="text-emerald-700 font-bold capitalize">{profile?.approval_status || 'Approved'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  if (profile?.role === 'trainer') {
    return <TrainerLayout>{mainContent}</TrainerLayout>
  }

  const adminNavLinks = [
    { to: profile?.role === 'super_admin' ? '/super-admin' : '/admin', label: 'Dashboard', icon: BarChart3 },
    { to: `/${profile?.role}/profile`, label: 'Profile', icon: User, isActive: true },
  ]

  const traineeNavLinks = [
    { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
    { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
    { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
    { to: '/trainee/assessments', label: 'Assessments', icon: Award },
    { to: '/trainee/notifications', label: 'Notifications', icon: Bell },
    { to: '/trainee/profile', label: 'Profile', icon: User, isActive: true },
  ]

  return (
    <DashboardShell
      title="Profile & Settings"
      icon={User}
      navLinks={profile?.role?.includes('admin') ? adminNavLinks : traineeNavLinks}
    >
      {mainContent}
    </DashboardShell>
  )
}
