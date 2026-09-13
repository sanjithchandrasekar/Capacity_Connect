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
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  department: z.string().optional(),
  designation: z.string().optional(),
  proofFile: z.any().refine((files) => files?.length === 1, 'Proof document is required'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    try {
      const file = data.proofFile[0] as File
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `pending/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Generate a highly secure random dummy password
      const dummyPassword = crypto.randomUUID() + Math.random().toString(36) + "A!1"

      await signUp(data.email, dummyPassword, {
        full_name: data.fullName,
        department: data.department,
        designation: data.designation,
        proof_path: filePath,
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
    `bg-ink/5 border-ink/10 text-ink placeholder:text-ink/40 focus:border-ink/20 h-11 ${hasError ? 'border-red-500/60' : ''}`

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 py-12 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center shadow-md shadow-navy/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-navy">Capacity</span>
              <span className="text-burgundy"> Connect</span>
            </span>
          </Link>
          <h1 className="text-3xl font-extrabold text-navy tracking-tight">Create Account</h1>
          <p className="text-navy/60 mt-2 text-sm">Join the MoES Capacity Connect platform</p>
        </div>

        <div className="bg-white border border-navy/10 rounded-2xl p-8 shadow-xl shadow-navy/5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-navy/80 text-sm font-medium">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" {...register('fullName')} className={inputClass(!!errors.fullName)} disabled={isLoading} />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-navy/80 text-sm font-medium">Email Address</Label>
              <Input id="email" type="email" placeholder="name@moes.gov.in" {...register('email')} className={inputClass(!!errors.email)} disabled={isLoading} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proofFile" className="text-navy/80 text-sm font-medium">Proof Document</Label>
              <Input 
                id="proofFile" 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                {...register('proofFile')} 
                className={`${inputClass(!!errors.proofFile)} pt-2.5`} 
                disabled={isLoading} 
              />
              <p className="text-xs text-navy/50">Please upload your ID or employment proof (PDF, JPG, PNG)</p>
              {errors.proofFile && <p className="text-xs text-red-600">{errors.proofFile.message as string}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-navy/80 text-sm font-medium">Department <span className="text-navy/40">(optional)</span></Label>
                <Input id="department" placeholder="e.g. IMD" {...register('department')} className={inputClass(false)} disabled={isLoading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation" className="text-navy/80 text-sm font-medium">Designation <span className="text-navy/40">(optional)</span></Label>
                <Input id="designation" placeholder="e.g. Scientist" {...register('designation')} className={inputClass(false)} disabled={isLoading} />
              </div>
            </div>

            {/* Notice */}
            <div className="flex items-start gap-2 p-3 bg-gold/10 border border-gold/25 rounded-xl">
              <CheckCircle className="w-4 h-4 text-gold-700 shrink-0 mt-0.5" />
              <p className="text-xs text-navy/70 leading-relaxed">
                New accounts are reviewed as <strong className="text-navy">Trainee</strong> and require admin approval before full access.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-burgundy hover:bg-burgundy/90 text-white shadow-lg shadow-burgundy/20 border-0 transition-all font-semibold"
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
            <p className="text-sm text-navy/60">
              Already have an account?{' '}
              <Link to="/login" className="text-burgundy hover:text-burgundy/80 font-semibold transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
