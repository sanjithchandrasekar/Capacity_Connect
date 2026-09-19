import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, Trash2, Loader2, FileText,
  Save, Send, Target, AlertCircle, Calendar, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionForm>(emptyQuestion)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false)
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null)
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    assessment_type: 'final',
    requires_sea: false,
    sea_link: '',
    scheduled_date: '',
    start_time: '',
    end_time: ''
  })

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: aList } = await supabase.from('assessments').select('*').eq('course_id', courseId).order('created_at')
      if (aList) setAssessments(aList)
      
      if (selectedAssessmentId) {
        const { data: q } = await supabase.from('questions').select('*').eq('assessment_id', selectedAssessmentId).order('position')
        if (q) setQuestions(q)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId, selectedAssessmentId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveAssessment = async () => {
    if (!user || !courseId) return
    
    if (assessmentForm.scheduled_date && course) {
      const testDate = new Date(assessmentForm.scheduled_date)
      const courseStart = course.start_date ? new Date(course.start_date) : null
      const courseEnd = course.end_date ? new Date(course.end_date) : null
      
      if (courseStart && testDate < courseStart) {
        toast.error('Test date cannot be before course start date')
        return
      }
      if (courseEnd && testDate > courseEnd) {
        toast.error('Test date cannot be after course end date')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        title: assessmentForm.title || `${assessmentForm.assessment_type} Test`,
        assessment_type: assessmentForm.assessment_type,
        requires_sea: assessmentForm.requires_sea,
        sea_link: assessmentForm.requires_sea ? assessmentForm.sea_link : null,
        scheduled_date: assessmentForm.scheduled_date || null,
        start_time: assessmentForm.start_time ? new Date(assessmentForm.start_time).toISOString() : null,
        end_time: assessmentForm.end_time ? new Date(assessmentForm.end_time).toISOString() : null,
      }

      if (editingAssessmentId) {
        const { error } = await supabase.from('assessments').update(payload).eq('id', editingAssessmentId)
        if (error) throw error
        toast.success('Assessment updated')
      } else {
        const { error } = await supabase.from('assessments').insert({ 
          ...payload, 
          course_id: courseId, 
          created_by: user.id, 
          passing_score: course?.passing_score ?? 60 
        })
        if (error) throw error
        toast.success('Assessment created')
      }
      setAssessmentDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assessment')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Delete this assessment and all its questions?')) return
    try {
      await supabase.from('assessments').delete().eq('id', id)
      toast.success('Assessment deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete assessment')
    }
  }

  const handleSaveQuestion = async () => {
    if (!selectedAssessment) return
    setSaving(true)
    try {
      const qData = {
        assessment_id: selectedAssessment.id,
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
    if (!selectedAssessment) return
    setSaving(true)
    try {
      await supabase.from('assessments').update({ status: 'pending_review' }).eq('id', selectedAssessment.id)
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

  const openNewAssessmentDialog = () => {
    setEditingAssessmentId(null)
    setAssessmentForm({
      title: '', assessment_type: 'final', requires_sea: false, sea_link: '', scheduled_date: '', start_time: '', end_time: ''
    })
    setAssessmentDialogOpen(true)
  }

  const openEditAssessmentDialog = (a: Assessment) => {
    setEditingAssessmentId(a.id)
    setAssessmentForm({
      title: a.title,
      assessment_type: a.assessment_type || 'final',
      requires_sea: a.requires_sea || false,
      sea_link: a.sea_link || '',
      scheduled_date: a.scheduled_date || '',
      start_time: a.start_time || '',
      end_time: a.end_time || '',
    })
    setAssessmentDialogOpen(true)
  }

  if (loading && !assessments.length) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        
        {/* LIST VIEW */}
        {!selectedAssessmentId ? (
          <>
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <div>
                <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back to Course
                </Link>
                <h2 className="text-2xl font-bold tracking-tight text-ink">Tests & Assessments</h2>
                <p className="text-ink/60 text-sm mt-1">{course?.title}</p>
              </div>
              <Button onClick={openNewAssessmentDialog} className="bg-ink hover:bg-ink/90 text-cream">
                <Plus className="w-4 h-4 mr-2" /> Create Test
              </Button>
            </motion.div>

            {assessments.length === 0 ? (
              <motion.div variants={fadeUp}>
                <Card className="bg-white border-ink/10">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Target className="h-12 w-12 text-ink/40 mb-4" />
                    <h3 className="font-semibold text-lg text-ink mb-1">No tests yet</h3>
                    <p className="text-ink/60 text-sm mb-4">Create mock tests, daily assessments, and final exams.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="space-y-4">
                {assessments.map((a) => (
                  <Card key={a.id} className="bg-white border-ink/10 hover:border-ink/20 transition-all overflow-hidden group">
                    <CardHeader className="bg-ink/5 border-b border-ink/5 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize text-[10px]">{a.assessment_type} Test</Badge>
                            {a.requires_sea && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[10px]">SEA Enabled</Badge>}
                            <CardTitle className="text-lg text-ink">{a.title}</CardTitle>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/70">
                            {a.scheduled_date && (
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(a.scheduled_date).toLocaleDateString()}</span>
                            )}
                            {a.start_time && (
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {format(new Date(a.start_time), 'h:mm a')} - {a.end_time ? format(new Date(a.end_time), 'h:mm a') : 'TBD'}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditAssessmentDialog(a)}>Settings</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteAssessment(a.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bg-white flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-ink">Status: <span className="capitalize">{a.status.replace('_', ' ')}</span></p>
                      </div>
                      <Button onClick={() => setSelectedAssessmentId(a.id)} className="bg-ink text-cream hover:bg-ink/90">
                        Manage Questions
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </>
        ) : (
          /* DETAIL VIEW (Question Builder) */
          <>
            <motion.div variants={fadeUp}>
              <button onClick={() => setSelectedAssessmentId(null)} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Assessments
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-ink">{selectedAssessment?.title}</h2>
                    <Badge variant="outline" className="capitalize text-[10px] py-0">{selectedAssessment?.assessment_type}</Badge>
                  </div>
                  <p className="text-xs text-ink/50 mt-1">{questions.length} questions | Passing: {selectedAssessment?.passing_score}%</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setEditingQuestion(emptyQuestion); setEditingQuestionId(null); setQuestionDialogOpen(true) }}
                    className="bg-ink hover:bg-ink/90 text-cream">
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </Button>
                  <Button onClick={handleSubmitForReview} disabled={saving || questions.length === 0} variant="outline" className="border-ink/20 text-ink">
                    <Send className="w-4 h-4 mr-2" /> Submit for Review
                  </Button>
                </div>
              </div>
            </motion.div>

            {questions.length === 0 ? (
              <motion.div variants={fadeUp}>
                <Card className="bg-white border-ink/10">
                  <CardContent className="py-12 text-center">
                    <p className="text-ink/60">No questions yet. Add your first question.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="space-y-3">
                {questions.map((q, i) => {
                  const opts = q.options as Record<string, string>
                  return (
                    <div key={q.id} className="p-4 rounded-xl bg-white border border-ink/10 hover:border-ink/20 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-ink font-medium mb-2">
                            <span className="text-ink mr-2">Q{i + 1}.</span>
                            {q.question_text}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <div key={opt} className={`px-3 py-2 rounded-lg border ${
                                q.correct_answer === opt
                                  ? 'bg-ink/10 border-ink/30 text-ink'
                                  : 'bg-ink/5 border-ink/10 text-ink/60'
                              }`}>
                                <span className="font-medium mr-1">{opt}.</span> {opts[opt]}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-ink/50 mt-2 italic">Explanation: {q.explanation}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditQuestion(q)} className="p-1.5 rounded-lg hover:bg-ink/5 text-ink/60 hover:text-ink transition-all">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-ink/60 hover:text-red-600 transition-all">
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

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={(o) => { if (!o) { setQuestionDialogOpen(false); setEditingQuestionId(null) } }}>
          <DialogContent className="max-w-lg bg-white border-ink/20">
            <DialogHeader>
              <DialogTitle className="text-ink">{editingQuestionId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-ink/80">Question *</Label>
                <Textarea value={editingQuestion.question_text} onChange={e => setEditingQuestion(p => ({ ...p, question_text: e.target.value }))} rows={3} className="bg-ink/5 border-ink/20 text-ink" />
              </div>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt} className="space-y-1.5">
                  <Label className="text-ink/80">Option {opt} *</Label>
                  <Input value={editingQuestion[`option_${opt.toLowerCase()}` as keyof QuestionForm] as string}
                    onChange={e => setEditingQuestion(p => ({ ...p, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                    className="bg-ink/5 border-ink/20 text-ink" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-ink/80">Correct Answer</Label>
                  <select value={editingQuestion.correct_answer}
                    onChange={e => setEditingQuestion(p => ({ ...p, correct_answer: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-ink/5 border border-ink/20 text-ink text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ink/30">
                    <option value="A" className="bg-white text-ink">A</option>
                    <option value="B" className="bg-white text-ink">B</option>
                    <option value="C" className="bg-white text-ink">C</option>
                    <option value="D" className="bg-white text-ink">D</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-ink/80">Explanation</Label>
                  <Input value={editingQuestion.explanation} onChange={e => setEditingQuestion(p => ({ ...p, explanation: e.target.value }))} className="bg-ink/5 border-ink/20 text-ink" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setQuestionDialogOpen(false); setEditingQuestionId(null) }} className="border-ink/20 text-ink">Cancel</Button>
              <Button onClick={handleSaveQuestion} disabled={saving} className="bg-ink hover:bg-ink/90 text-cream">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingQuestionId ? 'Update' : 'Add'} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assessment Settings Dialog */}
        <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white border-ink/10">
            <DialogHeader>
              <DialogTitle className="text-ink">{editingAssessmentId ? 'Edit Test Details' : 'New Test / Assessment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-ink/80">Title</Label>
                <Input value={assessmentForm.title} onChange={e => setAssessmentForm({...assessmentForm, title: e.target.value})} placeholder="e.g. Midterm Mock Test" className="bg-ink/5 border-ink/20 text-ink h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-ink/80">Assessment Type</Label>
                <Select value={assessmentForm.assessment_type} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, assessment_type: v })}>
                  <SelectTrigger className="bg-ink/5 border-ink/20 text-ink"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Assessment</SelectItem>
                    <SelectItem value="mock">Mock Test</SelectItem>
                    <SelectItem value="final">Final Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-ink/80">Scheduled Date</Label>
                <Input type="date" value={assessmentForm.scheduled_date} onChange={e => setAssessmentForm({...assessmentForm, scheduled_date: e.target.value})} className="bg-ink/5 border-ink/20 text-ink h-9" />
                {course && <p className="text-[10px] text-ink/50">Must be between {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'start'} and {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'end'} of course.</p>}
              </div>

              {assessmentForm.assessment_type !== 'daily' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-ink/80">Start Time</Label>
                      <Input type="time" value={assessmentForm.start_time} onChange={e => setAssessmentForm({...assessmentForm, start_time: e.target.value})} className="bg-ink/5 border-ink/20 text-ink h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-ink/80">End Time</Label>
                      <Input type="time" value={assessmentForm.end_time} onChange={e => setAssessmentForm({...assessmentForm, end_time: e.target.value})} className="bg-ink/5 border-ink/20 text-ink h-9" />
                    </div>
                  </div>
                  {assessmentForm.start_time && assessmentForm.end_time && (
                    <div className="text-xs font-medium text-ink/70">
                      Duration: <span className="text-brand">
                        {(() => {
                          const [startH, startM] = assessmentForm.start_time.split(':').map(Number);
                          const [endH, endM] = assessmentForm.end_time.split(':').map(Number);
                          let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
                          if (diffMins < 0) diffMins += 24 * 60;
                          const h = Math.floor(diffMins / 60);
                          const m = diffMins % 60;
                          return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}` || '0m';
                        })()}
                      </span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center space-x-2 border border-ink/10 p-3 rounded-lg bg-ink/5 mt-4">
                <input 
                  type="checkbox" 
                  id="requires_sea" 
                  className="w-4 h-4 rounded border-ink/20 text-ink focus:ring-ink"
                  checked={assessmentForm.requires_sea}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, requires_sea: e.target.checked })}
                />
                <Label htmlFor="requires_sea" className="text-ink font-medium cursor-pointer flex-1">Require SEA (Secure Enable App)</Label>
              </div>

              {assessmentForm.requires_sea && (
                <div className="space-y-1.5 pl-6 border-l-2 border-ink/10 ml-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-ink/80 text-xs">SEA Link</Label>
                  <Input 
                    value={assessmentForm.sea_link}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, sea_link: e.target.value })}
                    placeholder="https://..." 
                    className="bg-ink/5 border-ink/20 text-ink h-9" 
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)} className="border-ink/20 text-ink">Cancel</Button>
              <Button onClick={handleSaveAssessment} disabled={saving} className="bg-ink hover:bg-ink/90 text-cream">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TrainerLayout>
  )
}
