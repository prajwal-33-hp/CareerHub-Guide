import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ShieldCheck,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Search,
  Filter,
  Eye,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  History,
  Check,
  X,
} from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import Modal from '../../components/common/Modal.jsx'
import api from '../../services/api.js'

export default function RecruiterApplications() {
  const { showToast } = useToast()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    TOTAL: 0,
    REQUESTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  })

  // Selected Application for Review Modal
  const [selectedApp, setSelectedApp] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [auditLogs, setAuditLogs] = useState([])

  // Review Form Action State
  const [actionLoading, setActionLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [assignedRole, setAssignedRole] = useState('OWNER')

  // Fetch applications list
  const fetchApplications = async () => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const { data } = await api.get('/recruiter-verification/admin/applications', { params })
      setApplications(data.applications || [])
      setTotalPages(data.totalPages || 1)
      if (data.statusSummary) setStats(data.statusSummary)
    } catch (err) {
      showToast(err.message || 'Failed to fetch recruiter applications', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [statusFilter, page])

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    fetchApplications()
  }

  // Open Detailed Review Modal
  async function openReviewModal(appId) {
    setModalLoading(true)
    setModalOpen(true)
    try {
      const { data } = await api.get(`/recruiter-verification/admin/applications/${appId}`)
      setSelectedApp(data.application)
      setAuditLogs(data.auditLogs || [])
      setAdminNotes(data.application?.adminReview?.notes || '')
      setRejectionReason(data.application?.adminReview?.rejectionReason || '')
      setAssignedRole(data.application?.companyRole || 'OWNER')
    } catch (err) {
      showToast('Failed to load application details', 'error')
      setModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }

  // Admin Decision Handler
  async function handleUpdateStatus(newStatus) {
    if (!selectedApp) return

    if (newStatus === 'REJECTED' && !rejectionReason.trim()) {
      showToast('Please provide a rejection reason to inform the applicant', 'error')
      return
    }

    setActionLoading(true)
    try {
      await api.put(`/recruiter-verification/admin/applications/${selectedApp._id}/status`, {
        status: newStatus,
        notes: adminNotes,
        rejectionReason: newStatus === 'REJECTED' ? rejectionReason : '',
        companyRole: assignedRole,
      })

      showToast(`Application successfully marked as ${newStatus}`, 'success')
      setModalOpen(false)
      fetchApplications()
    } catch (err) {
      showToast(err.message || 'Failed to update application status', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <Helmet>
        <title>Recruiter Applications & Verifications | CareerHub Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Recruiter Verification Center</h1>
          <p className="text-xs text-ink-soft">Review company credentials, legal IDs, and approve recruiter access.</p>
        </div>
        <button
          onClick={fetchApplications}
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          Refresh List
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Applications', count: stats.TOTAL || 0, color: 'text-ink' },
          { label: 'Pending Review', count: stats.REQUESTED || 0, color: 'text-amber-600' },
          { label: 'Under Review', count: stats.UNDER_REVIEW || 0, color: 'text-signal-dark' },
          { label: 'Approved Recruiters', count: stats.APPROVED || 0, color: 'text-emerald-600' },
          { label: 'Rejected / Other', count: (stats.REJECTED || 0) + (stats.SUSPENDED || 0), color: 'text-rose-600' },
        ].map((item, idx) => (
          <div key={idx} className="rounded-2xl border border-ink/10 bg-white p-3.5 shadow-2xs">
            <span className="text-[11px] font-medium text-ink-soft">{item.label}</span>
            <p className={`mt-1 font-display text-xl font-bold ${item.color}`}>{item.count}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search by recruiter, company, email, CIN, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-ink-soft" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="input-field text-xs w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">Requested (Pending)</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-ink/10 bg-paper text-[11px] uppercase tracking-wider text-ink-soft">
            <tr>
              <th className="px-4 py-3">Applicant & Recruiter</th>
              <th className="px-4 py-3">Company & Domain</th>
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">Legal IDs</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-xs text-ink-soft">
                  Loading applications…
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-xs text-ink-soft">
                  No recruiter applications found.
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const isDomainMatched = app.verification?.domainMatched
                const isEmailVerified = app.verification?.emailVerified
                const isPhoneVerified = app.verification?.phoneVerified

                return (
                  <tr key={app._id} className="hover:bg-paper/40 transition">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">{app.applicantDetails?.fullName || 'N/A'}</p>
                      <p className="text-[11px] text-ink-soft font-mono">{app.applicantDetails?.workEmail}</p>
                      <p className="text-[10px] text-ink-soft">{app.applicantDetails?.designation} • {app.applicantDetails?.department}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-ink">{app.companyDetails?.legalName}</p>
                      <a
                        href={app.companyDetails?.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-signal-dark hover:underline inline-flex items-center gap-0.5"
                      >
                        {app.companyDetails?.domain} <ExternalLink size={10} />
                      </a>
                      <p className="text-[10px] text-ink-soft">{app.companyDetails?.companyType} • {app.companyDetails?.city}</p>
                    </td>

                    <td className="px-4 py-3.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${isEmailVerified ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-[10px]">Email OTP: {isEmailVerified ? 'Verified' : 'Pending'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${isPhoneVerified ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-[10px]">Phone OTP: {isPhoneVerified ? 'Verified' : 'Pending'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${isDomainMatched ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-[10px]">Domain: {isDomainMatched ? 'Matched' : 'Mismatch'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 space-y-0.5 text-[11px] font-mono">
                      {app.companyDetails?.cin && <p className="text-ink">CIN: {app.companyDetails.cin}</p>}
                      {app.companyDetails?.gstin && <p className="text-ink">GST: {app.companyDetails.gstin}</p>}
                      {!app.companyDetails?.cin && !app.companyDetails?.gstin && (
                        <span className="text-ink-soft italic text-[10px]">Not provided</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`badge ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'UNDER_REVIEW'
                              ? 'bg-sky-100 text-sky-800'
                              : app.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : app.status === 'SUSPENDED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openReviewModal(app._id)}
                        className="btn-primary text-xs py-1 px-3 gap-1 inline-flex items-center"
                      >
                        <Eye size={12} /> Review
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center text-xs text-ink-soft">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DETAILED REVIEWS MODAL / INSPECTION DRAWER */}
      {/* ========================================== */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Recruiter Verification Dossier"
      >
        {modalLoading || !selectedApp ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-ink/15 border-t-signal" />
          </div>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Status & Match Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-paper/60 p-4">
              <div>
                <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">Current Status</span>
                <p className="font-display text-base font-bold text-ink">{selectedApp.status}</p>
              </div>
              <div className="flex gap-2">
                <span className={`badge ${selectedApp.verification?.emailVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  Email OTP: {selectedApp.verification?.emailVerified ? 'Verified' : 'Pending'}
                </span>
                <span className={`badge ${selectedApp.verification?.phoneVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  Phone OTP: {selectedApp.verification?.phoneVerified ? 'Verified' : 'Pending'}
                </span>
                <span className={`badge ${selectedApp.verification?.domainMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  Domain Match: {selectedApp.verification?.domainMatched ? 'Matched' : 'Mismatch'}
                </span>
              </div>
            </div>

            {/* Recruiter Details Card */}
            <div className="rounded-2xl border border-ink/10 p-4 space-y-2">
              <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft">
                Applicant Information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-ink-soft">Name:</span> <strong className="text-ink">{selectedApp.applicantDetails?.fullName}</strong></div>
                <div><span className="text-ink-soft">Work Email:</span> <strong className="text-ink font-mono">{selectedApp.applicantDetails?.workEmail}</strong></div>
                <div><span className="text-ink-soft">Mobile Phone:</span> <strong className="text-ink">{selectedApp.applicantDetails?.mobileNumber}</strong></div>
                <div><span className="text-ink-soft">Designation:</span> <strong className="text-ink">{selectedApp.applicantDetails?.designation}</strong></div>
                <div><span className="text-ink-soft">Department:</span> <strong className="text-ink">{selectedApp.applicantDetails?.department}</strong></div>
                {selectedApp.applicantDetails?.linkedinUrl && (
                  <div>
                    <span className="text-ink-soft">LinkedIn:</span>{' '}
                    <a href={selectedApp.applicantDetails.linkedinUrl} target="_blank" rel="noreferrer" className="text-signal-dark hover:underline">
                      View Profile
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Company Legal Profile */}
            <div className="rounded-2xl border border-ink/10 p-4 space-y-2">
              <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft">
                Company & Statutory Entity
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2"><span className="text-ink-soft">Legal Name:</span> <strong className="text-ink">{selectedApp.companyDetails?.legalName}</strong></div>
                <div><span className="text-ink-soft">Website:</span> <a href={selectedApp.companyDetails?.website} target="_blank" rel="noreferrer" className="text-signal-dark hover:underline">{selectedApp.companyDetails?.website}</a></div>
                <div><span className="text-ink-soft">Domain:</span> <strong className="text-ink font-mono">{selectedApp.companyDetails?.domain}</strong></div>
                <div><span className="text-ink-soft">Entity Type:</span> <strong className="text-ink">{selectedApp.companyDetails?.companyType}</strong></div>
                <div><span className="text-ink-soft">Industry:</span> <strong className="text-ink">{selectedApp.companyDetails?.industry}</strong></div>
                <div><span className="text-ink-soft">Company Size:</span> <strong className="text-ink">{selectedApp.companyDetails?.companySize}</strong></div>
                <div><span className="text-ink-soft">Location:</span> <strong className="text-ink">{selectedApp.companyDetails?.city}, {selectedApp.companyDetails?.state}, {selectedApp.companyDetails?.country}</strong></div>
                <div className="col-span-2"><span className="text-ink-soft">Address:</span> <span className="text-ink">{selectedApp.companyDetails?.businessAddress}</span></div>
                <div className="col-span-2"><span className="text-ink-soft">Description:</span> <p className="text-ink mt-0.5 leading-relaxed">{selectedApp.companyDetails?.description}</p></div>
              </div>

              {/* Statutory Numbers */}
              <div className="mt-3 pt-3 border-t border-ink/10 grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-[10px] text-ink-soft block">CIN</span><strong className="font-mono">{selectedApp.companyDetails?.cin || 'N/A'}</strong></div>
                <div><span className="text-[10px] text-ink-soft block">GSTIN</span><strong className="font-mono">{selectedApp.companyDetails?.gstin || 'N/A'}</strong></div>
                <div><span className="text-[10px] text-ink-soft block">LLPIN</span><strong className="font-mono">{selectedApp.companyDetails?.llpin || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Attached Documents */}
            <div className="rounded-2xl border border-ink/10 p-4 space-y-3">
              <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft">
                Uploaded Verification Proofs
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedApp.companyDetails?.registrationDocUrl ? (
                  <a
                    href={selectedApp.companyDetails.registrationDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs flex-1 justify-center gap-2"
                  >
                    <FileText size={14} /> View Business Proof / GST
                  </a>
                ) : (
                  <span className="text-xs text-ink-soft italic flex-1">No registration doc attached</span>
                )}

                {selectedApp.applicantDetails?.idBadgeUrl ? (
                  <a
                    href={selectedApp.applicantDetails.idBadgeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs flex-1 justify-center gap-2"
                  >
                    <FileText size={14} /> View Corporate ID / Badge
                  </a>
                ) : (
                  <span className="text-xs text-ink-soft italic flex-1">No ID badge attached</span>
                )}
              </div>
            </div>

            {/* Admin Action Bar */}
            <div className="rounded-2xl border border-signal/40 bg-signal/10 p-4 space-y-4">
              <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft">
                Admin Review & Actions
              </h3>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Assigned Company Role upon Approval</label>
                <select
                  value={assignedRole}
                  onChange={(e) => setAssignedRole(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="OWNER">OWNER (Company Founder / Primary Admin)</option>
                  <option value="ADMIN">ADMIN (Company Administrator)</option>
                  <option value="RECRUITER">RECRUITER (Standard Recruiter)</option>
                  <option value="HIRING_MANAGER">HIRING_MANAGER (Hiring Manager)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Internal Admin Review Notes</label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes on CIN/GSTIN verification, ID inspection, or company validation..."
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Rejection Reason (Required if Rejecting)</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. GSTIN invalid / Corporate domain mismatch / Unverified ID badge"
                  className="input-field text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                  className="btn-secondary text-xs flex-1 justify-center gap-1.5"
                >
                  <Clock size={14} /> Mark Under Review
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="btn-primary text-xs flex-1 justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check size={14} /> Approve Access
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus('REJECTED')}
                  className="btn-secondary text-xs flex-1 justify-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <X size={14} /> Reject
                </button>

                {selectedApp.status === 'APPROVED' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('SUSPENDED')}
                    className="btn-secondary text-xs justify-center gap-1.5 text-red-700 border-red-300"
                  >
                    <Ban size={14} /> Suspend Recruiter
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Trail */}
            {auditLogs.length > 0 && (
              <div className="rounded-2xl border border-ink/10 p-4">
                <h3 className="font-display text-xs font-bold text-ink uppercase tracking-wider text-ink-soft mb-3 flex items-center gap-1.5">
                  <History size={14} /> Audit Trail
                </h3>
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="text-[11px] border-b border-ink/5 pb-1.5 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-semibold text-ink">{log.action}</span>
                        <span className="text-[10px] text-ink-soft">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-ink-soft">
                        By {log.performedBy?.name || 'System'} ({log.performedBy?.role || 'automated'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
