import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProtectedRoute, ApprovedRoute, RoleRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { SetupPassword } from './pages/SetupPassword'
import { ForgotPassword } from './pages/ForgotPassword'
import { PendingApprovalPage } from './pages/PendingApprovalPage'
import { AccountSuspendedPage } from './pages/AccountSuspendedPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SupabaseTest } from './pages/SupabaseTest'
import { TraineeDashboard, AdminDashboard, SuperAdminDashboard } from './pages/Dashboards'
import { TraineeCourseCatalog } from './features/courses/TraineeCourseCatalog'
import { TraineeCourseDetails } from './features/courses/TraineeCourseDetails'
import { TraineeMyLearning } from './features/courses/TraineeMyLearning'
import { CourseMaterials } from './features/courses/CourseMaterials'
import { TrainerDashboard } from './features/trainer/TrainerDashboard'
import { CourseListPage } from './features/trainer/CourseListPage'
import { CourseCreatePage } from './features/trainer/CourseCreatePage'
import { CourseEditPage } from './features/trainer/CourseEditPage'
import { AssessmentsPage } from './features/trainer/AssessmentsPage'
import { PerformancePage } from './features/trainer/PerformancePage'
import { CourseSessionsPage } from './features/trainer/CourseSessionsPage'
import { TrainerProfile } from './features/trainer/TrainerProfile'
import { TrainerSkills } from './features/trainer/TrainerSkills'
import { NotificationsPage } from './features/trainer/NotificationsPage'
import { CourseDetailPage } from './features/trainer/CourseDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { LandingPage } from './pages/LandingPage'
import { PublicCourseCatalog } from './pages/PublicCourseCatalog'
import { PublicCourseDetails } from './pages/PublicCourseDetails'
import { ChatBot } from './components/ChatBot'

function DashboardRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" /></div>
  if (!session) return <Navigate to="/login" replace />
  if (profile?.role === 'super_admin') return <Navigate to="/super-admin" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'trainer') return <Navigate to="/trainer" replace />
  return <Navigate to="/trainee" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup-password" element={<SetupPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/supabase-test" element={<SupabaseTest />} />
            <Route path="/db" element={<SupabaseTest />} />
            
            {/* Public Course Pages */}
            <Route path="/courses" element={<PublicCourseCatalog />} />
            <Route path="/courses/:courseId" element={<PublicCourseDetails />} />
            
            {/* Auth Fallbacks */}
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/account-suspended" element={<AccountSuspendedPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Base Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<ApprovedRoute />}>
                
                {/* Trainee routes */}
                <Route element={<RoleRoute allowedRoles={['trainee']} />}>
                  <Route path="/trainee" element={<TraineeDashboard />} />
                  <Route path="/trainee/courses" element={<TraineeCourseCatalog />} />
                  <Route path="/trainee/courses/:courseId" element={<TraineeCourseDetails />} />
                  <Route path="/trainee/my-learning" element={<TraineeMyLearning />} />
                  <Route path="/trainee/settings" element={<SettingsPage />} />
                </Route>

                {/* Trainer routes */}
                <Route element={<RoleRoute allowedRoles={['trainer']} />}>
                  <Route path="/trainer" element={<TrainerDashboard />} />
                  <Route path="/trainer/courses" element={<CourseListPage />} />
                  <Route path="/trainer/courses/new" element={<CourseCreatePage />} />
                  <Route path="/trainer/courses/:courseId" element={<CourseDetailPage />} />
                  <Route path="/trainer/courses/:courseId/edit" element={<CourseEditPage />} />
                  <Route path="/trainer/courses/:courseId/sessions" element={<CourseSessionsPage />} />
                  <Route path="/trainer/courses/:courseId/materials" element={<CourseMaterials />} />
                  <Route path="/trainer/courses/:courseId/assessments" element={<AssessmentsPage />} />
                  <Route path="/trainer/courses/:courseId/performance" element={<PerformancePage />} />
                  <Route path="/trainer/notifications" element={<NotificationsPage />} />
                  <Route path="/trainer/settings" element={<SettingsPage />} />
                  <Route path="/trainer/profile" element={<TrainerProfile />} />
                  <Route path="/trainer/skills" element={<TrainerSkills />} />
                </Route>

                {/* Admin routes */}
                <Route element={<RoleRoute allowedRoles={['admin', 'super_admin']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                </Route>

                {/* Super Admin routes */}
                <Route element={<RoleRoute allowedRoles={['super_admin']} />}>
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/settings" element={<SettingsPage />} />
                </Route>

              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ChatBot />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
