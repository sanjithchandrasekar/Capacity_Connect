import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { TrainerLayout } from '@/features/trainer/TrainerLayout'
import { DashboardShell } from './Dashboards'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Bell, Shield, User, BarChart3, BookOpen, Loader2, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function SettingsPage() {
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'

  const [activeSection, setActiveSection] = useState<string | null>(null)
  
  // Form states
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [qualifications, setQualifications] = useState((profile as any)?.qualifications || '')
  const [workExperience, setWorkExperience] = useState((profile as any)?.work_experience || '')
  const [interests, setInterests] = useState((profile as any)?.interests || '')
  const [newPassword, setNewPassword] = useState('')

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setLoading(true)
    try {
      let error = null
      const updateData = {
        full_name: fullName,
        ...(profile.role !== 'admin' && profile.role !== 'super_admin' ? {
          qualifications: qualifications,
          work_experience: workExperience,
          interests: interests
        } : {})
      }

      if (profile.role === 'admin' || profile.role === 'super_admin') {
        const { error: err } = await supabase.from('admins').update({ full_name: fullName }).eq('id', profile.id)
        error = err
      } else if (profile.role === 'trainer') {
        const { error: err } = await supabase.from('trainers').update(updateData as any).eq('id', profile.id)
        error = err
      } else if (profile.role === 'trainee') {
        const { error: err } = await supabase.from('trainees').update(updateData as any).eq('id', profile.id)
        error = err
      }
      if (error) throw error
      toast.success('Profile updated successfully! Refreshing...')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated securely!')
      setNewPassword('')
      setActiveSection(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const content = (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Settings</h2>
        <p className="text-slate-500 mt-2 font-medium">Manage your account settings and preferences.</p>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-4">
        {/* Profile Settings */}
        <Card className="bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-sm"><User className="w-6 h-6" /></div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Account Profile</p>
                <p className="text-sm text-slate-500 font-medium">{profile?.email} &middot; Role: <span className="capitalize font-bold text-cyan-700">{profile?.role?.replace('_', ' ')}</span></p>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold" onClick={() => setActiveSection(activeSection === 'profile' ? null : 'profile')}>
                {activeSection === 'profile' ? 'Close' : 'Edit'}
              </Button>
            </div>
            
            <AnimatePresence>
              {activeSection === 'profile' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <form onSubmit={handleUpdateProfile} className="pt-6 mt-4 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Full Name</label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} className="max-w-md bg-slate-50 border-slate-200 text-slate-900 rounded-xl" />
                    </div>
                    {profile?.role !== 'admin' && profile?.role !== 'super_admin' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Qualifications</label>
                          <Input value={qualifications} onChange={e => setQualifications(e.target.value)} placeholder="e.g. B.Tech, Meteorology Certifications" className="max-w-md bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Work Experience</label>
                          <Input value={workExperience} onChange={e => setWorkExperience(e.target.value)} placeholder="e.g. 5 years as Forecaster" className="max-w-md bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">Professional Interests</label>
                          <Input value={interests} onChange={e => setInterests(e.target.value)} placeholder="e.g. Climate Modeling, Data Science" className="max-w-md bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl" />
                        </div>
                      </>
                    )}
                    <Button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-white border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 rounded-3xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm"><Shield className="w-6 h-6" /></div>
              <div className="flex-1">
                <p className="text-base font-bold text-slate-900">Security & Password</p>
                <p className="text-sm text-slate-500 font-medium">Update your password to keep your account secure.</p>
              </div>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold" onClick={() => setActiveSection(activeSection === 'security' ? null : 'security')}>
                {activeSection === 'security' ? 'Close' : 'Update'}
              </Button>
            </div>

            <AnimatePresence>
              {activeSection === 'security' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <form onSubmit={handleUpdatePassword} className="pt-6 mt-4 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">New Password</label>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="max-w-md bg-slate-50 border-slate-200 text-slate-900 rounded-xl" required minLength={6} />
                    </div>
                    <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Update Password
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  if (profile?.role === 'trainer') {
    return <TrainerLayout>{content}</TrainerLayout>
  }

  const adminNavLinks = [
    { to: isSuperAdmin ? '/super-admin' : '/admin', label: 'Overview', icon: BarChart3 },
  ]
  
  const traineeNavLinks = [
    { to: '/trainee', label: 'My Learning', icon: BookOpen },
  ]

  return (
    <DashboardShell
      title={`${profile?.role?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || ''} Settings`}
      icon={Settings}
      navLinks={profile?.role?.includes('admin') ? adminNavLinks : traineeNavLinks}
    >
      {content}
    </DashboardShell>
  )
}
