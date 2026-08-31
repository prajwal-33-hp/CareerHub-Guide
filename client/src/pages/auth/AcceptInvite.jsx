import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const { user, refreshUser } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  const [mobileNumber, setMobileNumber] = useState('')
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('')

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setLoading(false)
      return
    }

    api
      .get(`/companies/team/invites/validate/${token}`)
      .then(({ data }) => {
        setInvite(data.invite)
        setDesignation(data.invite?.designation || 'Recruiter')
        setDepartment(data.invite?.department || 'Talent Acquisition')
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired invitation link')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept(e) {
    e.preventDefault()
    setAccepting(true)
    try {
      const { data } = await api.post('/companies/team/invites/accept', {
        token,
        mobileNumber,
        designation,
        department,
      })

      showToast(data.message || 'Invitation accepted! Welcome to the team.', 'success')
      if (refreshUser) await refreshUser()
      navigate('/recruiter/dashboard')
    } catch (err) {
      showToast(err.message || 'Failed to accept invitation', 'error')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-signal" />
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Helmet>
          <title>Invalid Invitation | CareerHub</title>
        </Helmet>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertCircle size={24} />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">Invitation Link Expired or Invalid</h1>
        <p className="mt-2 text-xs text-ink-soft leading-relaxed">
          {error || 'This invitation is no longer active. Please request a new invite from your company administrator.'}
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-primary text-xs">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const isEmailMatch = user && user.email.toLowerCase().trim() === invite.recipientEmail.toLowerCase().trim()

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <Helmet>
        <title>Accept Recruiter Invitation | CareerHub</title>
      </Helmet>

      <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center pb-6 border-b border-ink/10">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal text-ink shadow-sm">
            <Building2 size={26} />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-signal/20 px-3 py-0.5 text-[11px] font-bold text-signal-dark mb-2">
            <ShieldCheck size={13} /> Verified Company Invitation
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Join {invite.company?.name}
          </h1>
          <p className="mt-1 text-xs text-ink-soft">
            You have been invited to join the hiring team as <strong className="text-ink">{invite.companyRole}</strong>.
          </p>
        </div>

        {/* Company Summary Card */}
        <div className="my-6 rounded-2xl border border-ink/10 bg-paper/60 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-ink-soft">Invited By:</span>
            <span className="font-semibold text-ink">{invite.invitedBy?.name || 'Company Administrator'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Company Domain:</span>
            <span className="font-semibold text-ink font-mono">{invite.company?.domain || invite.company?.website}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Industry:</span>
            <span className="font-semibold text-ink">{invite.company?.industry || 'Technology'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Assigned Role:</span>
            <span className="badge bg-signal/25 text-ink font-bold">{invite.companyRole}</span>
          </div>
        </div>

        {/* User Auth Verification Check */}
        {!user ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-xs text-amber-950 text-center space-y-3">
            <p className="font-semibold">Log in or create your candidate account to accept</p>
            <p className="text-[11px] opacity-90">
              Please log in with <strong>{invite.recipientEmail}</strong> to verify your identity and activate recruiter permissions.
            </p>
            <div className="flex gap-2 justify-center pt-1">
              <Link to={`/login?email=${encodeURIComponent(invite.recipientEmail)}`} className="btn-primary text-xs flex-1 justify-center">
                Log In
              </Link>
              <Link to={`/register?email=${encodeURIComponent(invite.recipientEmail)}`} className="btn-secondary text-xs flex-1 justify-center">
                Sign Up
              </Link>
            </div>
          </div>
        ) : !isEmailMatch ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-xs text-danger text-center space-y-2">
            <p className="font-bold">Email Mismatch</p>
            <p className="text-[11px] leading-relaxed">
              This invitation was sent to <strong>{invite.recipientEmail}</strong>, but you are logged in as <strong>{user.email}</strong>. Please log out and log in with the correct account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Designation</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Technical Recruiter"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering Hiring"
                className="input-field text-xs"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Mobile Contact Number (Optional)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="input-field pl-9 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={accepting}
              className="btn-primary w-full py-2.5 text-xs font-bold justify-center mt-4 gap-2"
            >
              {accepting ? 'Activating Recruiter Membership…' : `Accept & Join ${invite.company?.name}`} <ArrowRight size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
