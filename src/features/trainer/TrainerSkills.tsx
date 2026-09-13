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
          <h2 className="text-2xl font-bold tracking-tight text-ink">Skills & Expertise</h2>
          <p className="text-ink/60 text-sm mt-1">Manage the skills listed on your profile</p>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="bg-white border-ink/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                {userSkills.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-ink/80 text-xs">Your Skills ({userSkills.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {userSkills.map(us => (
                        <div key={us.skill_id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/10 border border-ink/20 text-ink text-xs">
                          <span>{us.skills?.name ?? 'Unknown'}</span>
                          <button onClick={() => handleRemoveSkill(us.skill_id)} disabled={saving} className="hover:text-ink transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-ink/80 text-xs">Add Skills</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
                    <Input
                      placeholder="Search skills..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-white border-ink/20 text-ink pl-9 h-10"
                    />
                  </div>
                  {search && filteredSkills.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 border border-ink/10 rounded-lg">
                      {filteredSkills.slice(0, 20).map(s => (
                        <button
                          key={s.id}
                          onClick={() => { handleAddSkill(s.id); setSearch('') }}
                          disabled={saving}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-ink/5 text-left text-sm text-ink/80 transition-colors"
                        >
                          <span>{s.name}</span>
                          <Plus className="w-3.5 h-3.5 text-ink/60" />
                        </button>
                      ))}
                    </div>
                  )}
                  {search && filteredSkills.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-ink/50">No matching skills found.</p>
                      <div className="flex gap-2">
                        <Input
                          value={customSkillName || search}
                          onChange={e => setCustomSkillName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateAndAddSkill() } }}
                          placeholder="Create new skill..."
                          className="bg-white border-ink/20 text-ink h-9 text-xs"
                          disabled={addingCustom}
                        />
                        <button
                          onClick={handleCreateAndAddSkill}
                          disabled={addingCustom || !(customSkillName || search).trim()}
                          className="px-3 h-9 rounded-md border border-ink/30 bg-ink/10 text-ink text-xs font-medium hover:bg-ink/20 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {addingCustom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {userSkills.length === 0 && !search && (
                  <p className="text-sm text-ink/50 text-center py-4">
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
