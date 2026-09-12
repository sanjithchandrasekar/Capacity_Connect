import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Loader2, Globe, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
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
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-cyan-600/20 via-blue-700/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

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
          <h1 className="text-3xl font-extrabold text-wheat tracking-tight">Reset Password</h1>
          <p className="text-wheat/70 mt-2 text-sm">We'll send a link to your email address</p>
        </div>

        <div className="bg-white/4 backdrop-blur-xl border border-wheat/10 rounded-2xl p-8 shadow-2xl">
          {isSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-wheat mb-2">Check your inbox</h2>
                <p className="text-sm text-wheat/70 leading-relaxed">
                  A password reset link has been sent to your email. Please also check your spam folder.
                </p>
              </div>
              <Link to="/login">
                <Button className="w-full bg-white/8 hover:bg-white/12 text-wheat border border-wheat/10 transition-all">
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back to Sign In
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register('email')}
                  className={`bg-wheat/5 border-wheat/10 text-wheat placeholder:text-wheat0 focus:border-wheat/20 h-11 ${errors.email ? 'border-red-500/60' : ''}`}
                  disabled={isLoading}
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all font-semibold"
                disabled={isLoading}
              >
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-wheat hover:text-wheat inline-flex items-center gap-1 transition-colors">
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
