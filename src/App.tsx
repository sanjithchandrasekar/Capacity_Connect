import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProtectedRoute, ApprovedRoute, RoleRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'

// Lazy loaded page components to drastically reduce initial bundle size and TBT
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const SetupPassword = lazy(() => import('./pages/SetupPassword').then((m) => ({ default: m.SetupPassword })))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage').then((m) => ({ default: m.PendingApprovalPage })))
const AccountSuspendedPage = lazy(() => import('./pages/AccountSuspendedPage').then((m) => ({ default: m.AccountSuspendedPage })))
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage').then((m) => ({ default: m.AccessDeniedPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const SupabaseTest = lazy(() => import('./pages/SupabaseTest').then((m) => ({ default: m.SupabaseTest })))

// Dashboards (heavy Recharts & Supabase admin logic)
const TraineeDashboard = lazy(() => import('./pages/Dashboards').then((m) => ({ default: m.TraineeDashboard })))
const AdminDashboard = lazy(() => import('./pages/Dashboards').then((m) => ({ default: m.AdminDashboard })))
const SuperAdminDashboard = lazy(() => import('./pages/Dashboards').then((m) => ({ default: m.SuperAdminDashboard })))

// Course & Trainee features
const TraineeCourseCatalog = lazy(() => import('./features/courses/TraineeCourseCatalog').then((m) => ({ default: m.TraineeCourseCatalog })))
const TraineeCourseDetails = lazy(() => import('./features/courses/TraineeCourseDetails').then((m) => ({ default: m.TraineeCourseDetails })))
const TraineeCourseLearnPage = lazy(() => import('./features/courses/TraineeCourseLearnPage').then((m) => ({ default: m.TraineeCourseLearnPage })))
const TraineeAssessmentTest = lazy(() => import('./features/courses/TraineeAssessmentTest').then((m) => ({ default: m.TraineeAssessmentTest })))
const TraineeAssessmentsHub = lazy(() => import('./features/courses/TraineeAssessmentsHub').then((m) => ({ default: m.TraineeAssessmentsHub })))
const TraineeMyLearning = lazy(() => import('./features/courses/TraineeMyLearning').then((m) => ({ default: m.TraineeMyLearning })))
const CourseMaterials = lazy(() => import('./features/courses/CourseMaterials').then((m) => ({ default: m.CourseMaterials })))

