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
      // Step 1: Create the auth account first (with dummy password) to get the user ID
      const dummyPassword = crypto.randomUUID() + Math.random().toString(36) + "A!1"
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: dummyPassword,
        options: {
          data: {
            full_name: data.fullName,
            department: data.department,
            designation: data.designation,
          }
        }
      })
      if (signUpError) throw signUpError
      const userId = signUpData.user?.id
      if (!userId) throw new Error('Failed to create account. Please try again.')

      // Step 2: Upload proof file under the user's ID so admin can access it
      const file = data.proofFile[0] as File
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading proof to storage...')
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file)
      if (uploadError) {
        console.error('Storage Upload Error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Step 3: Update the profile with the proof path now that we have it
      console.log('Updating profile with proof path...')
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ proof_path: filePath })
        .eq('id', userId)
      if (profileError) {
        console.error('Profile Update Error:', profileError)
        throw new Error(`Profile update failed: ${profileError.message}`)
      }

      toast.success('Account created! Awaiting admin approval.')
      navigate('/pending-approval')
    } catch (err: any) {
      console.error('Registration Error:', err)
      const msg = err.message || 'Registration failed. Please try again.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `bg-purple-500/[0.03] border-purple-500/20 text-midnight placeholder:text-midnight/40 focus:border-pink-500 h-11 ${hasError ? 'border-red-500/60' : ''}`

  return (
    <div className="min-h-screen bg-white text-midnight flex items-center justify-center p-4 md:p-6 py-8 md:py-12 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-orange-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-orange-500/15 via-pink-500/15 to-purple-500/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6 md:mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-5 md:mb-6">
            <img src="/logo.png" alt="Logo" className="w-9 h-9 md:w-10 md:h-10 object-contain" />
            <span className="text-base md:text-lg font-bold">
              <span className="text-purple-900">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500"> Connect</span>
            </span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-midnight tracking-tight">Create Account</h1>
          <p className="text-midnight/60 mt-2 text-sm">Join the MoES Capacity Connect platform</p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-purple-500/15 rounded-2xl p-6 md:p-8 shadow-2xl shadow-purple-500/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-midnight/80 text-sm font-medium">Full Name</Label>
              <Input id="fullName" placeholder="John Doe" {...register('fullName')} className={inputClass(!!errors.fullName)} disabled={isLoading} />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-midnight/80 text-sm font-medium">Email Address</Label>
              <Input id="email" type="email" placeholder="name@moes.gov.in" {...register('email')} className={inputClass(!!errors.email)} disabled={isLoading} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proofFile" className="text-midnight/80 text-sm font-medium">Proof Document</Label>
              <Input 
                id="proofFile" 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                {...register('proofFile')} 
                className={`${inputClass(!!errors.proofFile)} pt-2.5`} 
                disabled={isLoading} 
              />
              <p className="text-xs text-midnight/50">Please upload your ID or employment proof (PDF, JPG, PNG)</p>
              {errors.proofFile && <p className="text-xs text-red-600">{errors.proofFile.message as string}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-midnight/80 text-sm font-medium">Department <span className="text-midnight/40">(optional)</span></Label>
                <Input id="department" placeholder="e.g. IMD" {...register('department')} className={inputClass(false)} disabled={isLoading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="designation" className="text-midnight/80 text-sm font-medium">Designation <span className="text-midnight/40">(optional)</span></Label>
                <Input id="designation" placeholder="e.g. Scientist" {...register('designation')} className={inputClass(false)} disabled={isLoading} />
              </div>
            </div>

            {/* Notice */}
            <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border border-pink-500/20 rounded-xl">
              <CheckCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
              <p className="text-xs text-midnight/70 leading-relaxed">
                New accounts are reviewed as <strong className="text-purple-900">Trainee</strong> and require admin approval before full access.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-pink-500/25 border-0 transition-all font-semibold"
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
            <p className="text-sm text-midnight/60">
              Already have an account?{' '}
              <Link to="/login" className="text-pink-600 hover:text-pink-700 font-semibold transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
