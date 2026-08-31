import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Copy,
  Check,
  Building2,
  Mail,
  Briefcase,
  ExternalLink,
  Crown,
  Key,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import Modal from '../../components/common/Modal.jsx'
import api from '../../services/api.js'

export default function TeamManagement() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [currentUserRole, setCurrentUserRole] = useState('RECRUITER')
  const [loading, setLoading] = useState(true)

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('RECRUITER')
  const [inviteDesignation, setInviteDesignation] = useState('Recruiter')
  const [inviteDepartment, setInviteDepartment] = useState('Talent Acquisition')
  const [inviting, setInviting] = useState(false)
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchTeam = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/companies/team/members')
      setMembers(data.members || [])
      setPendingInvites(data.pendingInvites || [])
      setCurrentUserRole(data.currentUserRole || 'RECRUITER')
    } catch (err) {
      showToast(err.message || 'Failed to load company team members', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const canManageTeam = ['OWNER', 'ADMIN'].includes(currentUserRole) || user?.role === 'admin'

  async function handleSendInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      showToast('Please enter recipient email', 'error')
      return
    }

    setInviting(true)
    try {
      const { data } = await api.post('/companies/team/invite', {
        recipientEmail: inviteEmail.trim(),
        recipientName: inviteName.trim(),
        companyRole: inviteRole,
        designation: inviteDesignation.trim(),
        department: inviteDepartment.trim(),
      })

      showToast(data.message || 'Invitation created successfully!', 'success')
      setGeneratedInviteUrl(data.inviteUrl || '')
      fetchTeam()
    } catch (err) {
      showToast(err.message || 'Failed to send invitation', 'error')
    } finally {
      setInviting(false)
    }
  }

  function handleCopyInviteLink(url) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    showToast('Invitation link copied to clipboard!', 'success')
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleCancelInvite(inviteId) {
    try {
      await api.delete(`/companies/team/invites/${inviteId}`)
      showToast('Invitation cancelled', 'info')
      fetchTeam()
    } catch (err) {
      showToast(err.message || 'Failed to cancel invite', 'error')
    }
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      await api.put(`/companies/team/members/${memberId}/role`, { companyRole: newRole })
      showToast(`Role updated to ${newRole}`, 'success')
      fetchTeam()
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error')
    }
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the company team?`)) return
    try {
      await api.delete(`/companies/team/members/${memberId}`)
      showToast(`${memberName} removed from company`, 'info')
      fetchTeam()
    } catch (err) {
      showToast(err.message || 'Failed to remove member', 'error')
    }
  }

  return (
    <div>
      <Helmet>
        <title>Team & Recruiters | CareerHub</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Company Team & Recruiters</h1>
          <p className="text-xs text-ink-soft">
            Manage your company&apos;s recruiting team members, invitations, and access permissions.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={() => {
              setGeneratedInviteUrl('')
              setInviteEmail('')
              setInviteName('')
              setInviteRole('RECRUITER')
              setInviteModalOpen(true)
            }}
            className="btn-primary text-xs gap-1.5 self-start sm:self-auto"
          >
            <UserPlus size={15} /> Invite Recruiter
          </button>
        )}
      </div>

      {/* Role Notice Card */}
      <div className="mt-5 rounded-2xl border border-signal/30 bg-signal/10 p-4 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal text-ink">
            <Crown size={15} />
          </div>
          <div>
            <p className="font-semibold text-ink">Your Company Role: <span className="font-bold">{currentUserRole}</span></p>
            <p className="text-[11px] text-ink-soft">
              {currentUserRole === 'OWNER'
                ? 'Full administrative control, team invitations, and company profile ownership.'
                : currentUserRole === 'ADMIN'
                  ? 'Team management, job postings, candidate management, and interviews.'
                  : 'Job management, candidate screening, and interview scheduling.'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Team Members Table */}
      <div className="mt-6">
        <h2 className="font-display text-sm font-bold text-ink mb-3">Active Team Members ({members.length})</h2>
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink/10 bg-paper text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role & Permissions</th>
                <th className="px-4 py-3">Designation & Department</th>
                <th className="px-4 py-3">Joined Date</th>
                {canManageTeam && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {loading ? (
                <tr>
                  <td colSpan={canManageTeam ? 5 : 4} className="px-4 py-6 text-center text-ink-soft">
                    Loading team members…
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={canManageTeam ? 5 : 4} className="px-4 py-6 text-center text-ink-soft">
                    No active team members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m._id} className="hover:bg-paper/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal/20 font-bold text-ink text-xs">
                          {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{m.user?.name || 'Recruiter'}</p>
                          <p className="text-[11px] text-ink-soft font-mono">{m.workEmail || m.user?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {canManageTeam && currentUserRole === 'OWNER' && String(m.user?._id) !== String(user._id) ? (
                        <select
                          value={m.companyRole}
                          onChange={(e) => handleRoleChange(m._id, e.target.value)}
                          className="input-field text-xs py-1 px-2 w-auto font-semibold"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="RECRUITER">RECRUITER</option>
                          <option value="HIRING_MANAGER">HIRING_MANAGER</option>
                        </select>
                      ) : (
                        <span
                          className={`badge font-bold ${
                            m.companyRole === 'OWNER'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : m.companyRole === 'ADMIN'
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {m.companyRole}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-ink font-medium">{m.designation || 'Recruiter'}</p>
                      <p className="text-[10px] text-ink-soft">{m.department || 'Human Resources'}</p>
                    </td>

                    <td className="px-4 py-3.5 text-ink-soft">
                      {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}
                    </td>

                    {canManageTeam && (
                      <td className="px-4 py-3.5 text-right">
                        {String(m.user?._id) !== String(user._id) && m.companyRole !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m._id, m.user?.name || 'Member')}
                            className="btn-secondary text-xs text-rose-600 hover:bg-rose-50 border-rose-200 py-1 px-2.5 gap-1 inline-flex items-center"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      {pendingInvites.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-sm font-bold text-ink mb-3">
            Pending Invitations ({pendingInvites.length})
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink/10 bg-paper text-[11px] uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Recipient Email</th>
                  <th className="px-4 py-3">Invited Role</th>
                  <th className="px-4 py-3">Invited By</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {pendingInvites.map((inv) => {
                  const inviteUrl = `${window.location.origin}/invite/accept?token=${inv.token}`
                  return (
                    <tr key={inv._id} className="hover:bg-paper/30 transition">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-ink font-mono">{inv.recipientEmail}</p>
                        {inv.recipientName && <p className="text-[10px] text-ink-soft">{inv.recipientName}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="badge bg-signal/20 text-ink font-bold">{inv.companyRole}</span>
                      </td>
                      <td className="px-4 py-3.5 text-ink-soft">{inv.invitedBy?.name || 'Admin'}</td>
                      <td className="px-4 py-3.5 text-ink-soft">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(inviteUrl)}
                          className="btn-secondary text-xs py-1 px-2 gap-1 inline-flex items-center"
                        >
                          <Copy size={12} /> Copy Link
                        </button>
                        {canManageTeam && (
                          <button
                            type="button"
                            onClick={() => handleCancelInvite(inv._id)}
                            className="btn-secondary text-xs text-rose-600 hover:bg-rose-50 border-rose-200 py-1 px-2 inline-flex items-center"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Recruiter to Company"
      >
        {generatedInviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50 p-4 text-xs text-emerald-950">
              <p className="font-bold text-sm">Invitation Link Generated!</p>
              <p className="mt-1 text-[11px] opacity-90 leading-relaxed">
                Share this secure onboarding link with <strong>{inviteEmail}</strong>. When they log in and accept, they will automatically join your company as <strong>{inviteRole}</strong> with verified recruiter permissions.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Invitation URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInviteUrl}
                  className="input-field text-xs font-mono select-all bg-paper/50"
                />
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(generatedInviteUrl)}
                  className="btn-primary text-xs shrink-0 gap-1"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Recipient Work Email *</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="input-field pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Recipient Full Name (Optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Taylor Smith"
                className="input-field text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">Company Role *</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="input-field text-xs font-semibold"
              >
                <option value="RECRUITER">RECRUITER (Can post jobs & screen applicants)</option>
                <option value="ADMIN">ADMIN (Can invite team members & manage all jobs)</option>
                <option value="HIRING_MANAGER">HIRING_MANAGER (Can review assigned applicants & interviews)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Designation</label>
                <input
                  type="text"
                  value={inviteDesignation}
                  onChange={(e) => setInviteDesignation(e.target.value)}
                  placeholder="Technical Recruiter"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Department</label>
                <input
                  type="text"
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  placeholder="Talent Acquisition"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting}
                className="btn-primary text-xs justify-center"
              >
                {inviting ? 'Generating Invite…' : 'Generate Invitation Link'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
