import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ShieldCheck,
  KeyRound,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function AdminSettings() {
  const { user, login } = useAuth()
  const { showToast } = useToast()

  // Account State
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // 1. Update Admin Email
  async function handleUpdateEmail(e) {
    e.preventDefault()
    if (!email.trim()) {
      showToast('Please enter a valid email address.', 'danger')
      return
    }

    setSavingEmail(true)
    setStatusMessage(null)
    try {
      const { data } = await api.put('/auth/update-account', {
        email: email.trim().toLowerCase(),
      })
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      showToast('Master Admin email updated successfully!', 'success')
      setStatusMessage({
        type: 'success',
        text: `Admin email changed to ${data.user?.email || email}. Use this email for future admin logins and OTP resets.`,
      })
    } catch (err) {
      showToast(err.message || 'Failed to update email.', 'danger')
      setStatusMessage({ type: 'danger', text: err.message || 'Failed to update email.' })
    } finally {
      setSavingEmail(false)
    }
  }

  // 2. Update Admin Password
  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'danger')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'danger')
      return
    }

    setSavingPassword(true)
    setStatusMessage(null)
    try {
      const { data } = await api.put('/auth/update-account', {
        currentPassword: currentPassword || undefined,
        newPassword,
      })
      if (data.token) {
        localStorage.setItem('token', data.token)
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Master Admin password updated successfully!', 'success')
      setStatusMessage({
        type: 'success',
        text: 'Your password has been changed securely. You can now use your new password.',
      })
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'danger')
      setStatusMessage({ type: 'danger', text: err.message || 'Failed to update password.' })
    } finally {
      setSavingPassword(false)
    }
  }

  // 3. Update Admin Display Name
  async function handleUpdateProfile(e) {
    e.preventDefault()
    if (!name.trim()) {
      showToast('Please enter an admin name.', 'danger')
      return
    }

    setSavingProfile(true)
    setStatusMessage(null)
    try {
      const { data } = await api.put('/auth/update-account', {
        name: name.trim(),
      })
      showToast('Admin profile name updated!', 'success')
      setStatusMessage({
        type: 'success',
        text: `Display name updated to "${data.user?.name || name}".`,
      })
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'danger')
      setStatusMessage({ type: 'danger', text: err.message || 'Failed to update profile.' })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Admin Account & Security Settings | CareerHub</title>
      </Helmet>

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Master Admin Account & Security</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage your personal Administrator login email, change your password, and configure platform oversight credentials.
        </p>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-danger/20 bg-danger/10 text-danger'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Overview Active Admin Card */}
      <div className="rounded-xl border border-signal/40 bg-linear-to-br from-signal/10 to-paper p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink font-display text-base font-bold text-signal shadow-xs">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-ink">{user?.name || name}</h3>
                <span className="rounded-full bg-signal/25 px-2.5 py-0.5 text-[10px] font-bold text-ink ring-1 ring-signal/40">
                  🛡️ Single Master Administrator
                </span>
              </div>
              <p className="font-mono text-xs text-ink-soft mt-0.5 flex items-center gap-1.5">
                <Mail size={12} /> {user?.email || email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-ink-soft font-mono">
            <Clock size={14} /> Full Access Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section 1: Change Master Admin Email */}
        <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
            <Mail size={18} className="text-signal-dark" />
            <div>
              <h3 className="font-display text-sm font-bold text-ink">Change Admin Login Email</h3>
              <p className="text-[11px] text-ink-soft">
                Update the email you use to sign in to the Admin Dashboard.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateEmail} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="input-field pl-9 text-xs font-mono"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                You can change this to your personal Gmail or company email. All admin logins and password reset OTPs will be routed here.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingEmail}
              className="btn-primary w-full text-xs font-semibold justify-center shadow-xs"
            >
              <Save size={14} /> {savingEmail ? 'Saving Email…' : 'Update Admin Email'}
            </button>
          </form>
        </div>

        {/* Section 2: Change Master Admin Password */}
        <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
            <KeyRound size={18} className="text-signal-dark" />
            <div>
              <h3 className="font-display text-sm font-bold text-ink">Change Admin Password</h3>
              <p className="text-[11px] text-ink-soft">
                Set a custom secure password for your administrator account.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="mt-4 space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Current Password <span className="text-[10px] text-ink-soft font-normal">(if previously set)</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-field pl-9 pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
                >
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                New Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  required
                  minLength={6}
                  className="input-field pl-9 pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="btn-primary w-full text-xs font-semibold justify-center shadow-xs mt-2"
            >
              <KeyRound size={14} /> {savingPassword ? 'Updating Password…' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Section 3: Admin Profile Name */}
      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
          <User size={18} className="text-signal-dark" />
          <div>
            <h3 className="font-display text-sm font-bold text-ink">Admin Display Name</h3>
            <p className="text-[11px] text-ink-soft">
              Customize how your administrator name appears throughout the platform.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="mb-1 block text-xs font-semibold text-ink">
              Display Name
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin Name (e.g. Prajwal R)"
                required
                className="input-field pl-9 text-xs font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Save size={14} /> {savingProfile ? 'Saving…' : 'Update Name'}
          </button>
        </form>
      </div>

      {/* Security & Password Reset Policy Information Card */}
      <div className="rounded-xl border border-ink/10 bg-paper/60 p-4 text-xs text-ink-soft leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-bold text-ink">
          <Sparkles size={16} className="text-signal-dark" />
          <span>Master Admin Password Recovery Policy</span>
        </div>
        <p>
          If you ever forget your password, you can use the <strong>Forgot password?</strong> button on the Login page. 
          A secure 6-digit verification code will be dispatched directly to your configured administrator email address.
        </p>
      </div>
    </div>
  )
}
