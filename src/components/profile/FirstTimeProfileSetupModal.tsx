import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  User, Camera, Upload, Trash2, Phone, Building, Briefcase,
  Sparkles, CheckCircle2, X, Loader2, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FirstTimeProfileSetupModal() {
  const { user, profile, refreshProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [bio, setBio] = useState('')

  useEffect(() => {
    if (!user || !profile) return

    const storageKey = `cc_profile_setup_done_${user.id}`
    const isCompleted = localStorage.getItem(storageKey)

    // Check if profile is newly created / first login
    // If setup hasn't been marked completed or dismissed yet, trigger the modal
    if (!isCompleted) {
      setFullName(profile.full_name || '')
      setAvatarPath(profile.avatar_path || null)
      setDepartment(profile.department || '')
      setDesignation(profile.designation || '')
      setBio(profile.bio || '')
      setIsOpen(true)
    }
  }, [user, profile])

  if (!isOpen || !user || !profile) return null

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`cc_profile_setup_done_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG, WEBP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size cannot exceed 10MB')
      return
    }

    setUploadingPhoto(true)
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`
    const table = profile.role === 'trainer' ? 'trainers' : profile.role === 'trainee' ? 'trainees' : 'admins'

    try {
      let finalUrl: string | null = null

      // Attempt upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('Homepage')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        const { error: matError } = await supabase.storage
          .from('materials')
          .upload(filePath, file, { upsert: true })

        if (!matError) {
          const { data: urlData } = supabase.storage.from('materials').getPublicUrl(filePath)
          finalUrl = urlData.publicUrl
        } else {
          // DataURL fallback
          await new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = (ev) => {
              finalUrl = ev.target?.result as string
              resolve()
            }
            reader.readAsDataURL(file)
          })
        }
      } else {
        const { data: urlData } = supabase.storage.from('Homepage').getPublicUrl(filePath)
        finalUrl = urlData.publicUrl
      }

      if (finalUrl) {
        setAvatarPath(finalUrl)

        // Save immediately to DB
        await supabase
          .from(table as any)
          .update({ avatar_path: finalUrl })
          .eq('id', user.id)

        await refreshProfile()
        toast.success('Photo uploaded!')
      }
    } catch (err: any) {
      console.error('Photo upload error:', err)
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    if (!user) return
    setUploadingPhoto(true)
    const table = profile.role === 'trainer' ? 'trainers' : profile.role === 'trainee' ? 'trainees' : 'admins'
    try {
      setAvatarPath(null)
      await supabase
        .from(table as any)
        .update({ avatar_path: null })
        .eq('id', user.id)

      await refreshProfile()
      toast.success('Photo removed')
    } catch (err) {
      toast.error('Failed to remove photo')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    setSaving(true)
    const table = profile.role === 'trainer' ? 'trainers' : profile.role === 'trainee' ? 'trainees' : 'admins'

    try {
      const payload: Record<string, any> = {
        full_name: fullName.trim(),
        avatar_path: avatarPath || null,
        phone: phone.trim() || null,
        department: department.trim() || null,
        designation: designation.trim() || null,
        bio: bio.trim() || null,
      }

      const { error } = await supabase
        .from(table as any)
        .update(payload)
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      localStorage.setItem(`cc_profile_setup_done_${user.id}`, 'true')
      toast.success('Profile setup complete! Welcome to Capacity Connect.')
      setIsOpen(false)
    } catch (err: any) {
      console.error('Save profile error:', err)
      toast.error(err.message || 'Failed to save profile details')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Card Centered on Screen */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
          className="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 my-auto"
        >
          {/* Top Hero Banner */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-r from-[#050b1a] via-[#091733] to-[#040814] text-white overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 bottom-0 w-48 h-48 rounded-full bg-blue-500/15 blur-2xl" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
              aria-label="Close setup modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                First-Time Setup
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white leading-tight">
                Welcome to Capacity Connect!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-md">
                Set up your photo and institute details to personalize your certificates, dashboard, and badges.
              </p>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
            
            {/* Centered Photo Upload */}
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="relative group/avatar mb-3">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-cyan-600/30 ring-4 ring-cyan-500/20 overflow-hidden">
                  {avatarPath ? (
                    <img src={avatarPath} alt={fullName || 'Profile'} className="w-full h-full object-cover" />
                  ) : (
                    fullName.charAt(0)?.toUpperCase() || <User className="w-10 h-10" />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer backdrop-blur-2xs"
                  title="Upload photo"
                >
                  {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 mb-0.5" />}
                  <span>{avatarPath ? 'Change' : 'Upload'}</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="h-8 text-xs font-bold border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                  )}
                  {avatarPath ? 'Change Photo' : 'Upload Photo'}
                </Button>

                {avatarPath && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="h-8 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl px-2.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                PNG, JPG or WEBP (Max 10MB). High-resolution square recommended.
              </p>
            </div>

            {/* Inputs Grid */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-600" /> Full Name *
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar / Ananya Deshmukh"
                  required
                  className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-600" /> Institute / Department
                  </Label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. INCOIS / IMD / NCMRWF"
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900 font-medium text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-600" /> Designation / Role
                  </Label>
                  <Input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Scientist-D / Trainee Fellow"
                    className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900 font-medium text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-600" /> Mobile / Phone Number
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-slate-50 border-slate-200 rounded-xl h-10 text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors order-2 sm:order-1 cursor-pointer"
              >
                Skip for now (I'll do this later)
              </button>

              <Button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto h-11 px-7 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/25 transition-all order-1 sm:order-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
