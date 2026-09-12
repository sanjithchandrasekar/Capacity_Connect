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
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora */}
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-cyan-600/20 via-blue-700/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
              <Globe className="w-5 h-5 text-wheat" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-wheat">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wheat to-wheat/70"> Connect</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-wheat tracking-tight">Welcome Back</h1>
          <p className="text-wheat/70 mt-2 text-sm">Sign in to continue to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/4 backdrop-blur-xl border border-wheat/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                className={`bg-wheat/5 border-wheat/10 text-wheat placeholder:text-wheat0 focus:border-wheat/20 focus:ring-cyan-500/20 h-11 ${errors.email ? 'border-red-500/60' : ''}`}
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <Link to="/forgot-password" className="text-xs text-wheat hover:text-wheat transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`bg-wheat/5 border-wheat/10 text-wheat placeholder:text-wheat0 focus:border-wheat/20 focus:ring-cyan-500/20 h-11 pr-10 ${errors.password ? 'border-red-500/60' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-wheat/70 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transition-all font-semibold"
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
            <p className="text-sm text-wheat0">
              Don't have an account?{' '}
              <Link to="/register" className="text-wheat hover:text-wheat font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Ministry of Earth Sciences — SIH 2026 &nbsp;•&nbsp; Secure Platform
        </p>
      </motion.div>
    </div>
  )
}
