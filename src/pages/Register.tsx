import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Loader2, ArrowRight, CheckCircle, ShieldCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const countryCodes = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
]

const baseSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  mobileNumber: z.string().min(8, 'Please enter a valid mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const traineeSchema = baseSchema.extend({
  department: z.string().optional(),
  designation: z.string().optional(),
  proofFile: z.any().refine((files) => files?.length === 1, 'Proof document is required'),
})

const trainerSchema = baseSchema.extend({
  studyDetails: z.string().min(10, 'Please provide details about your studies/qualifications'),
  biodataFile: z.any().refine((files) => files?.length === 1, 'Biodata/Resume document is required'),
})

type TraineeFormValues = z.infer<typeof traineeSchema>
type TrainerFormValues = z.infer<typeof trainerSchema>

export function Register() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState<'trainee' | 'trainer'>('trainee')
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleGoToLogin = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsExiting(true)
    setTimeout(() => navigate('/login'), 300)
  }

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])
  
  // Verification states
  const [countryCode, setCountryCode] = useState('+91')
  
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [emailOtpInput, setEmailOtpInput] = useState('')
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false)

  const traineeForm = useForm<TraineeFormValues>({ resolver: zodResolver(traineeSchema) })
  const trainerForm = useForm<TrainerFormValues>({ resolver: zodResolver(trainerSchema) })

  const currentForm = role === 'trainee' ? traineeForm : trainerForm

  const handleSendEmailOtp = async () => {
    const email = role === 'trainee' ? traineeForm.getValues('email') : trainerForm.getValues('email')
    if (!email || currentForm.formState.errors.email) {
      toast.error('Please enter a valid email first.')
      return
    }
    
    setIsSendingEmailOtp(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { identifier: email, type: 'email' }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      
      if (data?._simulated) {
        console.log(`[SIMULATED] Email OTP for ${email}: ${data.otp}`)
      }
      
      setEmailOtpSent(true)
      toast.success(`Verification code sent to ${email}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email verification code.')
    } finally {
      setIsSendingEmailOtp(false)
    }
  }

  const handleVerifyEmailOtp = async () => {
    const email = role === 'trainee' ? traineeForm.getValues('email') : trainerForm.getValues('email')
    if (!emailOtpInput || emailOtpInput.length < 6) {
      toast.error('Please enter a 6-digit OTP code')
      return
    }
    
    setIsSendingEmailOtp(true)
    try {
      const { data, error } = await supabase.rpc('verify_otp', {
        p_identifier: email,
        p_otp: emailOtpInput,
        p_user_id: undefined,
        p_type: 'email'
      } as any)
      if (error) throw error
      if (!data) throw new Error("Invalid or expired OTP.")
      
      setIsEmailVerified(true)
      toast.success('Email successfully verified!')
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired OTP.')
    } finally {
      setIsSendingEmailOtp(false)
    }
  }

  const onSubmit = async (data: TraineeFormValues | TrainerFormValues) => {
    if (!isEmailVerified) {
      toast.error('Please verify your email address first.')
      return
    }

    setIsLoading(true)
    try {
      let uploadedFilePath: string | null = null
      const rawFile = (role === 'trainee' ? (data as TraineeFormValues).proofFile : (data as TrainerFormValues).biodataFile)?.[0]

      if (rawFile) {
        const fileExt = rawFile.name.split('.').pop()
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `registrations/${uniqueFileName}`

        const { error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(filePath, rawFile, { upsert: false })

        if (uploadError) {
          console.warn('Storage upload error (fallback path used):', uploadError)
        } else {
          uploadedFilePath = filePath
        }
      }

      const fullMobile = `${countryCode} ${data.mobileNumber}`

      await signUp(data.email, data.password, {
        full_name: data.fullName,
        department: role === 'trainee' ? (data as TraineeFormValues).department : undefined,
        designation: role === 'trainee' ? (data as TraineeFormValues).designation : undefined,
        study_details: role === 'trainer' ? (data as TrainerFormValues).studyDetails : undefined,
        proof_path: uploadedFilePath || undefined,
        signup_role: role,
        is_email_verified: true,
        mobile_number: fullMobile
      })

      setRegistrationSuccess(true)
      toast.success('Account registered successfully!')
    } catch (err: any) {
      console.error('Registration Error:', err)
      const msg = err.message || 'Registration failed. Please try again.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:bg-slate-950 focus:border-cyan-500 h-11 rounded-xl ${hasError ? 'border-rose-500/80' : ''}`

  const renderEmailField = (formObj: any) => (
    <>
    <div className="space-y-1.5">
      <Label htmlFor="email" className="text-slate-200 text-sm font-semibold">Email Address</Label>
      <div className="flex gap-2">
        <Input 
          id="email" 
          type="email" 
          placeholder="name@moes.gov.in" 
          {...formObj.register('email')} 
          className={inputClass(!!formObj.formState.errors.email)} 
          disabled={isLoading || isEmailVerified || emailOtpSent} 
        />
        {!isEmailVerified && !emailOtpSent && (
          <Button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp || isLoading} className="h-11 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 font-bold rounded-xl px-4">
            {isSendingEmailOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
          </Button>
        )}
        {isEmailVerified && (
          <div className="h-11 w-11 flex items-center justify-center bg-emerald-950/60 rounded-xl border border-emerald-800/60 shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>
      {formObj.formState.errors.email && <p className="text-xs text-rose-400 font-medium">{formObj.formState.errors.email.message}</p>}
      
      {emailOtpSent && !isEmailVerified && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 mt-2">
          <Input 
            placeholder="Enter 6-digit OTP" 
            maxLength={6} 
            value={emailOtpInput} 
            onChange={e => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
            className="h-11 bg-slate-950/60 border-slate-800 text-white font-bold tracking-widest text-center"
          />
          <Button type="button" onClick={handleVerifyEmailOtp} disabled={isSendingEmailOtp || emailOtpInput.length < 6} className="h-11 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl px-4">
            Confirm
          </Button>
        </motion.div>
      )}
    </div>
    
    <div className="space-y-1.5 mt-4">
      <Label htmlFor="password" className="text-slate-200 text-sm font-semibold">Password</Label>
      <Input 
        id="password" 
        type="password" 
        placeholder="Create a strong password" 
        {...formObj.register('password')} 
        className={inputClass(!!formObj.formState.errors.password)} 
        disabled={isLoading} 
      />
      {formObj.formState.errors.password && <p className="text-xs text-rose-400 font-medium">{formObj.formState.errors.password.message}</p>}
    </div>
    </>
  )

  const renderMobileField = (formObj: any) => (
    <div className="space-y-1.5">
      <Label htmlFor="mobileNumber" className="text-slate-200 text-sm font-semibold">Mobile Number</Label>
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <select 
            value={countryCode} 
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={isLoading}
            className="h-11 appearance-none bg-slate-950/60 border border-slate-800 text-slate-100 rounded-xl pl-3 pr-8 text-sm focus:outline-none focus:border-cyan-500 cursor-pointer font-medium"
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900 text-white">{c.flag} {c.code}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
        <Input 
          id="mobileNumber" 
          type="tel" 
          placeholder="9876543210" 
          {...formObj.register('mobileNumber')} 
          className={inputClass(!!formObj.formState.errors.mobileNumber)} 
          disabled={isLoading} 
        />
      </div>
      {formObj.formState.errors.mobileNumber && <p className="text-xs text-rose-400 font-medium">{formObj.formState.errors.mobileNumber.message}</p>}
    </div>
  )

  // SUCCESS VIEW
  if (registrationSuccess) {
    return (
      <motion.div 
        initial={false}
        animate={{ backgroundColor: isExiting ? "#040814" : "#f8fafc" }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="min-h-screen text-slate-900 flex items-center justify-center p-4 md:p-6 py-8 md:py-12 relative overflow-hidden" 
        style={{ perspective: 1200 }}
      >
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-transparent blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-sky-400/20 via-indigo-400/15 to-transparent blur-[120px]" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, rotateY: 90 }} 
          animate={isExiting ? { opacity: 0, rotateY: 90 } : { opacity: 1, scale: 1, rotateY: 0 }} 
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="w-full max-w-md relative z-10 text-center bg-slate-900 text-white border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-slate-900/20"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="w-16 h-16 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Verification Complete!</h2>
          <p className="text-slate-300 mb-6 leading-relaxed text-sm">
            Your account is now pending admin approval. You will receive an email to set your password once your account is approved.
          </p>
          <Button onClick={handleGoToLogin} className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold h-11 rounded-xl shadow-md shadow-cyan-600/20">
            Return to Login
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  // REGISTRATION FORM VIEW
  return (
    <motion.div 
      initial={false}
      animate={{ backgroundColor: isExiting ? "#040814" : "#f8fafc" }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="min-h-screen text-slate-900 flex items-center justify-center p-4 md:p-6 py-8 md:py-12 relative overflow-hidden" 
      style={{ perspective: 1200 }}
    >
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-400/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-sky-400/20 via-indigo-400/15 to-transparent blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, rotateY: 90 }}
        animate={isExiting ? { opacity: 0, rotateY: 90 } : { opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="w-full max-w-md relative z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-slate-900">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600"> Connect</span>
            </span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-slate-500 mt-1.5 text-sm">Join the MoES Capacity Connect platform</p>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl shadow-slate-900/20">
          <Tabs value={role} onValueChange={(v) => {
            setRole(v as 'trainee' | 'trainer')
            setIsEmailVerified(false); setEmailOtpSent(false); setEmailOtpInput('')
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <TabsTrigger value="trainee" className="rounded-lg font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">Trainee</TabsTrigger>
              <TabsTrigger value="trainer" className="rounded-lg font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">Trainer</TabsTrigger>
            </TabsList>

            <TabsContent value="trainee" className="mt-0">
              <form onSubmit={traineeForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-slate-200 text-sm font-semibold">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" {...traineeForm.register('fullName')} className={inputClass(!!traineeForm.formState.errors.fullName)} disabled={isLoading} />
                  {traineeForm.formState.errors.fullName && <p className="text-xs text-rose-400 font-medium">{traineeForm.formState.errors.fullName.message}</p>}
                </div>

                {renderEmailField(traineeForm)}
                {renderMobileField(traineeForm)}

                <div className="space-y-1.5">
                  <Label htmlFor="proofFile" className="text-slate-200 text-sm font-semibold">Proof Document</Label>
                  <Input id="proofFile" type="file" accept=".pdf,.jpg,.jpeg,.png" {...traineeForm.register('proofFile')} className={`${inputClass(!!traineeForm.formState.errors.proofFile)} pt-2.5 file:text-slate-300 file:border-0 file:bg-transparent file:text-xs file:font-medium`} disabled={isLoading} />
                  <p className="text-xs text-slate-400">Please upload your ID or employment proof (PDF, JPG, PNG)</p>
                  {traineeForm.formState.errors.proofFile && <p className="text-xs text-rose-400 font-medium">{traineeForm.formState.errors.proofFile.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-slate-200 text-sm font-semibold">Department <span className="text-slate-400">(optional)</span></Label>
                    <Input id="department" placeholder="e.g. IMD" {...traineeForm.register('department')} className={inputClass(false)} disabled={isLoading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="designation" className="text-slate-200 text-sm font-semibold">Designation <span className="text-slate-400">(optional)</span></Label>
                    <Input id="designation" placeholder="e.g. Scientist" {...traineeForm.register('designation')} className={inputClass(false)} disabled={isLoading} />
                  </div>
                </div>

                <SubmitButton isLoading={isLoading} disabled={!isEmailVerified} />
              </form>
            </TabsContent>

            <TabsContent value="trainer" className="mt-0">
              <form onSubmit={trainerForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-fullName" className="text-slate-200 text-sm font-semibold">Full Name</Label>
                  <Input id="t-fullName" placeholder="Jane Smith" {...trainerForm.register('fullName')} className={inputClass(!!trainerForm.formState.errors.fullName)} disabled={isLoading} />
                  {trainerForm.formState.errors.fullName && <p className="text-xs text-rose-400 font-medium">{trainerForm.formState.errors.fullName.message}</p>}
                </div>

                {renderEmailField(trainerForm)}
                {renderMobileField(trainerForm)}

                <div className="space-y-1.5">
                  <Label htmlFor="studyDetails" className="text-slate-200 text-sm font-semibold">Study Details & Qualifications</Label>
                  <Textarea id="studyDetails" placeholder="PhD in Meteorology, 10 years teaching experience..." {...trainerForm.register('studyDetails')} className={`min-h-[100px] resize-none ${inputClass(!!trainerForm.formState.errors.studyDetails)}`} disabled={isLoading} />
                  {trainerForm.formState.errors.studyDetails && <p className="text-xs text-rose-400 font-medium">{trainerForm.formState.errors.studyDetails.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biodataFile" className="text-slate-200 text-sm font-semibold">Biodata / Resume</Label>
                  <Input id="biodataFile" type="file" accept=".pdf,.doc,.docx" {...trainerForm.register('biodataFile')} className={`${inputClass(!!trainerForm.formState.errors.biodataFile)} pt-2.5 file:text-slate-300 file:border-0 file:bg-transparent file:text-xs file:font-medium`} disabled={isLoading} />
                  <p className="text-xs text-slate-400">Please upload your CV or Biodata (PDF, DOC)</p>
                  {trainerForm.formState.errors.biodataFile && <p className="text-xs text-rose-400 font-medium">{trainerForm.formState.errors.biodataFile.message as string}</p>}
                </div>

                <SubmitButton isLoading={isLoading} disabled={!isEmailVerified} />
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-5 text-center pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-400 font-medium">
              Already have an account?{' '}
              <a href="/login" onClick={handleGoToLogin} className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">Sign in</a>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SubmitButton({ isLoading, disabled }: { isLoading: boolean, disabled: boolean }) {
  return (
    <>
      <div className="flex items-start gap-2 p-3 mt-4 bg-cyan-950/40 border border-cyan-800/60 rounded-xl">
        <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-200 leading-relaxed font-medium">
          New accounts require <strong className="text-cyan-100 font-bold">admin approval</strong> before full platform access.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full h-11 mt-4 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 border-0 transition-all font-bold rounded-xl disabled:opacity-50 disabled:grayscale"
        disabled={isLoading || disabled}
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</>
        ) : (
          <>Create Account <ArrowRight className="ml-2 w-4 h-4" /></>
        )}
      </Button>
    </>
  )
}
