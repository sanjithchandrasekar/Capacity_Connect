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
  Save, Send, Target, AlertCircle, Calendar, Clock, Brain
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useConfirm } from '@/hooks/useConfirm'

type Course = Database['public']['Tables']['courses']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']
type Question = Database['public']['Tables']['questions']['Row']
type Material = Database['public']['Tables']['materials']['Row']

interface QuestionForm {
  question_type: 'mcq' | 'open_ended'
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const emptyQuestion: QuestionForm = {
  question_type: 'mcq', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', explanation: '', difficulty: 'medium'
}

export function AssessmentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [attemptsStats, setAttemptsStats] = useState<{ total: number, passRatio: number, avgScore: number } | null>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'questions' | 'grading'>('questions')
  const [gradingAttemptId, setGradingAttemptId] = useState<string | null>(null)
  const [gradingScore, setGradingScore] = useState<number>(0)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionForm>(emptyQuestion)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false)
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null)
  const [ConfirmDialog, confirm] = useConfirm()

  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    assessment_type: 'final' as 'daily' | 'mock' | 'final' | 'assessment',
    requires_sea: true,
    is_adaptive: false,
    is_simulation: false,
    simulation_dataset_url: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    results_publish_date: '',
  })

  const [aiGenDialogOpen, setAiGenDialogOpen] = useState(false)
  const [aiGenForm, setAiGenForm] = useState({ type: 'daily_test', topic: '', material_ids: [] as string[], count: 5, difficulty: 'mixed' })

  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId)

  const cleanTitle = (raw: string | undefined) => {
    if (!raw) return '';
    return raw
      .replace(/\.[a-zA-Z0-9]{2,5}(\s|$)/g, '$1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: aList } = await supabase.from('assessments').select('*').eq('course_id', courseId).eq('created_by', user.id).order('created_at')
      if (aList) setAssessments(aList)
      
      if (selectedAssessmentId) {
        const { data: q } = await supabase.from('questions').select('*').eq('assessment_id', selectedAssessmentId).order('position')
        if (q) setQuestions(q)

        const { data: att } = await supabase.from('assessment_attempts' as any).select('*, profiles(first_name, last_name)').eq('assessment_id', selectedAssessmentId).order('submitted_at', { ascending: false })
        if (att && att.length > 0) {
           setAttempts(att)
           const total = att.length;
           const passed = att.filter((d: any) => d.passed).length;
           const passRatio = Math.round((passed / total) * 100);
           const avgScore = Math.round(att.reduce((acc: any, curr: any) => acc + (curr.score || 0), 0) / total);
           setAttemptsStats({ total, passRatio, avgScore });
        } else {
           setAttempts([])
           setAttemptsStats(null);
        }
      } else {
         setAttempts([])
         setAttemptsStats(null);
      }
      
      const { data: mList } = await supabase.from('materials').select('*').eq('course_id', courseId).order('created_at', { ascending: false })
      if (mList) setMaterials(mList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId, selectedAssessmentId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGradeAttempt = async (attemptId: string) => {
    if (gradingScore < 0 || gradingScore > 100) {
      toast.error('Score must be between 0 and 100')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('assessment_attempts' as any)
        .update({ score: gradingScore, passed: gradingScore >= (selectedAssessment?.passing_score ?? 60), grade_status: 'graded' })
        .eq('id', attemptId)
      
      if (error) throw error
      toast.success('Attempt graded successfully')
      setGradingAttemptId(null)
      fetchData()
    } catch(err: any) {
      toast.error(err.message || 'Failed to grade attempt')
    } finally {
      setSaving(false)
    }
  }

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
        status: 'draft' as const,
        requires_sea: assessmentForm.requires_sea,
        is_adaptive: assessmentForm.is_adaptive,
        is_simulation: assessmentForm.is_simulation,
        simulation_dataset_url: assessmentForm.simulation_dataset_url || null,
        scheduled_date: assessmentForm.scheduled_date || null,
        start_time: assessmentForm.start_time ? new Date(assessmentForm.start_time).toISOString() : null,
        end_time: assessmentForm.end_time ? new Date(assessmentForm.end_time).toISOString() : null,
        results_publish_date: assessmentForm.results_publish_date ? new Date(assessmentForm.results_publish_date).toISOString() : null,
      }

      if (editingAssessmentId) {
        const { error } = await supabase.from('assessments').update(payload as any).eq('id', editingAssessmentId)
        if (error) throw error
        toast.success('Assessment updated')
      } else {
        const { error } = await supabase.from('assessments').insert({ 
          ...payload, 
          course_id: courseId, 
          created_by: user.id, 
          passing_score: course?.passing_score ?? 60 
        } as any)
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
    const isConfirmed = await confirm('Are you sure you want to delete this assessment and all its questions?', 'Delete Assessment')
    if (!isConfirmed) return

    try {
      // Clean up dependencies first to satisfy foreign key constraints
      await supabase.from('assessment_attempts').delete().eq('assessment_id', id)
      await supabase.from('questions').delete().eq('assessment_id', id)
      
      const { error } = await supabase.from('assessments').delete().eq('id', id)
      if (error) throw error
      
      toast.success('Assessment deleted')
      setAssessments(prev => prev.filter(a => a.id !== id))
      fetchData()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast.error(err.message || 'Failed to delete assessment')
    }
  }

  const handleSaveQuestion = async () => {
    if (!selectedAssessment) return
    setSaving(true)
    try {
      const qData = {
        assessment_id: selectedAssessment.id,
        question_type: editingQuestion.question_type,
        question_text: editingQuestion.question_text,
        options: editingQuestion.question_type === 'mcq' ? { A: editingQuestion.option_a, B: editingQuestion.option_b, C: editingQuestion.option_c, D: editingQuestion.option_d } : {},
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation || null,
        difficulty: editingQuestion.difficulty,
        position: editingQuestionId ? undefined : questions.length + 1,
        approved: false,
      }

      if (editingQuestionId) {
        const { error } = await supabase.from('questions').update(qData as any).eq('id', editingQuestionId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('questions').insert({ ...qData, position: questions.length + 1 } as any)
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
    const isConfirmed = await confirm('Are you sure you want to delete this question?', 'Delete Question')
    if (!isConfirmed) return

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
      if (selectedAssessment.assessment_type === 'final') {
        await supabase.from('assessments').update({ status: 'pending_review' }).eq('id', selectedAssessment.id)
        toast.success('Final Exam submitted to Admin for review')
      } else {
        await supabase.from('assessments').update({ status: 'published' }).eq('id', selectedAssessment.id)
        
        // Notify enrolled trainees
        const { data: enrollments } = await supabase.from('enrollments').select('user_id').eq('course_id', selectedAssessment.course_id).eq('status', 'enrolled')
        if (enrollments && enrollments.length > 0) {
            const notifications = enrollments.map(e => ({
                user_id: e.user_id,
                type: 'assessment',
                title: 'New Assessment Published',
                message: `A new assessment "${cleanTitle(selectedAssessment.title)}" is available for ${course?.title || 'your course'}.`,
            }))
            await supabase.from('notifications').insert(notifications as any)
        }

        toast.success('Assessment approved and published! Trainees notified.')
      }
      fetchData()
    } catch (err) {
      toast.error('Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleAIGenerate = async () => {
    if (aiGenForm.material_ids.length === 0 && !aiGenForm.topic) { 
      toast.error('Please enter a topic or select at least one material'); 
      return; 
    }
    setSaving(true)
    try {
      const allKeys = (import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || '')
        .split(',').map((k: string) => k.trim()).filter(Boolean);
      if (!allKeys.length) throw new Error("Missing Gemini API Key in .env.local");
      
      let contextStr = "";
      let testTitle = aiGenForm.topic ? `${aiGenForm.topic} Test` : "AI Generated Test";

      let inlineData: { mimeType: string, data: string } | null = null;

      if (aiGenForm.material_ids.length > 0) {
        const selectedMaterials = materials.filter(m => aiGenForm.material_ids.includes(m.id));
        if (!aiGenForm.topic && selectedMaterials.length === 1) {
          testTitle = `${selectedMaterials[0].file_name} Test`;
        } else if (!aiGenForm.topic && selectedMaterials.length > 1) {
          testTitle = `Combined Materials Test`;
        }

        const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });

        const combinedTexts: string[] = [];
        for (const mat of selectedMaterials) {
          if (mat.extracted_text) {
            combinedTexts.push(`--- ${mat.file_name} ---\n${mat.extracted_text.substring(0, Math.floor(15000 / selectedMaterials.length))}`);
          } else if (mat.storage_path) {
            if (selectedMaterials.length === 1) {
              // For a single file with no extracted text, send inline to Gemini
              const { data: fileBlob, error: downloadError } = await supabase.storage.from('materials').download(mat.storage_path);
              if (!downloadError && fileBlob) {
                try {
                  const base64data = await toBase64(fileBlob);
                  inlineData = { mimeType: fileBlob.type || 'application/pdf', data: base64data };
                  combinedTexts.push(`--- ${mat.file_name} ---\n(File attached for AI to read directly)`);
                } catch {
                  combinedTexts.push(`--- ${mat.file_name} ---`);
                }
              } else {
                combinedTexts.push(`--- ${mat.file_name} ---`);
              }
            } else {
              combinedTexts.push(`--- ${mat.file_name} ---`);
            }
          } else {
            combinedTexts.push(`--- ${mat.file_name} ---`);
          }
        }
        contextStr = `\n\nCOURSE MATERIAL CONTENT FOR CONTEXT:\n========================\n${combinedTexts.join('\n\n')}\n========================\n`;
      }

      const baseTopic = aiGenForm.topic ? `about the following topic: "${aiGenForm.topic}"` : "based primarily on the provided course material";
      
      // System prompt for generating assessment
      const prompt = `You are an expert educator. Generate a strictly formatted JSON array of ${aiGenForm.count} multiple-choice questions ${baseTopic}. ${contextStr}
      The difficulty of these questions should be: ${aiGenForm.difficulty}.
      The JSON must be an array of objects where each object has:
      - "question_text" (string)
      - "options" (object with keys "A", "B", "C", "D" mapped to string answers)
      - "correct_answer" (string: "A", "B", "C", or "D")
      - "explanation" (string: brief explanation of why the answer is correct)
      - "difficulty" (string: exactly "easy", "medium", or "hard")
      Only return the raw JSON array. Do not include markdown code blocks.`;

      const parts: any[] = [{ text: prompt }];
      if (inlineData) {
          parts.push({ inlineData });
      }

      let text = '';
      let jsonRes = null;
      let lastError = null;
      const shuffledKeys = [...allKeys].sort(() => Math.random() - 0.5);

      // Try each key, with a 2-second delay if we hit a rate limit (429) to let the API recover
      for (const currentKey of shuffledKeys) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${currentKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { temperature: 0.7 }
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`GEMINI API ERROR (${response.status}) for a key, trying next if available...`, errorText);
            lastError = new Error(`Failed to reach Gemini API: ${response.status} - ${errorText.substring(0,100)}`);
            if (response.status === 429 || response.status === 503) {
              await new Promise(r => setTimeout(r, 2000)); // wait 2s before trying next key
              continue; // Try next key
            }
            throw lastError; // Non-retryable error
          }
          
          jsonRes = await response.json();
          text = jsonRes.candidates[0].content.parts[0].text;
          break; // Success
        } catch (e) {
          lastError = e;
        }
      }

      // If Gemini completely fails (e.g. quota exhausted), fallback to Groq!
      if (!text) {
        console.warn("All Gemini keys failed. Falling back to Groq...", lastError);
        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!groqKey) {
            throw lastError || new Error("All Gemini API keys failed and no Groq fallback key found.");
        }
        
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an expert educator that generates multiple choice quiz questions in strict JSON format.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });
        
        if (!groqResponse.ok) {
            const groqErr = await groqResponse.text();
            console.error('Groq API error:', groqErr);
            throw new Error(`AI Generation failed on both Gemini and Groq. Groq error: ${groqResponse.status} - ${groqErr.substring(0, 150)}`);
        }
        
        const groqData = await groqResponse.json();
        text = groqData.choices?.[0]?.message?.content || "";
        if (!text) throw new Error("Groq returned empty response");
      }

      // Clean up markdown formatting if AI includes it
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      let generatedQuestions = [];
      try {
        generatedQuestions = JSON.parse(text);
        if (generatedQuestions && !Array.isArray(generatedQuestions)) {
            const arrayProp = Object.values(generatedQuestions).find(Array.isArray);
            if (arrayProp) generatedQuestions = arrayProp;
            else throw new Error("Expected an array of questions");
        }
      } catch (e) {
         console.error("Failed to parse AI JSON:", text);
         throw new Error("AI returned invalid JSON format.");
      }

      // Map form type value to DB column value
      const typeMap: Record<string, string> = {
        'daily_test': 'daily',
        'mock_test': 'mock',
        'assessment_test': 'assessment',
        'final': 'final',
      };
      const dbType = typeMap[aiGenForm.type] || 'daily';

      // Create Assessment record
      const { data: assessment, error: assessmentError } = await supabase.from('assessments').insert({
        course_id: courseId || '',
        title: testTitle,
        assessment_type: dbType,
        requires_sea: true,
        created_by: user?.id || '',
        passing_score: course?.passing_score ?? 60,
        status: 'draft'
      }).select().single();

      if (assessmentError) throw assessmentError;

      // Insert questions
      const questionsToInsert = generatedQuestions.map((q: any, i: number) => ({
        assessment_id: assessment.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty && ['easy', 'medium', 'hard'].includes(q.difficulty.toLowerCase()) ? q.difficulty.toLowerCase() : 'medium',
        position: i + 1,
        approved: false
      }));

      const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);
      if (questionsError) throw questionsError;

      toast.success('Assessment generated successfully!')
      setAiGenDialogOpen(false)
      setAiGenForm({ type: 'daily_test', topic: '', material_ids: [], count: 5, difficulty: 'mixed' })
      fetchData()
    } catch (err) {
      console.error(err);
      toast.error((err as any)?.message || (err as any)?.details || String(err) || 'Failed to generate assessment.')
    } finally {
      setSaving(false)
    }
  }

  const openEditQuestion = (q: Question) => {
    const opts = (q.options as Record<string, string>) || {}
    setEditingQuestion({
      question_type: ((q as any).question_type as 'mcq'|'open_ended') || 'mcq',
      question_text: q.question_text,
      option_a: opts.A || '', option_b: opts.B || '', option_c: opts.C || '', option_d: opts.D || '',
      correct_answer: q.correct_answer, explanation: q.explanation ?? '',
      difficulty: ((q as any).difficulty as 'easy'|'medium'|'hard') || 'medium',
    })
    setEditingQuestionId(q.id)
    setQuestionDialogOpen(true)
  }

  const openNewAssessmentDialog = () => {
    setEditingAssessmentId(null)
    setAssessmentForm({
      title: '', assessment_type: 'final', requires_sea: true, scheduled_date: '', start_time: '', end_time: '', results_publish_date: '',
      is_adaptive: false, is_simulation: false, simulation_dataset_url: ''
    })
    setAssessmentDialogOpen(true)
  }

  const openEditAssessmentDialog = (a: Assessment) => {
    setEditingAssessmentId(a.id)
    setAssessmentForm({
      title: a.title,
      assessment_type: (a.assessment_type || 'final') as 'daily' | 'mock' | 'final',
      requires_sea: a.requires_sea,
      scheduled_date: a.scheduled_date ? new Date(a.scheduled_date).toISOString().slice(0, 10) : '',
      start_time: a.start_time || '',
      end_time: a.end_time || '',
      results_publish_date: (a as any).results_publish_date ? new Date((a as any).results_publish_date).toISOString().slice(0, 10) : '',
      is_adaptive: (a as any).is_adaptive || false,
      is_simulation: (a as any).is_simulation || false,
      simulation_dataset_url: (a as any).simulation_dataset_url || ''
    })
    setAssessmentDialogOpen(true)
  }

  if (loading && !assessments.length) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-600" /></div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <ConfirmDialog />
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        
        {/* LIST VIEW */}
        {!selectedAssessmentId ? (
          <>
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <div>
                <Link to={`/trainer/courses/${courseId}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors mb-4 font-medium">
                  <ArrowLeft className="w-4 h-4" /> Back to Course
                </Link>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Tests & Assessments</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">{course?.title}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setAiGenDialogOpen(true)} variant="outline" className="border-cyan-200 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 font-bold rounded-xl">
                  <Brain className="w-4 h-4 mr-2 text-cyan-600" /> Auto-Generate with AI
                </Button>
                <Button onClick={openNewAssessmentDialog} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md shadow-cyan-600/10">
                  <Plus className="w-4 h-4 mr-2" /> Create Test
                </Button>
              </div>
            </motion.div>

            {assessments.length === 0 ? (
              <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* AI Generation Card */}
                <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="relative overflow-hidden group border border-cyan-200 hover:border-cyan-400 shadow-sm hover:shadow-lg h-full cursor-pointer bg-gradient-to-br from-white to-cyan-50/50 rounded-3xl" onClick={() => setAiGenDialogOpen(true)}>
                    <CardContent className="p-8 relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 border border-cyan-200 shadow-sm text-cyan-600">
                          <Brain className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Auto-Generate with AI</h3>
                        <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
                          Instantly generate a complete, high-quality assessment tailored perfectly to your course content, objectives, and desired difficulty level.
                        </p>
                      </div>
                      <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-95 shadow-md font-bold text-sm h-12 rounded-xl">
                        <Brain className="w-4 h-4 mr-2" /> Start AI Generation
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Manual Creation Card */}
                <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="relative overflow-hidden group border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-lg h-full cursor-pointer bg-white rounded-3xl" onClick={openNewAssessmentDialog}>
                    <CardContent className="p-8 relative z-10 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-14 h-14 bg-slate-100 text-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-200">
                          <Plus className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Create Manually</h3>
                        <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
                          Build your assessment from scratch. Define your own questions, options, and passing criteria with absolute precision and control.
                        </p>
                      </div>
                      <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm h-12 rounded-xl">
                        Create Blank Test
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="space-y-4">
                {assessments.map((a) => (
                  <Card key={a.id} className="bg-white border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden rounded-3xl group">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize text-[10px] bg-white border-slate-200 text-slate-700">{a.assessment_type} Test</Badge>
                            {a.requires_sea && <Badge className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 text-[10px]">SEA Enabled</Badge>}
                            <CardTitle className="text-lg text-slate-900 font-bold">{cleanTitle(a.title)}</CardTitle>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 font-medium">
                            {a.scheduled_date && (
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(a.scheduled_date).toLocaleDateString()}</span>
                            )}
                            {a.start_time && (
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> {format(new Date(a.start_time), 'h:mm a')} - {a.end_time ? format(new Date(a.end_time), 'h:mm a') : 'TBD'}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditAssessmentDialog(a)} className="text-slate-600 hover:text-slate-900">Settings</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteAssessment(a.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 bg-white flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Status: <span className="capitalize text-slate-900">{a.status.replace('_', ' ')}</span></p>
                      </div>
                      <Button onClick={() => setSelectedAssessmentId(a.id)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
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
              <button onClick={() => setSelectedAssessmentId(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors mb-4 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Assessments
              </button>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">{cleanTitle(selectedAssessment?.title)}</h2>
                    <Badge variant="outline" className="capitalize text-[10px] py-0 border-slate-200">{selectedAssessment?.assessment_type}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{questions.length} questions | Passing: {selectedAssessment?.passing_score}%</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setEditingQuestion(emptyQuestion); setEditingQuestionId(null); setQuestionDialogOpen(true) }}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </Button>
                  <Button onClick={handleSubmitForReview} disabled={saving || questions.length === 0} variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">
                    <Send className="w-4 h-4 mr-2" /> {selectedAssessment?.assessment_type === 'final' ? 'Submit for Admin Review' : 'Approve & Publish'}
                  </Button>
                </div>
              </div>

              {/* Analytics Dashboard */}
              {attemptsStats && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-center items-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Attempts</p>
                    <p className="text-2xl font-black text-slate-900">{attemptsStats.total}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-center items-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Average Score</p>
                    <p className="text-2xl font-black text-cyan-600">{attemptsStats.avgScore}%</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-center items-center">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Pass Ratio</p>
                    <p className={`text-2xl font-black ${attemptsStats.passRatio >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{attemptsStats.passRatio}%</p>
                  </div>
                </div>
              )}
            </motion.div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 mb-6">
                <button 
                  onClick={() => setActiveTab('questions')}
                  className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'questions' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Questions
                </button>
                <button 
                  onClick={() => setActiveTab('grading')}
                  className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'grading' ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Grading Queue
                  {attempts.filter(a => a.grade_status === 'pending_manual').length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-rose-500 text-white text-[10px] rounded-full font-bold">
                      {attempts.filter(a => a.grade_status === 'pending_manual').length}
                    </span>
                  )}
                </button>
              </div>

            {activeTab === 'questions' ? (
              questions.length === 0 ? (
              <motion.div variants={fadeUp}>
                <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl">
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-500 font-medium">No questions yet. Add your first question.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="space-y-3">
                {questions.map((q) => {
                  const opts = q.options as Record<string, string>
                  return (
                    <div key={q.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 text-base mb-1">Q{q.position}. {q.question_text}</h4>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold capitalize mb-3 inline-block">
                            {(q as any).question_type?.replace('_', ' ') || 'Question'}
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(q as any).question_type === 'open_ended' ? (
                               <div className="col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic font-medium">
                                 Open-Ended Question. Reference Answer: {q.correct_answer}
                               </div>
                            ) : (
                               ['A', 'B', 'C', 'D'].map(opt => (
                                <div key={opt} className={`px-3.5 py-2.5 rounded-xl border ${
                                  q.correct_answer === opt
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
                                }`}>
                                  <span className="font-bold mr-1">{opt}.</span> {opts[opt]}
                                </div>
                              ))
                            )}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-slate-500 mt-2.5 italic">Explanation: {q.explanation}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditQuestion(q)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )) : (
              <motion.div variants={fadeUp} className="space-y-4">
                {attempts.length === 0 ? (
                  <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl">
                    <CardContent className="py-12 text-center">
                      <p className="text-slate-500 font-medium">No attempts submitted yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  attempts.map((att) => (
                    <Card key={att.id} className="bg-white border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
                      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3.5 px-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{att.profiles?.first_name} {att.profiles?.last_name}</span>
                            <span className="text-xs text-slate-400 font-medium">{new Date(att.submitted_at).toLocaleString()}</span>
                          </div>
                          <Badge className={att.grade_status === 'pending_manual' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'}>
                            {att.grade_status === 'pending_manual' ? 'Needs Grading' : `Graded: ${att.score}%`}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-5 space-y-6">
                        {questions.filter(q => (q as any).question_type === 'open_ended').map((q) => {
                          const traineeAnswer = att.answers?.[q.id] || 'No answer provided.';
                          return (
                            <div key={q.id} className="space-y-2 border-b border-slate-100 pb-4 last:border-0">
                              <p className="text-sm font-semibold text-slate-900"><span className="text-slate-400 mr-1">Q.</span>{q.question_text}</p>
                              <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-800 font-mono whitespace-pre-wrap border border-slate-200">
                                {traineeAnswer}
                              </div>
                              <div className="bg-emerald-50 p-3 rounded-xl text-xs text-emerald-900 italic border border-emerald-200">
                                <span className="font-bold block mb-1">Reference/Rubric:</span>
                                {q.correct_answer}
                              </div>
                            </div>
                          )
                        })}
                        {att.grade_status === 'pending_manual' && (
                          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                            <Label className="font-bold text-slate-900 whitespace-nowrap">Final Score (0-100):</Label>
                            <Input 
                              type="number" 
                              min="0" max="100" 
                              className="w-24 bg-slate-50 border-slate-200 text-slate-900 rounded-xl"
                              placeholder={att.score?.toString()}
                              value={gradingAttemptId === att.id ? gradingScore : att.score}
                              onChange={(e) => {
                                setGradingAttemptId(att.id)
                                setGradingScore(parseInt(e.target.value) || 0)
                              }}
                            />
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl"
                              onClick={() => handleGradeAttempt(att.id)}
                              disabled={saving || gradingAttemptId !== att.id}
                            >
                              Save Grade
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={(o) => { if (!o) { setQuestionDialogOpen(false); setEditingQuestionId(null) } }}>
          <DialogContent className="max-w-lg bg-white border border-slate-200/90 shadow-2xl rounded-3xl text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-black text-xl">{editingQuestionId ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Question Type</Label>
                <Select value={editingQuestion.question_type} onValueChange={(v: 'mcq' | 'open_ended') => setEditingQuestion(p => ({ ...p, question_type: v }))}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                    <SelectItem value="open_ended">Open-Ended (Text)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Difficulty</Label>
                <Select value={editingQuestion.difficulty} onValueChange={(v: 'easy' | 'medium' | 'hard') => setEditingQuestion(p => ({ ...p, difficulty: v }))}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Question *</Label>
                <Textarea value={editingQuestion.question_text} onChange={e => setEditingQuestion(p => ({ ...p, question_text: e.target.value }))} rows={3} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" />
              </div>

              {editingQuestion.question_type === 'mcq' ? (
                <>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold text-xs">Option {opt} *</Label>
                      <Input value={editingQuestion[`option_${opt.toLowerCase()}` as keyof QuestionForm] as string}
                        onChange={e => setEditingQuestion(p => ({ ...p, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold text-xs">Correct Answer</Label>
                      <select value={editingQuestion.correct_answer}
                        onChange={e => setEditingQuestion(p => ({ ...p, correct_answer: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold text-xs">Explanation</Label>
                      <Input value={editingQuestion.explanation} onChange={e => setEditingQuestion(p => ({ ...p, explanation: e.target.value }))} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" placeholder="Optional" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-xs">Reference Answer / Grading Rubric</Label>
                    <Textarea value={editingQuestion.correct_answer}
                      onChange={e => setEditingQuestion(p => ({ ...p, correct_answer: e.target.value }))}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" rows={3} placeholder="What should a good answer contain?" />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setQuestionDialogOpen(false); setEditingQuestionId(null) }} className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">Cancel</Button>
              <Button onClick={handleSaveQuestion} disabled={saving} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingQuestionId ? 'Update' : 'Add'} Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assessment Settings Dialog */}
        <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white border border-slate-200/90 shadow-2xl rounded-3xl text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-black text-xl">{editingAssessmentId ? 'Edit Test Details' : 'New Test / Assessment'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Title</Label>
                <Input value={assessmentForm.title} onChange={e => setAssessmentForm({...assessmentForm, title: e.target.value})} placeholder="e.g. Midterm Mock Test" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Assessment Type</Label>
                <Select value={assessmentForm.assessment_type} onValueChange={(v) => setAssessmentForm({ ...assessmentForm, assessment_type: v as any })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Assessment</SelectItem>
                    <SelectItem value="mock">Mock Test</SelectItem>
                    <SelectItem value="final">Final Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Scheduled Date</Label>
                <Input type="date" value={assessmentForm.scheduled_date} onChange={e => setAssessmentForm({...assessmentForm, scheduled_date: e.target.value})} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
                {course && <p className="text-[10px] text-slate-500">Must be between {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'start'} and {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'end'} of course.</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Results Publish Date</Label>
                <Input type="date" value={assessmentForm.results_publish_date} onChange={e => setAssessmentForm({...assessmentForm, results_publish_date: e.target.value})} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
                <p className="text-[10px] text-slate-500">If set, trainee marks are hidden until this date.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 border border-cyan-200 p-3 rounded-xl bg-cyan-50/50 mt-2 transition-all">
                  <input 
                    type="checkbox" 
                    id="is_adaptive" 
                    className="w-4 h-4 rounded text-cyan-600 border-cyan-300"
                    checked={assessmentForm.is_adaptive}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, is_adaptive: e.target.checked })}
                  />
                  <Label htmlFor="is_adaptive" className="text-cyan-800 font-bold flex-1 cursor-pointer text-xs">
                    Adaptive MCQ Mode
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-emerald-200 p-3 rounded-xl bg-emerald-50 mt-2 transition-all">
                  <input 
                    type="checkbox" 
                    id="is_simulation" 
                    className="w-4 h-4 rounded text-emerald-600 border-emerald-300"
                    checked={assessmentForm.is_simulation}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, is_simulation: e.target.checked })}
                  />
                  <Label htmlFor="is_simulation" className="text-emerald-800 font-bold flex-1 cursor-pointer text-xs">
                    IMD Simulation Mode
                  </Label>
                </div>
              </div>

              {assessmentForm.is_simulation && (
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs">Dataset URL / Image Link (Optional)</Label>
                  <Input value={assessmentForm.simulation_dataset_url} onChange={e => setAssessmentForm({...assessmentForm, simulation_dataset_url: e.target.value})} placeholder="https://example.com/weather-chart.jpg" className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
                  <p className="text-[10px] text-slate-500">Link to weather chart or dataset to display alongside questions.</p>
                </div>
              )}

              {assessmentForm.assessment_type !== 'daily' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold text-xs">Start Time</Label>
                      <Input type="time" value={assessmentForm.start_time} onChange={e => setAssessmentForm({...assessmentForm, start_time: e.target.value})} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-semibold text-xs">End Time</Label>
                      <Input type="time" value={assessmentForm.end_time} onChange={e => setAssessmentForm({...assessmentForm, end_time: e.target.value})} className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl h-10" />
                    </div>
                  </div>
                  {assessmentForm.start_time && assessmentForm.end_time && (
                    <div className="text-xs font-medium text-slate-600">
                      Duration: <span className="text-cyan-700 font-bold">
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
              
              <div className="flex items-center space-x-2 border border-cyan-200 p-3 rounded-xl bg-cyan-50/50 mt-4 opacity-90 pointer-events-none">
                <input 
                  type="checkbox" 
                  id="requires_sea" 
                  className="w-4 h-4 rounded text-cyan-600 border-cyan-300"
                  checked={true}
                  disabled
                  onChange={() => {}}
                />
                <Label htmlFor="requires_sea" className="text-cyan-800 font-bold flex-1 text-xs">
                  Require SEA (Secure Exam Mode)
                </Label>
              </div>
              <div className="text-xs text-cyan-700 pl-2 font-medium">
                Locked: Secure Exam Mode (SEA) is permanently enabled for all assessments.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssessmentDialogOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl">Cancel</Button>
              <Button onClick={handleSaveAssessment} disabled={saving} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Generation Dialog */}
        <Dialog open={aiGenDialogOpen} onOpenChange={setAiGenDialogOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200/90 shadow-2xl rounded-3xl overflow-hidden p-0 text-slate-900">
            <div className="p-6">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-xl border border-cyan-200 text-cyan-600">
                    <Brain className="w-5 h-5"/> 
                  </div>
                  Auto-Generate Test
                </DialogTitle>
                <p className="text-slate-500 text-sm mt-1 font-medium">Harness AI to instantly create a highly effective assessment.</p>
              </DialogHeader>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Assessment Type</Label>
                  <Select value={aiGenForm.type} onValueChange={v => setAiGenForm({...aiGenForm, type: v})}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_test">Daily Test (Trainer Can Publish)</SelectItem>
                      <SelectItem value="assessment_test">Assessment Test (Trainer Can Publish)</SelectItem>
                      <SelectItem value="mock_test">Mock Test (Trainer Can Publish)</SelectItem>
                      <SelectItem value="final">Final Exam (Requires Admin Approval)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Source Material (Optional)</Label>
                    {materials.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                        onClick={() => {
                          if (aiGenForm.material_ids.length === materials.length) {
                            setAiGenForm({ ...aiGenForm, material_ids: [] })
                          } else {
                            setAiGenForm({ ...aiGenForm, material_ids: materials.map(m => m.id) })
                          }
                        }}
                      >
                        {aiGenForm.material_ids.length === materials.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {materials.length === 0 ? (
                      <p className="text-xs text-slate-400 px-3 py-3">No materials uploaded yet.</p>
                    ) : (
                      materials.map(m => {
                        const checked = aiGenForm.material_ids.includes(m.id)
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors ${
                              checked ? 'bg-cyan-50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const ids = checked
                                  ? aiGenForm.material_ids.filter(id => id !== m.id)
                                  : [...aiGenForm.material_ids, m.id]
                                setAiGenForm({ ...aiGenForm, material_ids: ids })
                              }}
                              className="w-4 h-4 accent-cyan-600 rounded shrink-0"
                            />
                            <span className="text-sm text-slate-800 truncate flex-1">{m.file_name}</span>

                          </label>
                        )
                      })
                    )}
                  </div>
                  {aiGenForm.material_ids.length > 0 && (
                    <p className="text-xs text-cyan-600 font-medium">{aiGenForm.material_ids.length} material{aiGenForm.material_ids.length > 1 ? 's' : ''} selected</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Topic / Instructions for AI {aiGenForm.material_ids.length > 0 && '(Optional)'}</Label>
                  <div className="relative">
                    <Textarea 
                      placeholder="e.g. Generate a test about advanced marine biology and coral reefs..." 
                      value={aiGenForm.topic} 
                      onChange={e => setAiGenForm({...aiGenForm, topic: e.target.value})} 
                      className="bg-slate-50 border-slate-200 text-slate-900 h-24 rounded-xl resize-none p-3 placeholder:text-slate-400" 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Number of Questions</Label>
                    <Input 
                      type="number"
                      min="1"
                      max="50"
                      value={aiGenForm.count}
                      onChange={e => setAiGenForm({...aiGenForm, count: parseInt(e.target.value) || 5})}
                      className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Difficulty Level</Label>
                    <Select value={aiGenForm.difficulty} onValueChange={v => setAiGenForm({...aiGenForm, difficulty: v})}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed Combinations</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setAiGenDialogOpen(false)} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-11 rounded-xl px-5">
                  Cancel
                </Button>
                <Button onClick={handleAIGenerate} disabled={saving} className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-95 font-semibold h-11 rounded-xl px-6 shadow-md shadow-cyan-600/10">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin text-white/80" /> Synthesizing...</>
                  ) : (
                    <><Brain className="w-4 h-4 mr-2" /> Generate Now</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </TrainerLayout>
  )
}
