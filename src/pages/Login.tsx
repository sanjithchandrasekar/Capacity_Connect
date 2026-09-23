import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
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
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      await signIn(data.email, data.password)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Your email or password is incorrect.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-sky-500/20 via-indigo-500/15 to-transparent blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
            </span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Sign in to continue to your dashboard</p>
        </div>

        {/* Card (Elevated Pure White) */}
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-sm font-semibold">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                className={`bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 h-11 rounded-xl ${errors.email ? 'border-rose-500' : ''}`}
                disabled={isLoading}
              />
              {errors.email && <p className="text-xs text-rose-600 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 text-sm font-semibold">Password</Label>
                <Link to="/forgot-password" className="text-xs text-cyan-700 hover:text-cyan-800 transition-colors font-semibold">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500 h-11 pr-10 rounded-xl ${errors.password ? 'border-rose-500' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-600 font-medium">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-600/20 border-0 transition-all font-bold rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</>
              ) : (
                <>Sign In <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-600 font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-700 hover:text-cyan-800 font-bold transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Ministry of Earth Sciences &nbsp;•&nbsp; Capacity Connect
        </p>
      </motion.div>
    </div>
  )
}
