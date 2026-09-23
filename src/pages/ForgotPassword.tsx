import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
type FormValues = z.infer<typeof schema>

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      await resetPassword(data.email)
      setIsSuccess(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset link.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-4 relative overflow-hidden">
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
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
            </span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Reset Password</h1>
          <p className="text-slate-400 mt-1.5 text-sm">We'll send a link to your email address</p>
        </div>

        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/40">
          {isSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Check your inbox</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A password reset link has been sent to your email. Please also check your spam folder.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all font-semibold rounded-xl h-11">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back to Sign In
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </Label>
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

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-600/20 border-0 transition-all font-bold rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reset Link'}
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm text-slate-600 hover:text-cyan-700 inline-flex items-center gap-1 font-semibold transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
