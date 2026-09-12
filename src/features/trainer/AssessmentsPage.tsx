import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Trash2, Loader2, FileText,
  Save, Send, Target, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

type Course = Database['public']['Tables']['courses']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']
type Question = Database['public']['Tables']['questions']['Row']

interface QuestionForm {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
}

const emptyQuestion: QuestionForm = {
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '',
}

export function AssessmentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionForm>(emptyQuestion)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: a } = await supabase.from('assessments').select('*').eq('course_id', courseId).eq('created_by', user.id).single()
      if (a) {
        setAssessment(a)
        const { data: q } = await supabase.from('questions').select('*').eq('assessment_id', a.id).order('position')
        if (q) setQuestions(q)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateAssessment = async () => {
    if (!user || !courseId) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({ course_id: courseId, title: 'Course Assessment', created_by: user.id, passing_score: course?.passing_score ?? 60 })
        .select()
        .single()
      if (error) throw error
      setAssessment(data)
      toast.success('Assessment created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuestion = async () => {
    if (!assessment) return
    setSaving(true)
    try {
      const qData = {
        assessment_id: assessment.id,
        question_text: editingQuestion.question_text,
        options: { A: editingQuestion.option_a, B: editingQuestion.option_b, C: editingQuestion.option_c, D: editingQuestion.option_d },
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation || null,
        position: editingQuestionId ? undefined : questions.length + 1,
        approved: false,
      }

      if (editingQuestionId) {
        const { error } = await supabase.from('questions').update(qData).eq('id', editingQuestionId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('questions').insert({ ...qData, position: questions.length + 1 })
        if (error) throw error
      }
      toast.success(editingQuestionId ? 'Question updated' : 'Question added')
      setQuestionDialogOpen(false)
      setEditingQuestion(emptyQuestion)
      setEditingQuestionId(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return
    try {
      await supabase.from('questions').delete().eq('id', id)
      toast.success('Question deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleSubmitForReview = async () => {
    if (!assessment) return
    setSaving(true)
    try {
      await supabase.from('assessments').update({ status: 'pending_review' }).eq('id', assessment.id)
      toast.success('Assessment submitted for review')
      fetchData()
    } catch (err) {
      toast.error('Failed')
    } finally {
      setSaving(false)
    }
  }

  const openEditQuestion = (q: Question) => {
    const opts = q.options as Record<string, string>
    setEditingQuestion({
      question_text: q.question_text,
      option_a: opts.A || '', option_b: opts.B || '', option_c: opts.C || '', option_d: opts.D || '',
      correct_answer: q.correct_answer, explanation: q.explanation ?? '',
    })
    setEditingQuestionId(q.id)
    setQuestionDialogOpen(true)
  }

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white">Assessment Builder</h2>
          <p className="text-slate-400 text-sm mt-1">{course?.title}</p>
        </motion.div>

        {!assessment ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="font-semibold text-lg text-white mb-1">No assessment yet</h3>
                <p className="text-slate-400 text-sm mb-4">Create an assessment for this course.</p>
                <Button onClick={handleCreateAssessment} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Assessment
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{assessment.title}</h3>
                <p className="text-xs text-slate-500">{questions.length} questions | Passing: {assessment.passing_score}%</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingQuestion(emptyQuestion); setEditingQuestionId(null); setQuestionDialogOpen(true) }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
                <Button onClick={handleSubmitForReview} disabled={saving || questions.length === 0} variant="outline" className="border-white/10 text-white">
                  <Send className="w-4 h-4 mr-2" /> Submit for Review
                </Button>
              </div>
            </motion.div>

            {questions.length === 0 ? (
              <motion.div variants={fadeUp}>
                <Card className="bg-white/[0.02] border-white/[0.06]">
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-400">No questions yet. Add your first question.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="space-y-3">
                {questions.map((q, i) => {
                  const opts = q.options as Record<string, string>
                  return (
                    <div key={q.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium mb-2">
                            <span className="text-cyan-400 mr-2">Q{i + 1}.</span>
                            {q.question_text}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <div key={opt} className={`px-3 py-2 rounded-lg border ${
                                q.correct_answer === opt
                                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
                                  : 'bg-white/[0.03] border-white/[0.06] text-slate-400'
                              }`}>
                                <span className="font-medium mr-1">{opt}.</span> {opts[opt]}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-slate-500 mt-2 italic">Explanation: {q.explanation}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditQuestion(q)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </>
        )}

        <Dialog open={questionDialogOpen} onOpenChange={(o) => { if (!o) { setQuestionDialogOpen(false); setEditingQuestionId(null) } }}>
          <DialogContent className="max-w-lg bg-[#0a0f1e] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">{editingQuestionId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Question *</Label>
                <Textarea value={editingQuestion.question_text} onChange={e => setEditingQuestion(p => ({ ...p, question_text: e.target.value }))} rows={3} className="bg-white/5 border-white/10 text-white" />
              </div>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt} className="space-y-1.5">
                  <Label className="text-slate-300">Option {opt} *</Label>
                  <Input value={editingQuestion[`option_${opt.toLowerCase()}` as keyof QuestionForm] as string}
                    onChange={e => setEditingQuestion(p => ({ ...p, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Correct Answer</Label>
                  <select value={editingQuestion.correct_answer}
                    onChange={e => setEditingQuestion(p => ({ ...p, correct_answer: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm">
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Explanation</Label>
                  <Input value={editingQuestion.explanation} onChange={e => setEditingQuestion(p => ({ ...p, explanation: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">Correct answers are hidden from trainees.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setQuestionDialogOpen(false); setEditingQuestionId(null) }} className="border-white/10 text-white">Cancel</Button>
              <Button onClick={handleSaveQuestion} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingQuestionId ? 'Update' : 'Add'} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TrainerLayout>
  )
}
