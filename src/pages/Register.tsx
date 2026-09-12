import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, Globe, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  department: z.string().optional(),
  designation: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      await signUp(data.email, data.password, {
        full_name: data.fullName,
        department: data.department,
        designation: data.designation,
      })
      toast.success('Account created! Awaiting admin approval.')
      navigate('/pending-approval')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `bg-wheat/5 border-wheat/10 text-wheat placeholder:text-wheat0 focus:border-wheat/20 focus:ring-cyan-500/20 h-11 ${hasError ? 'border-red-500/60' : ''}`

  return (
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-cyan-600/20 via-blue-700/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
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
          <h1 className="text-3xl font-extrabold text-wheat tracking-tight">Create Account</h1>
          <p className="text-wheat/70 mt-2 text-sm">Join the MoES Capacity Connect platform</p>
        </div>

        <div className="bg-white/4 backdrop-blur-xl border border-wheat/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-slate-300 text-sm">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" {...register('fullName')} className={inputClass(!!errors.fullName)} disabled={isLoading} />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
              <Input id="email" type="email" placeholder="name@moes.gov.in" {...register('email')} className={inputClass(!!errors.email)} disabled={isLoading} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  {...register('password')}
                  className={`${inputClass(!!errors.password)} pr-10`}
                  disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-wheat/70 hover:text-slate-200 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">Confirm Password</Label>
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...register('confirmPassword')} className={inputClass(!!errors.confirmPassword)} disabled={isLoading} />
              {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-slate-300 text-sm">Department <span className="text-wheat0">(optional)</span></Label>
                <Input id="department" placeholder="e.g. IMD" {...register('department')} className={inputClass(false)} disabled={isLoading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation" className="text-slate-300 text-sm">Designation <span className="text-wheat0">(optional)</span></Label>
                <Input id="designation" placeholder="e.g. Scientist" {...register('designation')} className={inputClass(false)} disabled={isLoading} />
              </div>
            </div>

            {/* Notice */}
            <div className="flex items-start gap-2 p-3 bg-cyan-500/8 border border-wheat/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-wheat shrink-0 mt-0.5" />
              <p className="text-xs text-wheat/80 leading-relaxed">
                New accounts are reviewed as <strong>Trainee</strong> and require admin approval before full access.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] transition-all font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</>
              ) : (
                <>Create Account <ArrowRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-wheat0">
              Already have an account?{' '}
              <Link to="/login" className="text-wheat hover:text-wheat font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
