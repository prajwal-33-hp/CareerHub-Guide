import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Eye,
  EyeOff,
  User,
  Briefcase,
  KeyRound,
  Mail,
  Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Modal from '../components/common/Modal.jsx'
import api from '../services/api.js'

export default function Login() {
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { role: 'student' } })

  const { login, loading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const selectedRole = watch('role')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setServerError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  function handleGoogleLogin() {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    window.location.href = `${baseUrl}/auth/google?role=${encodeURIComponent(selectedRole || 'student')}`
  }

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [forgotStep, setForgotStep] = useState(1) // 1: Email entry, 2: OTP + New Password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function onSubmit(data) {
    const { email, password, role } = data
    setServerError('')
    try {
      const user = await login({ email, password, role })
      showToast('Welcome back!', 'success')
      if (user.role === 'recruiter') {
        navigate('/recruiter/dashboard')
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/student/dashboard')
      }
    } catch (err) {
      setServerError(err.message || 'Invalid email or password.')
    }
  }

  // Step 1: Send Reset Request (Verifies Email in MongoDB)
  async function handleSendResetCode(e) {
    e.preventDefault()
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your account email.')
      return
    }

    setForgotError('')
    setForgotLoading(true)

    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() })
      setForgotStep(2)
      showToast('Verification code generated. Please set your new password.', 'info')
    } catch (err) {
      setForgotError(err.message || 'No account found with this email.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Step 2: Confirm Reset & Set New Password
  async function handleConfirmResetPassword(e) {
    e.preventDefault()
    if (!forgotOtp.trim() || !newPassword.trim()) {
      setForgotError('Verification code and new password are required.')
      return
    }

    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.')
      return
    }

    setForgotError('')
    setForgotLoading(true)

    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail.trim(),
        resetCode: forgotOtp.trim(),
        newPassword,
      })
      showToast('Password reset successfully! You can now log in.', 'success')
      setForgotModalOpen(false)
      setForgotStep(1)
      setValue('email', forgotEmail.trim())
      setValue('password', newPassword)
    } catch (err) {
      setForgotError(err.message || 'Could not reset password.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Log In | CareerHub</title>
      </Helmet>

      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-signal text-ink shadow-sm">
          <KeyRound size={22} />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Log in to access your dashboard, jobs, and messages.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {[
          { id: 'student', label: 'Candidate', icon: User, desc: 'Find Jobs' },
          { id: 'recruiter', label: 'Recruiter', icon: Briefcase, desc: 'Hire Talent' },
        ].map(({ id, label, icon: Icon, desc }) => {
          const isSelected = selectedRole === id
          return (
            <label
              key={id}
              className={`flex cursor-pointer flex-col items-center rounded-xl border p-3 text-center transition ${isSelected
                  ? 'border-signal bg-signal/15 text-ink shadow-2xs'
                  : 'border-ink/10 bg-white text-ink-soft hover:border-ink/20'
                }`}
            >
              <input type="radio" value={id} {...register('role')} className="hidden" />
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg mb-1.5 ${isSelected ? 'bg-signal text-ink' : 'bg-paper text-ink-soft'
                  }`}
              >
                <Icon size={16} />
              </div>
              <span className="font-display text-xs font-bold">{label}</span>
              <span className="text-[10px] text-ink-soft">{desc}</span>
            </label>
          )
        })}
      </div>

      {/* Error Alert */}
      {serverError && (
        <div className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger flex items-start gap-2">
          <span className="mt-0.5 font-bold">⚠️</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Continue with Google Button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={handleGoogleLogin}
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
          <span>Continue with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-paper px-2 text-ink-soft font-semibold tracking-wider">
              Or continue with email
            </span>
          </div>
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="email"
              placeholder="you@example.com"
              aria-label="Email address"
              {...register('email', { required: 'Email is required' })}
              className="input-field pl-9"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink">Password</label>
            <button
              type="button"
              onClick={() => {
                setForgotError('')
                setForgotStep(1)
                setForgotEmail(watch('email') || '')
                setForgotModalOpen(true)
              }}
              className="text-[11px] font-semibold text-signal-dark hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              aria-label="Password"
              {...register('password', { required: 'Password is required' })}
              className="input-field pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-2 shadow-xs"
        >
          {loading ? 'Logging in…' : 'Log In to Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-bold text-signal-dark hover:underline">
          Sign up for free
        </Link>
      </p>

      {/* --- FORGOT PASSWORD RECOVERY MODAL --- */}
      <Modal
        open={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={forgotStep === 1 ? 'Reset Your Password' : 'Enter Verification Code'}
      >
        {forgotStep === 1 ? (
          <form onSubmit={handleSendResetCode} className="space-y-4">
            <p className="text-xs text-ink-soft leading-relaxed">
              Enter your registered email address. We will verify your account in our database and
              generate a secure password reset code.
            </p>

            {forgotError && (
              <div className="rounded-lg border border-danger/20 bg-danger/10 p-2.5 text-xs text-danger">
                {forgotError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Account Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary flex-1 text-xs justify-center"
              >
                {forgotLoading ? 'Verifying…' : 'Verify Account'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmResetPassword} className="space-y-4">
            <p className="text-xs text-ink-soft">
              Account verified for <span className="font-semibold text-ink">{forgotEmail}</span>.
              Enter the 6-digit code and choose your new password.
            </p>

            {forgotError && (
              <div className="rounded-lg border border-danger/20 bg-danger/10 p-2.5 text-xs text-danger">
                {forgotError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                placeholder="123456"
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value)}
                className="input-field font-mono text-center tracking-widest text-sm font-bold"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field text-xs pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForgotStep(1)}
                className="btn-secondary flex-1 text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary flex-1 text-xs justify-center"
              >
                {forgotLoading ? 'Updating…' : 'Save New Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
