import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, X, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Skill = Database['public']['Tables']['skills']['Row']
type UserSkill = Database['public']['Tables']['user_skills']['Row']

export function TrainerSkills() {
  const { user } = useAuth()
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [userSkills, setUserSkills] = useState<(UserSkill & { skills: Skill | null })[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [customSkillName, setCustomSkillName] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const { data: sk } = await supabase.from('skills').select('*').order('name')
      if (sk) {
        setAllSkills(sk)
      }

      const { data: us } = await supabase
        .from('user_skills')
        .select('*, skills(*)')
        .eq('user_id', user.id)
      if (us) setUserSkills(us as any)
    } catch (err) {
      console.error(err)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredSkills = allSkills.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    !userSkills.some(us => us.skill_id === s.id)
  )

  const handleAddSkill = async (skillId: string) => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_skills')
        .insert({ user_id: user.id, skill_id: skillId })
      if (error) throw error
      toast.success('Skill added')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSkill = async (skillId: string) => {
    if (!user) return
    setSaving(true)
    try {
      await supabase.from('user_skills').delete().eq('user_id', user.id).eq('skill_id', skillId)
      toast.success('Skill removed')
      fetchData()
    } catch (err) {
      toast.error('Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAndAddSkill = async () => {
    const name = customSkillName.trim()
    if (!name || !user) return
    if (allSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Skill already exists')
      return
    }
    setAddingCustom(true)
    try {
      const { data: newSkill, error: createErr } = await supabase.from('skills').insert({ name }).select().single()
      if (createErr) throw createErr
      const { error: linkErr } = await supabase.from('user_skills').insert({ user_id: user.id, skill_id: newSkill.id })
      if (linkErr) throw linkErr
      setCustomSkillName('')
      setSearch('')
      toast.success(`Skill "${name}" created and added`)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setAddingCustom(false)
    }
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Skills & Expertise</h2>
          <p className="text-slate-500 text-sm mt-1">Manage the skills listed on your profile</p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                {userSkills.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-xs font-semibold">Your Skills ({userSkills.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {userSkills.map(us => (
                        <div key={us.skill_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold">
                          <span>{us.skills?.name ?? 'Unknown'}</span>
                          <button onClick={() => handleRemoveSkill(us.skill_id)} disabled={saving} className="hover:text-rose-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-700 text-xs font-semibold">Add Skills</Label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search skills..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white pl-9 h-10 rounded-xl"
                    />
                  </div>
                  {search && filteredSkills.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-1 bg-white shadow-sm">
                      {filteredSkills.slice(0, 20).map(s => (
                        <button
                          key={s.id}
                          onClick={() => { handleAddSkill(s.id); setSearch('') }}
                          disabled={saving}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg text-left text-sm text-slate-800 font-medium transition-colors"
                        >
                          <span>{s.name}</span>
                          <Plus className="w-3.5 h-3.5 text-cyan-600" />
                        </button>
                      ))}
                    </div>
                  )}
                  {search && filteredSkills.length === 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-slate-400">No matching skills found.</p>
                      <div className="flex gap-2">
                        <Input
                          value={customSkillName || search}
                          onChange={e => setCustomSkillName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAddSkill() } }}
                          placeholder="Create new skill..."
                          className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 text-xs rounded-xl"
                          disabled={addingCustom}
                        />
                        <button
                          onClick={handleCreateAndAddSkill}
                          disabled={addingCustom || !(customSkillName || search).trim()}
                          className="px-3.5 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:opacity-95 transition-all shrink-0 disabled:opacity-50"
                        >
                          {addingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {userSkills.length === 0 && !search && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No skills added yet. Search to add, or type a new skill name to create one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
