import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type Course = Database['public']['Tables']['courses']['Row']

const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  course_type: z.enum(['standard', 'scenario']),
  department: z.string().optional(),
  duration_minutes: z.coerce.number().positive().optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
})

type CourseFormData = z.infer<typeof courseSchema>

interface CourseFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  course?: Course | null
}

export function CourseFormDialog({ open, onClose, onSaved, course }: CourseFormDialogProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: course?.title ?? '',
      description: course?.description ?? '',
      course_type: course?.course_type ?? 'standard',
      department: course?.department ?? '',
      duration_minutes: course?.duration_minutes ?? undefined,
      passing_score: course?.passing_score ?? 60,
    },
  })

  const courseType = watch('course_type')

  const handleSave = async (data: CourseFormData, status: 'draft' | 'pending_review') => {
    if (!user) return
    setSaving(true)
    try {
      if (course) {
        // Edit existing
        const { error } = await supabase
          .from('courses')
          .update({ ...data, status })
          .eq('id', course.id)
        if (error) throw error
        toast.success('Course updated successfully')
      } else {
        // Create new
        const { error } = await supabase
          .from('courses')
          .insert({ ...data, trainer_id: user.id, status })
        if (error) throw error
        toast.success(status === 'draft' ? 'Course saved as draft' : 'Course submitted for review')
      }
      reset()
      onSaved()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save course'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{course ? 'Edit Course' : 'Create New Course'}</DialogTitle>
          <DialogDescription>
            Fill in the course details. You can save as a draft or submit for admin review.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Course Title *</Label>
            <Input id="title" {...register('title')} placeholder="e.g. Cyclone Response Protocol" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} placeholder="Brief course overview..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Course Type *</Label>
              <Select value={courseType} onValueChange={(v) => setValue('course_type', v as 'standard' | 'scenario')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="scenario">Scenario Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register('department')} placeholder="e.g. Meteorology" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input id="duration_minutes" type="number" {...register('duration_minutes')} placeholder="e.g. 90" />
              {errors.duration_minutes && <p className="text-xs text-destructive">{errors.duration_minutes.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="passing_score">Passing Score (%)</Label>
              <Input id="passing_score" type="number" {...register('passing_score')} placeholder="60" />
              {errors.passing_score && <p className="text-xs text-destructive">{errors.passing_score.message}</p>}
            </div>
          </div>
        </form>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="secondary"
            onClick={handleSubmit((data) => handleSave(data, 'draft'))}
            disabled={saving}
          >
            Save as Draft
          </Button>
          <Button
            onClick={handleSubmit((data) => handleSave(data, 'pending_review'))}
            disabled={saving}
          >
            {saving ? 'Submitting...' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
