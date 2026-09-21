import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: 'trainee' | 'trainer' | 'admin' | 'super_admin';
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
  
  // Role-specific fields
  department?: string | null;
  designation?: string | null;
  proof_path?: string | null;
  bio?: string | null;
  years_of_experience?: number | null;
  expertise_areas?: string[] | null;
  learning_goals?: string | null;
  admin_level?: string | null;
  permissions_granted_at?: string | null;
};

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata: { full_name: string; department?: string; designation?: string; proof_path?: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Try to find the user in any of the three role tables concurrently
      const [adminRes, trainerRes, traineeRes] = await Promise.all([
        supabase.from('admins').select('*').eq('id', userId).maybeSingle(),
        supabase.from('trainers').select('*').eq('id', userId).maybeSingle(),
        supabase.from('trainees').select('*').eq('id', userId).maybeSingle()
      ]);

      const foundProfile = adminRes.data || trainerRes.data || traineeRes.data;

      if (!foundProfile) {
        console.error('Failed to load profile from any role table for user:', userId);
        setProfile(null);
        return;
      }

      setProfile(foundProfile as Profile);
    } catch (e) {
      console.error('Unexpected error loading profile:', e);
      setProfile(null);
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // If the session changes and we have a new user, we must set loading to true
        // so that the router doesn't try to redirect before the profile is fetched.
        if (newSession?.user && newSession.user.id !== user?.id) {
          setLoading(true)
        }
        
        setSession(newSession)
        setUser(newSession?.user ?? null)
        
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)

        // Automatically redirect to password setup when clicking an email link, but only if not already there
        if (event === 'PASSWORD_RECOVERY' && !window.location.pathname.includes('/setup-password')) {
          window.location.href = '/setup-password'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, user?.id])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata: { full_name: string; department?: string; designation?: string; proof_path?: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          department: metadata.department,
          designation: metadata.designation,
          proof_path: metadata.proof_path,
          // We don't send role or approval_status; backend defaults them.
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/setup-password`,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
