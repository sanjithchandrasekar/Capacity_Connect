import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, Globe, CheckCircle } from 'lucide-react'
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

  useEffect(() => {
    // Check if we actually have a session to update the password for.
    // The link from the email should log the user in automatically via the URL fragment.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true)
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
      
      await refreshProfile()
      toast.success('Password set successfully! Welcome to your dashboard.')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Failed to set password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `bg-ink/5 border-ink/10 text-ink placeholder:text-ink/40 focus:border-ink/20 h-11 ${hasError ? 'border-red-500/60' : ''}`

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-ink">Capacity</span>
              <span className="text-ink"> Connect</span>
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink tracking-tight">Set up Password</h1>
          <p className="text-ink/60 mt-2 text-sm">Your account has been approved!</p>
        </div>

        <div className="bg-cream border border-ink/10 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-ink/70 text-sm">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  {...register('password')}
                  className={`${inputClass(!!errors.password)} pr-10`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-ink/50 hover:text-ink transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-ink/70 text-sm">Confirm Password</Label>
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...register('confirmPassword')} className={inputClass(!!errors.confirmPassword)} disabled={isLoading} />
              {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-ink hover:bg-ink/90 text-cream border-0 transition-all font-semibold mt-4"
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
