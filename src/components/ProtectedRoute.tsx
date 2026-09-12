import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-feldgrau gap-3">
      <Loader2 className="w-6 h-6 text-wheat animate-spin" />
      <p className="text-sm text-wheat/70">Loading...</p>
    </div>
  )
}

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Check suspension status globally for any authenticated route
  if (profile?.approval_status === 'suspended') {
    return <Navigate to="/account-suspended" replace />
  }

  return <Outlet />
}

export function ApprovedRoute() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  // Profile is required.
  if (profile?.approval_status === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  if (profile?.approval_status === 'rejected') {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}

export function RoleRoute({ allowedRoles }: { allowedRoles: Array<'trainee' | 'trainer' | 'admin' | 'super_admin'> }) {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
