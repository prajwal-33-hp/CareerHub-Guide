import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Eye,
  EyeOff,
  User,
  Briefcase,
  Mail,
  Lock,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  RotateCcw,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../services/api.js'

export default function Register() {
  const [searchParams] = useSearchParams()
  const initialRoleIntent =
    searchParams.get('role') === 'admin' || searchParams.get('intent') === 'admin'
      ? 'admin'
      : searchParams.get('role') === 'recruiter' || searchParams.get('intent') === 'recruiter'
      ? 'recruiter'
      : 'student'

  const [accountIntent, setAccountIntent] = useState(initialRoleIntent)
  const [adminStatus, setAdminStatus] = useState({ hasAdmin: false, adminEmail: null, loading: true })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: { role: 'student', email: searchParams.get('email') || '' } })

  const { register: registerUser, loading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Real Email OTP Verification States
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // Live Email Real-World Existence Verification State
  const [emailCheckState, setEmailCheckState] = useState({
    checking: false,
    checkedEmail: '',
    valid: null,
    status: null,
    message: '',
  })

  const passwordValue = watch('password') || ''
  const emailValue = watch('email') || ''

  // Debounced live email real-world existence check
  useEffect(() => {
    const trimmed = emailValue.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setEmailCheckState({ checking: false, checkedEmail: '', valid: null, status: null, message: '' })
      return
    }

    const timer = setTimeout(async () => {
      setEmailCheckState((prev) => ({ ...prev, checking: true, checkedEmail: trimmed }))
      try {
        const { data } = await api.get(`/auth/check-email-live?email=${encodeURIComponent(trimmed)}`)
        setEmailCheckState({
          checking: false,
          checkedEmail: trimmed,
          valid: data.valid,
          status: data.status,
          message: data.message,
        })
      } catch (err) {
        setEmailCheckState({
          checking: false,
          checkedEmail: trimmed,
          valid: false,
          status: 'invalid',
          message: err.message || 'This email address is invalid or does not exist in real life.',
        })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [emailValue])

  // Resend Timer Countdown
  useEffect(() => {
    let timer
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((t) => t - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [resendTimer])

  // Reset OTP state if user edits their email address
  useEffect(() => {
    if (otpSent && emailValue.toLowerCase().trim() !== otpEmail.toLowerCase().trim()) {
      setOtpSent(false)
      setOtpCode('')
    }
  }, [emailValue, otpSent, otpEmail])

  useEffect(() => {
    api
      .get('/auth/admin-status')
      .then(({ data }) => setAdminStatus({ hasAdmin: data.hasAdmin, adminEmail: data.adminEmail, loading: false }))
      .catch(() => setAdminStatus({ hasAdmin: false, adminEmail: null, loading: false }))
  }, [])

  useEffect(() => {
    const roleParam = searchParams.get('role') || searchParams.get('intent')
    if (roleParam === 'recruiter') {
      setAccountIntent('recruiter')
    } else if (roleParam === 'admin') {
      setAccountIntent('admin')
    }
  }, [searchParams])

  function handleGoogleSignUp() {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://careerhub-guide.onrender.com/api'
    const clientUrl = encodeURIComponent(window.location.origin)
    // Server enforces role: student on signup, and if recruiter intent, redirects to onboarding
    window.location.href = `${baseUrl}/auth/google?intent=${encodeURIComponent(accountIntent)}&clientUrl=${clientUrl}`
  }

  // Request 6-Digit OTP from backend (verifies email deliverability & sends code)
  async function handleSendOtp() {
    const formVals = getValues()
    const email = formVals.email?.trim()
    const name = formVals.name?.trim()
    const password = formVals.password
    const confirmPassword = formVals.confirmPassword

    if (!name || name.length < 2) {
      setServerError('Please enter your full name (minimum 2 characters).')
      return false
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setServerError('Please enter a valid, real email address.')
      return false
    }
    if (!password || password.length < 6) {
      setServerError('Password must be at least 6 characters.')
      return false
    }
    if (password !== confirmPassword) {
      setServerError('Passwords do not match.')
      return false
    }

    setServerError('')
    setOtpLoading(true)
    try {
      const res = await api.post('/auth/send-signup-otp', { email, name })
      setOtpSent(true)
      setOtpEmail(email)
      setResendTimer(60)
      showToast(res.data.message || `Verification code sent to ${email}`, 'success')
      return true
    } catch (err) {
      setServerError(err.message || 'Failed to dispatch verification code. Please check your email address.')
      return false
    } finally {
      setOtpLoading(false)
    }
  }

  // Dynamic Password Strength Calculator
  const passwordStrength = useMemo(() => {
    if (!passwordValue) return { score: 0, label: '', color: 'bg-slate-200' }
    let score = 0
    if (passwordValue.length >= 6) score += 1
    if (passwordValue.length >= 8) score += 1
    if (/[0-9]/.test(passwordValue)) score += 1
    if (/[A-Z]/.test(passwordValue) || /[^A-Za-z0-9]/.test(passwordValue)) score += 1

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' }
    if (score <= 3) return { score: 65, label: 'Good', color: 'bg-amber-500', textColor: 'text-amber-600' }
    return { score: 100, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' }
  }, [passwordValue])

  async function onSubmit(data) {
    if (data.password !== data.confirmPassword) {
      setServerError('Passwords do not match.')
      return
    }

    setServerError('')

    // Master Admin Claim Flow
    if (accountIntent === 'admin') {
      try {
        const res = await api.post('/auth/register-admin', {
          name: data.name,
          email: data.email,
          password: data.password,
        })
        if (res.data.token) {
          localStorage.setItem('ch_token', res.data.token)
          localStorage.setItem('ch_user', JSON.stringify(res.data.user))
        }
        showToast('Master Administrator initialized! Welcome to the Admin Dashboard.', 'success')
        window.location.href = '/admin/dashboard'
      } catch (err) {
        setServerError(err.message || 'Failed to initialize master admin.')
      }
      return
    }

    // Step 1: If OTP has not been sent yet, request it first
    if (!otpSent || data.email.toLowerCase().trim() !== otpEmail.toLowerCase().trim()) {
      await handleSendOtp()
      return
    }

    // Step 2: Validate 6-digit OTP code entered by user
    if (!otpCode || otpCode.trim().length !== 6) {
      setServerError('Please enter the 6-digit verification code sent to your real email inbox.')
      return
    }

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        otp: otpCode.trim(),
        role: 'student', // Server enforces verified student baseline
      })

      if (accountIntent === 'recruiter') {
        showToast('Real email verified! Proceeding to Recruiter Verification Wizard.', 'success')
        navigate('/recruiter/onboarding')
      } else {
        showToast('Real email verified! Welcome to CareerHub.', 'success')
        navigate('/student/dashboard')
      }
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Sign Up | CareerHub</title>
      </Helmet>

      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal text-ink shadow-sm">
          <UserPlus size={22} />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Join CareerHub to access jobs, internships, recruiter, or admin tools.
        </p>
      </div>

      {/* Account Type Selector Tabs */}
      <div className="mt-6 grid grid-cols-3 gap-1.5 rounded-2xl border border-ink/10 bg-paper/60 p-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setAccountIntent('student')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-bold transition ${
            accountIntent === 'student'
              ? 'bg-white text-ink shadow-xs border border-ink/10'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <GraduationCap size={15} /> Candidate
        </button>
        <button
          type="button"
          onClick={() => setAccountIntent('recruiter')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-bold transition ${
            accountIntent === 'recruiter'
              ? 'bg-white text-ink shadow-xs border border-signal/40'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <Briefcase size={15} /> Recruiter
        </button>
        <button
          type="button"
          onClick={() => setAccountIntent('admin')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] sm:text-xs font-bold transition ${
            accountIntent === 'admin'
              ? 'bg-white text-ink shadow-xs border border-signal text-signal-dark'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          <ShieldCheck size={15} /> {adminStatus.hasAdmin ? 'Admin (Locked)' : 'Master Admin'}
        </button>
      </div>

      {/* Admin Claim Notice */}
      {accountIntent === 'admin' && adminStatus.hasAdmin && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 shadow-2xs animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Master Administrator Already Claimed</p>
              <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                The single Master Administrator account for this platform has already been initialized ({adminStatus.adminEmail || 'Owner'}).
                Only that single owner account is permitted access.
              </p>
              <Link
                to="/login?role=admin"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-ink/90 transition"
              >
                Go to Master Admin Login →
              </Link>
            </div>
          </div>
        </div>
      )}

      {accountIntent === 'admin' && !adminStatus.hasAdmin && (
        <div className="mt-4 rounded-2xl border border-signal/40 bg-signal/15 p-4 text-xs text-ink shadow-2xs animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-signal-dark shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-ink">First-Time Master Admin Ownership Setup</p>
              <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">
                You are claiming the <strong>Single Master Administrator & Owner</strong> account. 
                Enter your name, personal email, and password below. Once registered, admin signup is permanently locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recruiter Policy Notice */}
      {accountIntent === 'recruiter' && (
        <div className="mt-4 rounded-2xl border border-signal/30 bg-signal/10 p-3.5 text-xs text-ink shadow-2xs animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-signal text-ink">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="font-bold text-ink flex items-center gap-1.5">
                Verified Recruiter Onboarding
              </p>
              <p className="mt-0.5 text-[11px] text-ink-soft leading-relaxed">
                Create your account below, and you will proceed to the <strong>5-step company verification & OTP flow</strong>. Full recruiter tools are activated after admin review.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {serverError && (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2">
          <span className="mt-0.5 font-bold">⚠️</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Sign Up with Google Button (for candidates and recruiters only) */}
      {accountIntent !== 'admin' && (
        <div className="mt-5">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold text-ink shadow-2xs hover:bg-paper hover:border-ink/25 transition focus:outline-none focus:ring-2 focus:ring-signal active:scale-[0.99]"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-paper px-2 text-ink-soft font-semibold tracking-wider">
                Or sign up with email
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form (Hidden only if Admin is already claimed) */}
      {!(accountIntent === 'admin' && adminStatus.hasAdmin) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              {accountIntent === 'admin'
                ? 'Master Admin Full Name'
                : accountIntent === 'recruiter'
                ? 'Recruiter / Contact Name'
                : 'Full Name'}
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                placeholder={
                  accountIntent === 'admin'
                    ? 'e.g. Prajwal R'
                    : accountIntent === 'recruiter'
                    ? 'e.g. Sarah Johnson'
                    : 'e.g. Alex Kumar'
                }
                aria-label="Full Name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
                className="input-field pl-9"
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          {/* Email Address */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              {accountIntent === 'admin'
                ? 'Master Admin Email Address'
                : accountIntent === 'recruiter'
                ? 'Official Work Email'
                : 'Email Address'}
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="email"
                placeholder={
                  accountIntent === 'admin'
                    ? 'Enter your master admin email'
                    : accountIntent === 'recruiter'
                    ? 'Enter your corporate work email'
                    : 'Enter your personal email address'
                }
                aria-label="Email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
                className={`input-field pl-9 pr-8 transition-colors ${
                  emailCheckState.valid === true && emailCheckState.status === 'available'
                    ? 'border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                    : emailCheckState.status === 'invalid'
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20'
                    : emailCheckState.status === 'registered'
                    ? 'border-amber-500 focus:border-amber-500 ring-1 ring-amber-500/20'
                    : ''
                }`}
              />
              {emailCheckState.checking && (
                <RotateCcw
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-signal animate-spin"
                  title="Checking email existence..."
                />
              )}
            </div>

            {/* Live Real-World Email Existence Feedback */}
            {emailCheckState.checkedEmail === emailValue.trim().toLowerCase() && !emailCheckState.checking && (
              <div className="mt-1.5 space-y-1 text-xs">
                {emailCheckState.status === 'invalid' && (
                  <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50/90 p-2 text-rose-700 font-medium animate-fadeIn">
                    <span className="shrink-0 text-sm">❌</span>
                    <span className="leading-tight">{emailCheckState.message}</span>
                  </div>
                )}
                {emailCheckState.status === 'registered' && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/90 p-2 text-amber-800 font-medium animate-fadeIn">
                    <span className="leading-tight">⚠️ {emailCheckState.message}</span>
                    <Link to="/login" className="underline font-bold text-amber-900 shrink-0 ml-2">
                      Log In →
                    </Link>
                  </div>
                )}
                {emailCheckState.valid === true && emailCheckState.status === 'available' && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-ink-soft animate-fadeIn">
                    <span className="text-signal-dark font-semibold">ℹ️</span>
                    Valid mail host. You will receive a 6-digit code to verify this mailbox exists.
                  </p>
                )}
              </div>
            )}

            {errors.email && !emailCheckState.status && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              {accountIntent === 'admin' ? 'Master Admin Password' : 'Password'}
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                aria-label="Password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
                className="input-field pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}

            {/* Password Strength Meter */}
            {passwordValue && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-ink-soft">Strength:</span>
                  <span className={`font-semibold ${passwordStrength.textColor}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Confirm Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                aria-label="Confirm Password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (val) => val === passwordValue || 'Passwords do not match',
                })}
                className="input-field pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Real Email OTP Verification Input (shown when code is dispatched) */}
          {accountIntent !== 'admin' && otpSent && (
            <div className="rounded-2xl border-2 border-signal/50 bg-signal/10 p-4 animate-fadeIn space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-signal-dark shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-ink">Confirm Real Mailbox Existence</p>
                  <p className="text-[11px] text-ink-soft leading-tight mt-0.5">
                    A 6-digit verification code was dispatched to <strong className="text-ink">{otpEmail}</strong>. If this email mailbox does not exist in real life, no code will arrive and registration cannot proceed:
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink mb-1">Enter 6-Digit Code</label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field pl-9 text-center font-mono text-base tracking-[0.3em] font-bold bg-white"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  disabled={resendTimer > 0 || otpLoading}
                  onClick={handleSendOtp}
                  className={`flex items-center gap-1 font-semibold ${
                    resendTimer > 0
                      ? 'text-ink-soft/70 cursor-not-allowed'
                      : 'text-signal-dark hover:underline cursor-pointer'
                  }`}
                >
                  <RotateCcw size={13} className={otpLoading ? 'animate-spin' : ''} />
                  {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtpCode('')
                  }}
                  className="text-ink-soft hover:text-ink hover:underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            </div>
          )}

          {/* Terms Agreement Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              {...register('terms', { required: 'You must accept the terms to continue' })}
              className="mt-0.5 h-4 w-4 rounded border-ink/20 text-signal focus:ring-signal"
            />
            <label htmlFor="terms" className="text-[11px] text-ink-soft leading-tight">
              I agree to CareerHub&apos;s{' '}
              <Link to="/about" className="font-semibold text-ink hover:underline">
                Terms of Service
              </Link>{' '}
              and Privacy Policy.
            </label>
          </div>
          {errors.terms && <p className="text-xs text-danger">{errors.terms.message}</p>}

          <button
            type="submit"
            disabled={loading || otpLoading}
            className="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-2 shadow-xs gap-1.5"
          >
            {loading || otpLoading ? (
              otpLoading ? 'Dispatching Verification Code…' : 'Verifying Account…'
            ) : accountIntent === 'admin' ? (
              <>
                <ShieldCheck size={16} /> Claim Master Admin & Initialize Platform
              </>
            ) : otpSent ? (
              <>
                <CheckCircle2 size={16} /> Verify Code & Complete Registration
              </>
            ) : (
              <>
                <Mail size={15} /> Send Verification Code & Continue
              </>
            )}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-signal-dark hover:underline">
          Log in here
        </Link>
      </p>
    </div>
  )
}
