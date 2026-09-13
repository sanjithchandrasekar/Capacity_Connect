import { supabase } from './supabase'

interface GeneratedQuestion {
  question_text: string
  options: { A: string; B: string; C: string; D: string }
  correct_answer: string
  explanation: string | null
}

interface GenerateQuestionsResponse {
  success: boolean
  questions_generated: number
  assessment_id: string
  questions: Array<{
    id: string
    question_text: string
    options: { A: string; B: string; C: string; D: string }
    correct_answer: string
    explanation: string | null
    position: number
  }>
}

export async function generateQuestionsFromMaterial(
  materialId: string,
  courseId: string,
  content: string,
  topic?: string
): Promise<GenerateQuestionsResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      material_id: materialId,
      course_id: courseId,
      content,
      topic,
    },
  })

  if (error) throw error
  return data as GenerateQuestionsResponse
}

export async function extractTextFromFile(
  file: File,
  mimeType: string
): Promise<string> {
  // For text-based files, read directly
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/pdf' ||
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('presentation')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // For other files, return empty (edge function will handle)
  return ''
}

export async function generateQuestionsFromUrl(
  url: string,
  courseId: string,
  title?: string
): Promise<GenerateQuestionsResponse> {
  // For URLs, we fetch the content server-side
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase.functions.invoke('generate-questions', {
    body: {
      course_id: courseId,
      content: `External resource: ${url}\nTitle: ${title || url}`,
      topic: title || 'External Resource',
    },
  })

  if (error) throw error
  return data as GenerateQuestionsResponse
}
