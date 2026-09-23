import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const setupPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SetupPasswordFormValues = z.infer<typeof setupPasswordSchema>

export function SetupPassword() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true)
        setUserEmail(session.user.email ?? null)
      } else {
        toast.error('Invalid or expired reset link. Please try again.')
        navigate('/login')
      }
    })
  }, [navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<SetupPasswordFormValues>({
    resolver: zodResolver(setupPasswordSchema),
  })

  const onSubmit = async (data: SetupPasswordFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      
      if (userId) {
        await Promise.all([
          supabase.from('trainees').update({ password: data.password }).eq('id', userId),
          supabase.from('trainers').update({ password: data.password }).eq('id', userId),
          supabase.from('admins').update({ password: data.password }).eq('id', userId)
        ])
      }
      
      await refreshProfile()
      toast.success('Password set successfully! Welcome to your dashboard.')
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Failed to set password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 h-11 rounded-xl ${hasError ? 'border-rose-500' : ''}`

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-[#040814] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-sky-500/20 via-indigo-500/15 to-transparent blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Set New Password</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Please enter a new password for your account.</p>
          {userEmail && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {userEmail}
            </div>
          )}
        </div>

        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 text-sm font-semibold">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  {...register('password')}
                  className={`${inputClass(!!errors.password)} pr-10`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-600 font-medium">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-700 text-sm font-semibold">Confirm Password</Label>
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...register('confirmPassword')} className={inputClass(!!errors.confirmPassword)} disabled={isLoading} />
              {errors.confirmPassword && <p className="text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-600/20 border-0 transition-all font-bold rounded-xl mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <>Save and Continue <CheckCircle className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