// Trainer features
const TrainerDashboard = lazy(() => import('./features/trainer/TrainerDashboard').then((m) => ({ default: m.TrainerDashboard })))
const CourseListPage = lazy(() => import('./features/trainer/CourseListPage').then((m) => ({ default: m.CourseListPage })))
const CourseCreatePage = lazy(() => import('./features/trainer/CourseCreatePage').then((m) => ({ default: m.CourseCreatePage })))
const CourseEditPage = lazy(() => import('./features/trainer/CourseEditPage').then((m) => ({ default: m.CourseEditPage })))
const AssessmentsPage = lazy(() => import('./features/trainer/AssessmentsPage').then((m) => ({ default: m.AssessmentsPage })))
const PerformancePage = lazy(() => import('./features/trainer/PerformancePage').then((m) => ({ default: m.PerformancePage })))
const CourseSessionsPage = lazy(() => import('./features/trainer/CourseSessionsPage').then((m) => ({ default: m.CourseSessionsPage })))
const TrainerProfile = lazy(() => import('./features/trainer/TrainerProfile').then((m) => ({ default: m.TrainerProfile })))
const TrainerSkills = lazy(() => import('./features/trainer/TrainerSkills').then((m) => ({ default: m.TrainerSkills })))
const NotificationsPage = lazy(() => import('./features/trainer/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const CourseDetailPage = lazy(() => import('./features/trainer/CourseDetailPage').then((m) => ({ default: m.CourseDetailPage })))

// Public & Profile/Settings pages
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const PublicCourseCatalog = lazy(() => import('./pages/PublicCourseCatalog').then((m) => ({ default: m.PublicCourseCatalog })))
const PublicCourseDetails = lazy(() => import('./pages/PublicCourseDetails').then((m) => ({ default: m.PublicCourseDetails })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const AdminCourseCreatePage = lazy(() => import('./features/admin/AdminCourseCreatePage').then((m) => ({ default: m.AdminCourseCreatePage })))
const AdminCourseEditPage = lazy(() => import('./features/admin/AdminCourseEditPage').then((m) => ({ default: m.AdminCourseEditPage })))
const ChatBot = lazy(() => import('./components/ChatBot').then((m) => ({ default: m.ChatBot })))

function RouteThemeManager() {
  const location = useLocation()

  React.useEffect(() => {
    // Smooth scroll to top on navigation
    window.scrollTo(0, 0)

    document.documentElement.classList.add('theme-light')
    document.documentElement.classList.remove('theme-dark')
    document.body.classList.add('theme-light')
    document.body.classList.remove('theme-dark')
    document.body.style.backgroundColor = '#FAF9F6'
  }, [location.pathname])

  return null
}

function AtmosphericThemeVeil() {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.85,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
    >
      {/* Radiant dawn ambient glow layer */}
      <div className="absolute inset-0 bg-[#FAF9F6] transition-opacity duration-700" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-orange-400/10 blur-[120px]" />
    </motion.div>
  )
}

function DashboardRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#040814] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  if (profile?.role === 'super_admin') return <Navigate to="/super-admin" replace />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'trainer') return <Navigate to="/trainer" replace />
  return <Navigate to="/trainee" replace />
}

function AnimatedAppRoutes() {
  const location = useLocation()
  const isLandingPage = location.pathname === '/'

  // Transition smoothly between different page tiers
  const routeKey = isLandingPage
    ? 'landing'
    : location.pathname === '/login' || location.pathname === '/register'
    ? 'auth'
    : location.pathname.startsWith('/trainer')
    ? 'trainer'
    : location.pathname.startsWith('/trainee')
    ? 'trainee'
    : location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin')
    ? 'admin'
    : location.pathname

  return (
    <>
      <RouteThemeManager />
      <AtmosphericThemeVeil />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={routeKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="min-h-screen w-full"
        >
          <Suspense
            fallback={
              <div className="min-h-screen bg-[#030712] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/setup-password" element={<SetupPassword />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/supabase-test" element={<SupabaseTest />} />
              <Route path="/db" element={<SupabaseTest />} />
              
              {/* Public Course Pages & About */}
              <Route path="/courses" element={<PublicCourseCatalog />} />
              <Route path="/courses/:courseId" element={<PublicCourseDetails />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
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
                    <Route path="/trainee/courses/:courseId/learn" element={<TraineeCourseLearnPage />} />
                    <Route path="/trainee/courses/:courseId/assessments/:assessmentId" element={<TraineeAssessmentTest />} />
                    <Route path="/trainee/assessments" element={<TraineeAssessmentsHub />} />
                    <Route path="/trainee/my-learning" element={<TraineeMyLearning />} />
                    <Route path="/trainee/profile" element={<ProfilePage />} />
                    <Route path="/trainee/settings" element={<Navigate to="/trainee/profile" replace />} />
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
                    <Route path="/trainer/profile" element={<ProfilePage />} />
                    <Route path="/trainer/settings" element={<Navigate to="/trainer/profile" replace />} />
                    <Route path="/trainer/skills" element={<TrainerSkills />} />
                  </Route>

                  {/* Admin routes */}
                  <Route element={<RoleRoute allowedRoles={['admin', 'super_admin']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/courses/new" element={<AdminCourseCreatePage />} />
                    <Route path="/admin/courses/:courseId/edit" element={<AdminCourseEditPage />} />
                    <Route path="/admin/profile" element={<ProfilePage />} />
                    <Route path="/admin/settings" element={<Navigate to="/admin/profile" replace />} />
                  </Route>

                  {/* Super Admin routes */}
                  <Route element={<RoleRoute allowedRoles={['super_admin']} />}>
                    <Route path="/super-admin" element={<SuperAdminDashboard />} />
                    <Route path="/super-admin/profile" element={<ProfilePage />} />
                    <Route path="/super-admin/settings" element={<Navigate to="/super-admin/profile" replace />} />
                  </Route>

                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AnimatedAppRoutes />
          <Suspense fallback={null}>
            <ChatBot />
          </Suspense>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

