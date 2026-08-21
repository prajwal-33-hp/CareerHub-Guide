import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function Reports() {
  const { showToast } = useToast()
  const [pendingJobs, setPendingJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/jobs/all')
      .then(({ data }) => {
        if (!mounted) return
        setPendingJobs((data.jobs || []).filter((job) => job.status === 'pending'))
      })
      .catch(() => {
        if (mounted) setPendingJobs([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function updateStatus(jobId, status) {
    try {
      await api.put(`/jobs/${jobId}/status`, { status })
      setPendingJobs((prev) => prev.filter((job) => job._id !== jobId))
      showToast(`Job ${status === 'approved' ? 'approved' : 'rejected'} successfully.`, 'success')
    } catch (error) {
      showToast('Unable to update job status. Please try again.', 'error')
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Pending Approvals</h2>
      <p className="mt-1 text-sm text-ink-soft">Review and approve new job postings from recruiters.</p>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-lg border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">Loading pending approvals…</div>
        ) : pendingJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No job postings are waiting for approval.</div>
        ) : (
          pendingJobs.map((job) => (
            <div key={job._id} className="rounded-lg border border-ink/10 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{job.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{job.company?.name || 'Unknown company'} • {job.location} • {job.jobType}</p>
                  <p className="mt-2 text-sm text-ink-soft/80 line-clamp-2">{job.description || 'No description provided.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateStatus(job._id, 'approved')} className="btn-secondary inline-flex items-center gap-2 text-sm">
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button onClick={() => updateStatus(job._id, 'rejected')} className="btn-ghost inline-flex items-center gap-2 text-sm text-danger">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
