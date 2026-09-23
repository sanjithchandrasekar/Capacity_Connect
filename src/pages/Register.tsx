import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import * as z from 'zod'
import { Loader2, ArrowRight, CheckCircle, Mail, ShieldCheck, ArrowLeft } from 'lucide-react'
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState<'trainee' | 'trainer'>('trainee')
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

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

  // Current active form
  const currentForm = role === 'trainee' ? traineeForm : trainerForm

  // Inline Verification Helpers
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
        toast.info(`[Test Mode - Set secrets in Supabase] Email OTP: ${data.otp}`, { duration: 15000 })
      } else {
        toast.success('Verification code sent to your email!')
      }
      
      setEmailOtpSent(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP')
    } finally {
      setIsSendingEmailOtp(false)
    }
  }

  const handleVerifyEmailOtp = async () => {
    if (emailOtpInput.length < 6) return toast.error('Enter 6-digit OTP')
    const email = role === 'trainee' ? traineeForm.getValues('email') : trainerForm.getValues('email')
    
    setIsSendingEmailOtp(true)
    try {
      const { data: isValid, error } = await supabase.rpc('check_otp_match', {
        p_identifier: email,
        p_otp: emailOtpInput,
        p_type: 'email'
      })
      if (error) throw error
      if (!isValid) throw new Error('Invalid or expired OTP')
      
      setIsEmailVerified(true)
      toast.success('Email verified!')
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    } finally {
      setIsSendingEmailOtp(false)
    }
  }


  const onSubmit = async (data: TraineeFormValues | TrainerFormValues) => {
    if (!isEmailVerified) {
      toast.error('Please verify your email before submitting.')
      return
    }

    setIsLoading(true)
    try {
      const dummyPassword = crypto.randomUUID() + Math.random().toString(36) + "A!1"
      const fullMobileNumber = `${countryCode}${data.mobileNumber}`
      
      const metaData: any = {
        full_name: data.fullName,
        mobile_number: fullMobileNumber,
        signup_role: role,
        is_mobile_verified: false,
        is_email_verified: true
      }

      if (role === 'trainee') {
        const traineeData = data as TraineeFormValues
        metaData.department = traineeData.department
        metaData.designation = traineeData.designation
      }

      // Step 1: Create the auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: dummyPassword,
        options: { data: metaData }
      })
      if (signUpError) throw signUpError
      const userId = signUpData.user?.id
      if (!userId) throw new Error('Failed to create account. Please try again.')

      // Step 2: Upload file(s)
      if (role === 'trainee') {
        const traineeData = data as TraineeFormValues
        const file = traineeData.proofFile[0] as File
        const fileExt = file.name.split('.').pop()
        const filePath = `${userId}/proof_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { error: profileError } = await supabase
          .from('trainees')
          .update({ proof_path: filePath })
          .eq('id', userId)
        if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      } else {
        const trainerData = data as TrainerFormValues
        const file = trainerData.biodataFile[0] as File
        const fileExt = file.name.split('.').pop()
        const filePath = `${userId}/biodata_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, file)
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { error: profileError } = await supabase
          .from('trainers')
          .update({ 
            biodata_path: filePath,
            study_details: trainerData.studyDetails 
          })
          .eq('id', userId)
        if (profileError) throw new Error(`Profile update failed: ${profileError.message}`)
      }

      // Step 3: Create a notification for admins
      const { data: admins } = await supabase.from('admins').select('id')
      if (admins && admins.length > 0) {
        const roleName = role === 'trainee' ? 'Trainee' : 'Trainer'
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'new_registration',
          title: `New ${roleName} Registered`,
          message: `${data.fullName} has registered as a new ${roleName}. Pending review.`,
        }))
        await supabase.from('notifications').insert(notifications)
      }

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
    `bg-purple-500/[0.03] border-purple-500/20 text-midnight placeholder:text-midnight/40 focus:border-pink-500 h-11 ${hasError ? 'border-red-500/60' : ''}`

  const renderEmailField = (formObj: any) => (
    <div className="space-y-1.5">
      <Label htmlFor="email" className="text-midnight/80 text-sm font-medium">Email Address</Label>
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
          <Button type="button" onClick={handleSendEmailOtp} disabled={isSendingEmailOtp || isLoading} className="h-11 bg-purple-100 text-purple-900 hover:bg-purple-200">
            {isSendingEmailOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
          </Button>
        )}
        {isEmailVerified && (
          <div className="h-11 w-11 flex items-center justify-center bg-green-50 rounded-md border border-green-200 shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        )}
      </div>
      {formObj.formState.errors.email && <p className="text-xs text-red-600">{formObj.formState.errors.email.message}</p>}
      
      {emailOtpSent && !isEmailVerified && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 mt-2">
          <Input 
            placeholder="Enter 6-digit OTP" 
            maxLength={6} 
            value={emailOtpInput} 
            onChange={e => setEmailOtpInput(e.target.value.replace(/\D/g, ''))}
            className="h-11 bg-white border-pink-500/30"
          />
          <Button type="button" onClick={handleVerifyEmailOtp} disabled={isSendingEmailOtp || emailOtpInput.length < 6} className="h-11 bg-pink-500 hover:bg-pink-600 text-white">
            Confirm
          </Button>
        </motion.div>
      )}
    </div>
  )

  const renderMobileField = (formObj: any) => (
    <div className="space-y-1.5">
      <Label htmlFor="mobileNumber" className="text-midnight/80 text-sm font-medium">Mobile Number</Label>
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <select 
            value={countryCode} 
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={isLoading}
            className="h-11 appearance-none bg-purple-500/[0.03] border border-purple-500/20 rounded-md pl-3 pr-8 text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            {countryCodes.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-midnight/50">
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
      {formObj.formState.errors.mobileNumber && <p className="text-xs text-red-600">{formObj.formState.errors.mobileNumber.message}</p>}
    </div>
  )

  // --------------------------------------------------------
  // SUCCESS VIEW
  // --------------------------------------------------------
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-white text-midnight flex items-center justify-center p-4 md:p-6 py-8 md:py-12 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-orange-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-orange-500/15 via-pink-500/15 to-purple-500/10 blur-[100px]" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10 text-center bg-white/90 backdrop-blur-xl border border-purple-500/15 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
          <div className="w-16 h-16 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Verification Complete!</h2>
          <p className="text-midnight/70 mb-6 leading-relaxed">
            Your account is now pending admin approval. You will receive an email to set your password once your account is approved.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full bg-purple-900 hover:bg-purple-800 text-white">
            Return to Login
          </Button>
        </motion.div>
      </div>
    )
  }

  // --------------------------------------------------------
  // REGISTRATION FORM VIEW
  // --------------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-midnight flex items-center justify-center p-4 md:p-6 py-8 md:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-orange-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-orange-500/15 via-pink-500/15 to-purple-500/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Link 
          to="/" 
          className="absolute -top-12 left-0 text-sm font-medium text-midnight/60 hover:text-pink-600 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

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
          <Tabs value={role} onValueChange={(v) => {
            setRole(v as 'trainee' | 'trainer')
            // Reset verification states if role changes
            setIsEmailVerified(false); setEmailOtpSent(false); setEmailOtpInput('')
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-purple-500/5 rounded-xl border border-purple-500/10">
              <TabsTrigger value="trainee" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900">Trainee</TabsTrigger>
              <TabsTrigger value="trainer" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-900">Trainer</TabsTrigger>
            </TabsList>

            <TabsContent value="trainee" className="mt-0">
              <form onSubmit={traineeForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-midnight/80 text-sm font-medium">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" {...traineeForm.register('fullName')} className={inputClass(!!traineeForm.formState.errors.fullName)} disabled={isLoading} />
                  {traineeForm.formState.errors.fullName && <p className="text-xs text-red-600">{traineeForm.formState.errors.fullName.message}</p>}
                </div>

                {renderEmailField(traineeForm)}
                {renderMobileField(traineeForm)}

                <div className="space-y-1.5">
                  <Label htmlFor="proofFile" className="text-midnight/80 text-sm font-medium">Proof Document</Label>
                  <Input id="proofFile" type="file" accept=".pdf,.jpg,.jpeg,.png" {...traineeForm.register('proofFile')} className={`${inputClass(!!traineeForm.formState.errors.proofFile)} pt-2.5`} disabled={isLoading} />
                  <p className="text-xs text-midnight/50">Please upload your ID or employment proof (PDF, JPG, PNG)</p>
                  {traineeForm.formState.errors.proofFile && <p className="text-xs text-red-600">{traineeForm.formState.errors.proofFile.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-midnight/80 text-sm font-medium">Department <span className="text-midnight/40">(optional)</span></Label>
                    <Input id="department" placeholder="e.g. IMD" {...traineeForm.register('department')} className={inputClass(false)} disabled={isLoading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="designation" className="text-midnight/80 text-sm font-medium">Designation <span className="text-midnight/40">(optional)</span></Label>
                    <Input id="designation" placeholder="e.g. Scientist" {...traineeForm.register('designation')} className={inputClass(false)} disabled={isLoading} />
                  </div>
                </div>

                <SubmitButton isLoading={isLoading} disabled={!isEmailVerified} />
              </form>
            </TabsContent>

            <TabsContent value="trainer" className="mt-0">
              <form onSubmit={trainerForm.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-fullName" className="text-midnight/80 text-sm font-medium">Full Name</Label>
                  <Input id="t-fullName" placeholder="Jane Smith" {...trainerForm.register('fullName')} className={inputClass(!!trainerForm.formState.errors.fullName)} disabled={isLoading} />
                  {trainerForm.formState.errors.fullName && <p className="text-xs text-red-600">{trainerForm.formState.errors.fullName.message}</p>}
                </div>

                {renderEmailField(trainerForm)}
                {renderMobileField(trainerForm)}

                <div className="space-y-1.5">
                  <Label htmlFor="studyDetails" className="text-midnight/80 text-sm font-medium">Study Details & Qualifications</Label>
                  <Textarea id="studyDetails" placeholder="PhD in Meteorology, 10 years teaching experience..." {...trainerForm.register('studyDetails')} className={`min-h-[100px] resize-none ${inputClass(!!trainerForm.formState.errors.studyDetails)}`} disabled={isLoading} />
                  {trainerForm.formState.errors.studyDetails && <p className="text-xs text-red-600">{trainerForm.formState.errors.studyDetails.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="biodataFile" className="text-midnight/80 text-sm font-medium">Biodata / Resume</Label>
                  <Input id="biodataFile" type="file" accept=".pdf,.doc,.docx" {...trainerForm.register('biodataFile')} className={`${inputClass(!!trainerForm.formState.errors.biodataFile)} pt-2.5`} disabled={isLoading} />
                  <p className="text-xs text-midnight/50">Please upload your CV or Biodata (PDF, DOC)</p>
                  {trainerForm.formState.errors.biodataFile && <p className="text-xs text-red-600">{trainerForm.formState.errors.biodataFile.message as string}</p>}
                </div>

                <SubmitButton isLoading={isLoading} disabled={!isEmailVerified} />
              </form>
            </TabsContent>
          </Tabs>

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

function SubmitButton({ isLoading, disabled }: { isLoading: boolean, disabled: boolean }) {
  return (
    <>
      <div className="flex items-start gap-2 p-3 mt-4 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border border-pink-500/20 rounded-xl">
        <CheckCircle className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
        <p className="text-xs text-midnight/70 leading-relaxed">
          New accounts require <strong className="text-purple-900">admin approval</strong> before full access.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full h-11 mt-4 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-pink-500/25 border-0 transition-all font-semibold disabled:opacity-50 disabled:grayscale"
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
