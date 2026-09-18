import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Save, User } from 'lucide-react'
import { toast } from 'sonner'

export function TrainerProfile() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    bio: '',
    years_of_experience: '',
    qualifications: '',
    availability: 'available',
  })

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          setForm({
            full_name: data.full_name ?? '',
            email: data.email ?? '',
            bio: data.bio ?? '',
            years_of_experience: data.years_of_experience?.toString() ?? '',
            qualifications: data.qualifications ?? '',
            availability: data.availability ?? 'available',
          })
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('trainers')
        .update({
          full_name: form.full_name,
          bio: form.bio || null,
          years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
          qualifications: form.qualifications || null,
          availability: form.availability,
        })
        .eq('id', user.id)
      if (error) throw error
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }))

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Profile</h2>
          <p className="text-ink/60 text-sm mt-1">Manage your trainer profile</p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="bg-white border-ink/10">
            <CardHeader className="border-b border-ink/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ink to-ink/80 flex items-center justify-center text-cream text-lg font-bold">
                  {form.full_name.charAt(0) || <User className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-lg font-semibold text-ink">{form.full_name || 'Trainer'}</p>
                  <p className="text-xs text-ink/50">{form.email || user?.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-ink/80 text-xs">Full Name</Label>
                  <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} className="bg-ink/5 border-ink/20 text-ink h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-ink/80 text-xs">Email</Label>
                  <Input value={form.email} disabled className="bg-ink/5 border-ink/20 text-ink/50 h-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-ink/80 text-xs">Biography</Label>
                <Textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={3} placeholder="Tell us about your expertise and background..." className="bg-ink/5 border-ink/20 text-ink" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-ink/80 text-xs">Years of Experience</Label>
                  <Input type="number" value={form.years_of_experience} onChange={e => update('years_of_experience', e.target.value)} placeholder="e.g. 10" className="bg-ink/5 border-ink/20 text-ink h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-ink/80 text-xs">Availability</Label>
                  <Select value={form.availability} onValueChange={v => update('availability', v)}>
                    <SelectTrigger className="bg-ink/5 border-ink/20 text-ink h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-ink/80 text-xs">Qualifications</Label>
                <Textarea value={form.qualifications} onChange={e => update('qualifications', e.target.value)} rows={2} placeholder="Degrees, certifications, specializations..." className="bg-ink/5 border-ink/20 text-ink" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-ink hover:bg-ink/90 text-cream w-full">
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
