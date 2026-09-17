import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, Globe, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      await signIn(data.email, data.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Your email or password is incorrect.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-5 md:mb-6">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 md:w-10 md:h-10 object-contain" />
            <span className="text-base md:text-lg font-bold">
              <span className="text-navy">Capacity</span>
              <span className="text-burgundy"> Connect</span>
            </span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy tracking-tight">Welcome Back</h1>
          <p className="text-navy/60 mt-2 text-sm">Sign in to continue to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-navy/10 rounded-2xl p-6 md:p-8 shadow-xl shadow-navy/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-navy/80 text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                className={`bg-navy/[0.02] border-navy/15 text-navy placeholder:text-navy/40 focus:border-burgundy h-11 ${errors.email ? 'border-red-500/60' : ''}`}
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-navy/80 text-sm font-medium">Password</Label>
                <Link to="/forgot-password" className="text-xs text-navy/60 hover:text-burgundy transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`bg-navy/[0.02] border-navy/15 text-navy placeholder:text-navy/40 focus:border-burgundy h-11 pr-10 ${errors.password ? 'border-red-500/60' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-navy/50 hover:text-navy transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-burgundy hover:bg-burgundy/90 text-white shadow-lg shadow-burgundy/20 border-0 transition-all font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</>
              ) : (
                <>Sign In <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-navy/60">
              Don't have an account?{' '}
              <Link to="/register" className="text-burgundy hover:text-burgundy/80 font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-navy/40 mt-6">
          Ministry of Earth Sciences — SIH 2026 &nbsp;•&nbsp; Secure Platform
        </p>
      </motion.div>
    </div>
  )
}
