import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowLeft, Target, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DashboardShell } from '@/pages/Dashboards'
import { toast } from 'sonner'

interface TraineeAssessmentResultProps {
  assessment: any
  questions: any[]
  attemptData: any
  attemptAnswers: any[]
  areResultsHidden: boolean
  displayTitle: string
  traineeNavLinks: any[]
  profile?: any
  course?: any
  isStandalone?: boolean
}

export function TraineeAssessmentResult({
  assessment,
  questions,
  attemptData,
  attemptAnswers,
  areResultsHidden,
  displayTitle,
  traineeNavLinks,
  profile,
  course,
  isStandalone
}: TraineeAssessmentResultProps) {
  const navigate = useNavigate()
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({})

  const getAnswerString = (ans: any) => {
     if (!ans || ans.selected_answer === undefined || ans.selected_answer === null) return '';
     if (typeof ans.selected_answer === 'string') return ans.selected_answer;
     if (Array.isArray(ans.selected_answer)) return ans.selected_answer.join(',');
     return String(ans.selected_answer);
  }

  // question_type is stored in options._question_type (JSONB column), not a top-level DB column
  const getQuestionType = (q: any): 'mcq' | 'open_ended' => {
    return (q?.options?._question_type) || (q?.question_type) || 'mcq';
  }

  const isAnswerCorrect = (ans: any, q: any) => {
     if (!ans || !q) return false;
     if (getQuestionType(q) === 'open_ended') return false;
     const studentAns = getAnswerString(ans).trim();
     if (!studentAns) return false;
     
     // Answers are stored as option text values
     // Get the correct answer text by looking up the letter key in q.options
     const correctKeys = (q.correct_answer || '').split(',').map((k: string) => k.trim());
     const correctTexts = correctKeys.map((k: string) => {
         const val = (q.options as any)?.[k] as string || k;
         return typeof val === 'string' ? val.trim() : val;
     }).filter(Boolean).sort().join('|||');
     
     // Student answer stored as text (single) or text values separated by |||
     const studentTexts = studentAns.split('|||').map((s: string) => s.trim()).filter(Boolean).sort().join('|||');
     
     if (studentTexts && correctTexts && studentTexts === correctTexts) return true;
     
     // Fallback: direct key comparison (for older attempts stored as letter keys)
     const studentKey = studentAns.split(',').map((s: string) => s.trim()).sort().join(',');
     const correctKey = [...correctKeys].sort().join(',');
     return studentKey !== '' && studentKey === correctKey;
  }

  const toggleExpand = (qId: string) => {
    setExpandedAnswers(prev => ({ ...prev, [qId]: !prev[qId] }))
  }

  // Normalize answers to fallback to JSON column if relational answers are missing
  const normalizedAnswers = React.useMemo(() => {
    const map = new Map<string, any>();
    // First, fallback to attemptData.answers (JSONB dict) if it exists
    let rawAnswers = attemptData?.answers;
    if (typeof rawAnswers === 'string') {
        try { rawAnswers = JSON.parse(rawAnswers); } catch(e) {}
    }

    // Emergency fallback to local storage if DB fails to save answers
    if ((!rawAnswers || Object.keys(rawAnswers).length === 0) && attemptData?.id) {
        const ls = localStorage.getItem(`attempt_answers_${attemptData.id}`);
        if (ls) {
            try { rawAnswers = JSON.parse(ls); } catch(e) {}
        }
    }

    if (rawAnswers && typeof rawAnswers === 'object') {
        Object.entries(rawAnswers).forEach(([qId, ans]) => {
            map.set(qId, { question_id: qId, selected_answer: ans });
        });
    }
    // Then override with attemptAnswers array (newer relational data) if available
    if (attemptAnswers && Array.isArray(attemptAnswers)) {
        attemptAnswers.forEach(ans => {
            if (ans && ans.question_id) {
                map.set(ans.question_id, ans);
            }
        });
    }
    return Array.from(map.values());
  }, [attemptAnswers, attemptData]);

  const totalQuestions = questions?.length || 0
  
  // Calculate stats robustly
  let correctQuestions = 0;
  let pendingQuestions = 0;
  let attemptedQuestions = 0;
  
  questions?.forEach(q => {
      const ans = normalizedAnswers.find((a: any) => a.question_id === q.id);
      if (ans && getAnswerString(ans).trim() !== '') {
          attemptedQuestions++;
          if (getQuestionType(q) === 'open_ended') {
              pendingQuestions++;
          } else if (isAnswerCorrect(ans, q)) {
              correctQuestions++;
          }
      }
  });

  const incorrectQuestions = attemptedQuestions - correctQuestions - pendingQuestions
  const skippedQuestions = totalQuestions - attemptedQuestions

  const content = (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {!isStandalone && (
          <Link to={`/trainee/assessments`} state={{ tab: 'completed' }} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-600 transition-colors mb-2 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </Link>
        )}
        
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          {areResultsHidden ? (
             <div className="text-center p-8">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Assessment Completed</h2>
                <p className="text-slate-600 mb-6 bg-cyan-50 p-4 rounded-2xl border border-cyan-200 max-w-sm mx-auto text-sm font-medium">
                   Your results are currently hidden and will be published on <br/>
                   <span className="font-bold text-cyan-700">{assessment.results_publish_date ? new Date(assessment.results_publish_date).toLocaleDateString() : 'a later date'}</span>.
                </p>
             </div>
          ) : (
              <div className="space-y-6">
                  {/* Header exactly like the screenshot */}
                  <div className="bg-[#334155] text-white flex justify-between items-center px-4 py-2 text-sm font-semibold mb-4 rounded-sm">
                      <div className="truncate pr-4 flex-1">
                          {course?.title ? `${course.title} - ` : ''}{displayTitle} {assessment?.id ? `[#${assessment.id.slice(0, 5)}]` : ''}
                      </div>
                      <div className="truncate text-right flex-1">
                          {profile?.full_name?.toUpperCase()} [{profile?.id?.slice(0, 8)}] - {profile?.email}
                      </div>
                  </div>

                  {/* Header stats (similar to screenshot) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Test Start Time</div>
                          <div className="py-2 text-sm text-slate-700 font-medium">{new Date(attemptData.submitted_at || attemptData.created_at || Date.now()).toLocaleString()}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Marks Scored</div>
                          <div className="py-2 text-sm text-slate-700 font-medium">
                            {attemptData.grade_status === 'pending_manual' ? 'Pending' : `${correctQuestions} / ${totalQuestions}`}
                          </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Total Questions</div>
                          <div className="py-2 text-sm text-slate-700 font-medium">{totalQuestions}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Attempted Questions</div>
                          <div className="py-2 text-sm text-slate-700 font-medium">{attemptedQuestions}</div>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Correct Questions</div>
                          <div className="py-2 text-sm text-emerald-600 font-bold bg-emerald-50 mx-4 my-1 rounded">{correctQuestions}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Incorrect Questions</div>
                          <div className="py-2 text-sm text-rose-600 font-bold bg-rose-50 mx-4 my-1 rounded">{incorrectQuestions}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Skipped Questions</div>
                          <div className="py-2 text-sm text-amber-600 font-bold bg-amber-50 mx-4 my-1 rounded">{skippedQuestions}</div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md overflow-hidden text-center">
                          <div className="bg-[#179da7] text-white text-sm py-1 font-semibold">Pending Evaluation</div>
                          <div className="py-2 text-sm text-slate-800 font-bold bg-slate-100 mx-4 my-1 rounded">{pendingQuestions}</div>
                      </div>
                  </div>
                  
                  {/* Sections Grouping */}
                  <div className="mt-8 space-y-6">
                      {(() => {
                          const sections = questions?.reduce((acc: any, q: any) => {
                              const sec = (q.options && q.options._section) ? q.options._section : 'General Questions'
                              if (!acc[sec]) acc[sec] = []
                              acc[sec].push(q)
                              return acc
                          }, {}) || {}
                          
                          return Object.entries(sections).map(([sectionName, secQuestions]: [string, any]) => {
                              const marksPerQ = (assessment as any)?.marks_per_question || 1;
                              const marksScored = (secQuestions as any[]).reduce((sum, q) => {
                                  const ans = normalizedAnswers.find((a: any) => a.question_id === q.id)
                                  return sum + (isAnswerCorrect(ans, q) ? marksPerQ : 0)
                              }, 0)
                              
                              return (
                                  <div key={sectionName} className="border border-[#179da7] rounded-sm overflow-hidden">
                                      <div className="bg-[#179da7] text-white px-4 py-2 text-sm font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                          <span>{sectionName}</span>
                                          <div className="flex gap-4 text-xs font-medium mt-1 sm:mt-0">
                                              <span>Marks per question : {marksPerQ.toFixed(1)}</span>
                                              <span>Marks Scored : {marksScored.toFixed(1)}</span>
                                          </div>
                                      </div>
                                      
                                      <div className="w-full text-sm overflow-x-auto">
                                          <div className="min-w-[600px] grid grid-cols-12 bg-[#179da7] text-white text-xs py-1.5 px-4 font-semibold border-t border-white/20">
                                              <div className="col-span-1">Q No.</div>
                                              <div className="col-span-5 text-center">Q. Type</div>
                                              <div className="col-span-2 text-center">Status</div>
                                              <div className="col-span-2 text-center">Marks</div>
                                              <div className="col-span-2 text-right"></div>
                                          </div>
                                          <div className="p-2 space-y-2 min-w-[600px] bg-white">
                                              {(secQuestions as any[]).map((q: any, idx: number) => {
                                                  const ans = normalizedAnswers.find((a: any) => a.question_id === q.id) as any
                                                  const ansString = getAnswerString(ans);
                                                  const hasAnswer = ansString.trim() !== '';
                                                  const isPending = getQuestionType(q) === 'open_ended' && hasAnswer;
                                                  const isExpanded = !!expandedAnswers[q.id];
                                                  
                                                  let borderColor = 'border-slate-200';
                                                  let statusIcon = <span className="text-slate-400 font-bold">-</span>;
                                                  let markDisplay = '0.0';
                                                  
                                                  if (hasAnswer) {
                                                     if (isPending) {
                                                         borderColor = 'border-amber-300';
                                                         statusIcon = <span className="text-amber-500 font-bold">...</span>;
                                                         markDisplay = 'Pending';
                                                     } else if (isAnswerCorrect(ans, q)) {
                                                         borderColor = 'border-emerald-500';
                                                         statusIcon = <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />;
                                                         markDisplay = marksPerQ.toFixed(1);
                                                     } else {
                                                         borderColor = 'border-red-400';
                                                         statusIcon = <XCircle className="w-4 h-4 text-red-500 inline" />;
                                                     }
                                                  } else {
                                                      borderColor = 'border-red-400';
                                                      statusIcon = <XCircle className="w-4 h-4 text-red-500 inline" />;
                                                  }
                          
                                                  return (
                                                      <div key={q.id} className={`flex flex-col mb-2 bg-white border ${isExpanded ? (hasAnswer && !isPending && isAnswerCorrect(ans, q) ? 'border-emerald-500' : 'border-red-400') : borderColor} rounded-sm shadow-sm transition-all`}>
                                                          <div className="grid grid-cols-12 items-center py-2.5 px-4 cursor-pointer" onClick={() => toggleExpand(q.id)}>
                                                              <div className="col-span-1 text-slate-700 text-xs font-medium">{idx + 1}</div>
                                                              <div className="col-span-5 text-slate-600 text-center text-xs">
                                                                  {getQuestionType(q) === 'mcq' ? (
                                                                      <div className="flex flex-col leading-snug">
                                                                          <span>Multiple Choice - Single</span>
                                                                          <span>Answer</span>
                                                                      </div>
                                                                  ) : getQuestionType(q) === 'open_ended' ? 'Open Ended' : getQuestionType(q)}
                                                              </div>
                                                              <div className="col-span-2 text-center">{statusIcon}</div>
                                                              <div className="col-span-2 text-center text-xs font-medium text-slate-600">{markDisplay}</div>
                                                              <div className="col-span-2 text-right">
                                                                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs bg-[#179da7] text-white hover:bg-[#138891] hover:text-white border-0 rounded-sm" onClick={(e) => { e.stopPropagation(); toggleExpand(q.id); }}>
                                                                      {isExpanded ? 'Hide Answer' : 'View Answer'}
                                                                  </Button>
                                                              </div>
                                                          </div>
                                                          {isExpanded && (
                                                              <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                                                                  <div className="bg-[#fffdf2] border border-[#f3e5b3] rounded-md p-4 text-sm text-slate-800 mb-4 shadow-sm">
                                                                      {q.question_text}
                                                                  </div>
                                                                  <div className="space-y-3">
                                                                      {getQuestionType(q) === 'mcq' ? (
                                                                          <>
                                                                              {Object.entries(q.options || {})
                                                                                .filter(([k]) => !['_question_type', '_difficulty', '_section'].includes(k))
                                                                                .map(([k, v]) => {
                                                                                  // Answers stored as option text (||| separated for multi)
                                                                                  const studentTexts = ansString.split('|||').map((s: string) => s.trim()).filter(Boolean);
                                                                                  // Also handle old-style comma-separated key answers
                                                                                  const studentKeys = ansString.split(',').map((s: string) => s.trim());
                                                                                  const correctKeys = (q.correct_answer || '').split(',').map((s: string) => s.trim());
                                                                                  // isSelected: match by stored text OR old-style letter key
                                                                                  const isSelected = hasAnswer && (studentTexts.includes(v as string) || studentKeys.includes(k));
                                                                                  // isCorrect: this option's letter is in correct_answer keys
                                                                                  const isCorrect = correctKeys.includes(k);
                                                                                  
                                                                                  return (
                                                                                      <div key={k} className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                                                                        isSelected && isCorrect ? 'border-emerald-400 bg-emerald-50' :
                                                                                        isSelected ? 'border-rose-300 bg-rose-50' :
                                                                                        isCorrect ? 'border-emerald-200 bg-emerald-50/50' :
                                                                                        'border-slate-200 bg-white'
                                                                                      }`}>
                                                                                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-xs ${
                                                                                            isSelected && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                                                                                            isSelected ? 'border-rose-400 bg-rose-400 text-white' :
                                                                                            isCorrect ? 'border-emerald-400 text-emerald-600' :
                                                                                            'border-slate-300 text-slate-500'
                                                                                          }`}>{k}</div>
                                                                                          <div className={`flex-1 text-sm font-medium ${
                                                                                            isSelected ? 'text-slate-900' : 'text-slate-600'
                                                                                          }`}>{v as string}</div>
                                                                                          {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                                                                                          {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                                                                                      </div>
                                                                                  );
                                                                              })}
                                                                              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                  <div className={`border rounded-lg p-4 ${isAnswerCorrect(ans, q) ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                                                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Your Answer</p>
                                                                                      <p className={`text-sm font-semibold ${hasAnswer ? (isAnswerCorrect(ans, q) ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400 italic'}`}>
                                                                                          {hasAnswer
                                                                                            ? ansString.split(',').map((key: string) => {
                                                                                                const trimmed = key.trim();
                                                                                                // Try key lookup first, then treat as text value
                                                                                                const byKey = (q.options as any)?.[trimmed];
                                                                                                if (byKey && !['_question_type','_difficulty','_section'].includes(trimmed)) return byKey;
                                                                                                // If the stored value is already option text, return it
                                                                                                return trimmed;
                                                                                              }).join(', ')
                                                                                            : 'No answer provided'}
                                                                                      </p>
                                                                                  </div>
                                                                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                                                                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Correct Answer</p>
                                                                                      <p className="text-sm font-semibold text-emerald-800">
                                                                                          {(q.correct_answer || '').split(',').map((key: string) => {
                                                                                            const t = key.trim();
                                                                                            return (q.options as any)?.[t] || t;
                                                                                          }).join(', ')}
                                                                                      </p>
                                                                                  </div>
                                                                              </div>
                                                                              {q.explanation && (
                                                                                  <div className="mt-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                                                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                                          Explanation / Reason
                                                                                      </p>
                                                                                      <p className="text-sm text-blue-900">{q.explanation}</p>
                                                                                  </div>
                                                                              )}
                                                                          </>
                                                                      ) : (
                                                                          <div className="space-y-4">
                                                                              <div>
                                                                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer:</p>
                                                                                  <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-800 border border-slate-200">
                                                                                      {hasAnswer ? ansString : <span className="italic text-slate-400">No answer provided.</span>}
                                                                                  </div>
                                                                              </div>
                                                                              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                                                                                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Correct Answer / Reference:</p>
                                                                                  <div className="text-sm text-emerald-900 font-medium">
                                                                                      {q.correct_answer || <span className="italic opacity-70">No reference answer available.</span>}
                                                                                  </div>
                                                                              </div>
                                                                              {q.explanation && (
                                                                                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                                                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                                          Explanation / Reason
                                                                                      </p>
                                                                                      <p className="text-sm text-blue-900">{q.explanation}</p>
                                                                                  </div>
                                                                              )}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              </div>
                                                          )}
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                      </div>
                                  </div>
                              )
                          })
                      })()}
                  </div>
              </div>
          )}
        </div>
      </div>
      
    </>
  )

  if (isStandalone) {
    return content;
  }

  return (
    <DashboardShell title={displayTitle} icon={Target} navLinks={traineeNavLinks}>
      {content}
    </DashboardShell>
  )
}

