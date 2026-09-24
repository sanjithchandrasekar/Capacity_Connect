import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, User } from 'lucide-react'
import { toast } from 'sonner'

type Trainer = Database['public']['Tables']['trainers']['Row']

export function TrainerProfile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    bio: '',
    years_of_experience: '',
    availability: 'available',
    qualifications: '',
  })

  const fetchProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setForm({
          full_name: data.full_name || '',
          email: data.email || user.email || '',
          bio: data.bio || '',
          years_of_experience: data.years_of_experience ? String(data.years_of_experience) : '',
          availability: data.availability || 'available',
          qualifications: data.qualifications || '',
        })
      } else {
        setForm(p => ({ ...p, email: user.email || '' }))
      }
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload: Partial<Trainer> = {
        full_name: form.full_name,
        bio: form.bio,
        years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
        availability: form.availability,
        qualifications: form.qualifications,
      }
      const { error } = await supabase
        .from('trainers')
        .update(payload)
        .eq('id', user.id)
      if (error) throw error
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your trainer profile</p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 p-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                  {form.full_name.charAt(0) || <User className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{form.full_name || 'Trainer'}</p>
                  <p className="text-xs font-medium text-slate-500">{form.email || user?.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Full Name</Label>
                  <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="e.g. John Doe" className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Email</Label>
                  <Input value={form.email} disabled className="bg-slate-100 border-slate-200 text-slate-500 h-10 rounded-xl cursor-not-allowed" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">Biography</Label>
                <Textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={3} placeholder="Tell us about your expertise and background..." className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white rounded-xl resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Years of Experience</Label>
                  <Input type="number" value={form.years_of_experience} onChange={e => update('years_of_experience', e.target.value)} placeholder="e.g. 10" className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white h-10 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Availability</Label>
                  <Select value={form.availability} onValueChange={v => update('availability', v)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-xs font-semibold">Qualifications</Label>
                <Textarea value={form.qualifications} onChange={e => update('qualifications', e.target.value)} rows={2} placeholder="Degrees, certifications, specializations..." className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white rounded-xl resize-none" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold h-11 rounded-xl shadow-md shadow-cyan-600/20 w-full mt-2">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
