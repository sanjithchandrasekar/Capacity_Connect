import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, BookOpen } from 'lucide-react'
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

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load courses'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const updateCourseStatus = async (courseId: string, newStatus: Course['status']) => {
    try {
      const { error } = await supabase.rpc('admin_update_course', {
        target_course_id: courseId,
        new_status: newStatus,
      })
      if (error) throw error
      toast.success(`Course ${newStatus === 'published' ? 'published' : newStatus === 'archived' ? 'archived' : 'updated'} successfully`)
      fetchCourses()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update course'
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Course Management
        </CardTitle>
        <CardDescription>Review, approve, publish or archive courses submitted by trainers.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No courses found. Trainers haven't created any courses yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map(course => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{course.title}</TableCell>
                  <TableCell className="capitalize">{course.course_type}</TableCell>
                  <TableCell>{course.department || '—'}</TableCell>
                  <TableCell><StatusBadge status={course.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {course.created_at ? formatDistanceToNow(new Date(course.created_at), { addSuffix: true }) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {course.status === 'pending_review' && (
                          <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')}>
                            ✅ Approve & Publish
                          </DropdownMenuItem>
                        )}
                        {course.status === 'pending_review' && (
                          <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'draft')}>
                            🔙 Return to Draft
                          </DropdownMenuItem>
                        )}
                        {course.status === 'published' && (
                          <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'archived')}>
                            📦 Archive
                          </DropdownMenuItem>
                        )}
                        {course.status === 'archived' && (
                          <>
                            <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')}>
                              ♻️ Re-publish
                            </DropdownMenuItem>
                          </>
                        )}
                        {course.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')}>
                            🚀 Publish Directly
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {course.status !== 'archived' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => updateCourseStatus(course.id, 'archived')}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
