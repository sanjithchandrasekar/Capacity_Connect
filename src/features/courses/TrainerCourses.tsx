import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { DashboardShell } from '@/pages/Dashboards'
import { CourseFormDialog } from '@/features/courses/CourseFormDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlusCircle, MoreHorizontal, BookOpen, Clock, Target, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']

function StatusBadge({ status }: { status: Course['status'] }) {
  const variants: Record<Course['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    published: 'default',
    pending_review: 'secondary',
    draft: 'outline',
    archived: 'destructive',
  }
  const labels: Record<Course['status'], string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    published: 'Published',
    archived: 'Archived',
  }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}

export function TrainerCourses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load courses'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingCourse(null)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingCourse(null)
  }

  const handleSubmitForReview = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'pending_review' })
        .eq('id', courseId)
      if (error) throw error
      toast.success('Course submitted for admin review')
      fetchCourses()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit course'
      toast.error(message)
    }
  }

  return (
    <DashboardShell
      title="Trainer — My Courses"
      icon={BookOpen}
      navLinks={[
        { to: '/trainer', label: 'Overview', icon: BarChart3 },
        { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Courses</h2>
            <p className="text-muted-foreground">Create and manage your training courses</p>
          </div>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Course
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader>
                <CardContent><div className="h-3 bg-muted rounded w-1/2" /></CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No courses yet — create your first course.</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Start building your training content.</p>
            <Button onClick={handleCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{course.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(course)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/trainer/courses/${course.id}/materials`)}>
                          Manage Materials
                        </DropdownMenuItem>
                        {course.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleSubmitForReview(course.id)}>
                            Submit for Review
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <StatusBadge status={course.status} />
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  <CardDescription className="line-clamp-2">
                    {course.description || 'No description provided.'}
                  </CardDescription>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                    {course.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {course.duration_minutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Pass: {course.passing_score}%
                    </span>
                    <span className="capitalize">{course.course_type}</span>
                  </div>
                  {course.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(course.created_at), { addSuffix: true })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CourseFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={fetchCourses}
        course={editingCourse}
      />
    </DashboardShell>
  )
}
