import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Eye,
  EyeOff,
  User,
  Briefcase,
  Mail,
  Lock,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Register() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { role: 'student' } })

  const { register: registerUser, loading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const selectedRole = watch('role')
  const passwordValue = watch('password') || ''

  function handleGoogleSignUp() {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://careerhub-guide.onrender.com/api'
    const clientUrl = encodeURIComponent(window.location.origin)
    window.location.href = `${baseUrl}/auth/google?role=${encodeURIComponent(selectedRole || 'student')}&clientUrl=${clientUrl}`
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
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      showToast('Account created successfully! Please log in.', 'success')
      navigate('/login')
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
          Join CareerHub to unlock jobs, real-time messaging, and video interviews.
        </p>
      </div>

      {/* Role Selector Cards */}
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

      {/* Sign Up with Google Button */}
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
              Or create account with email
            </span>
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Full Name</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              placeholder="e.g. Alex Johnson"
              aria-label="Full name"
              {...register('name', { required: 'Name is required' })}
              className="input-field pl-9"
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="email"
              placeholder="name@example.com"
              aria-label="Email address"
              {...register('email', { required: 'Email is required' })}
              className="input-field pl-9"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
        </div>

        {/* Password with Strength Meter */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink">Password</label>
            {passwordStrength.label && (
              <span className={`text-[10px] font-bold ${passwordStrength.textColor}`}>
                Strength: {passwordStrength.label}
              </span>
            )}
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
              aria-label="Password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'At least 6 characters' },
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

          {/* Dynamic Password Strength Bar */}
          {passwordValue && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                style={{ width: `${passwordStrength.score}%` }}
              />
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
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
          disabled={loading}
          className="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-2 shadow-xs"
        >
          {loading ? 'Creating Account…' : 'Create Free Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-signal-dark hover:underline">
          Log in here
        </Link>
      </p>
    </div>
  )
}
