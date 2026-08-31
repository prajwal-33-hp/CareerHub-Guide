import { Link } from 'react-router-dom'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext.jsx'
import Modal from '../../components/common/Modal.jsx'
import api from '../../services/api.js'

const statusStyles = {
  pending: 'bg-ink/5 text-ink-soft',
  approved: 'bg-signal/15 text-signal-dark',
  rejected: 'bg-danger/10 text-danger',
  closed: 'bg-ink/10 text-ink-soft',
}

export default function MyJobs() {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([api.get('/jobs/mine'), api.get('/applications/recruiter')])
      .then(([jobsResponse, appsResponse]) => {
        if (!mounted) return
        setJobs(jobsResponse.data.jobs)
        setApplications(appsResponse.data.applications)
      })
      .catch(() => {
        if (mounted) {
          setJobs([])
          setApplications([])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const applicantCounts = applications.reduce((counts, application) => {
    const jobId = application.job?._id || application.job
    counts[jobId] = (counts[jobId] || 0) + 1
    return counts
  }, {})

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      await api.delete(`/jobs/${deleteTarget._id}`)
      setJobs((prev) => prev.filter((job) => job._id !== deleteTarget._id))
      showToast(`"${deleteTarget.title}" was deleted.`, 'success')
    } catch {
      showToast('Unable to delete job. Please try again.', 'danger')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">My Jobs</h2>
          <p className="text-sm text-ink-soft">Manage the roles you have posted and view applicant counts.</p>
        </div>
        <Link to="/recruiter/dashboard/jobs/new" className="btn-primary text-sm">Post a Job</Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Applicants</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-sm text-ink-soft">Loading your jobs…</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center">
                  <div className="mx-auto max-w-sm space-y-2">
                    <p className="font-semibold text-sm text-ink">No jobs or internships posted yet</p>
                    <p className="text-xs text-ink-soft">Create your company's first official listing to start receiving student applications.</p>
                    <div className="pt-2">
                      <Link to="/recruiter/dashboard/jobs/new" className="btn-primary text-xs">
                        + Post a Job or Internship
                      </Link>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j._id}>
                  <td className="px-4 py-3 font-medium text-ink">{j.title}</td>
                  <td className="px-4 py-3 text-ink-soft">{j.jobType}</td>
                  <td className="px-4 py-3 text-ink-soft">{j.location}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusStyles[j.status]}`}>{j.status}</span></td>
                  <td className="px-4 py-3 text-ink-soft">{new Date(j.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-ink-soft">{applicantCounts[j._id] || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-ink-soft">
                      <Link to={`/jobs/${j.slug}`} aria-label="View job" className="hover:text-ink"><Eye size={16} /></Link>
                      <Link to={`/recruiter/dashboard/jobs/${j._id}/edit`} aria-label="Edit job" className="hover:text-ink"><Pencil size={16} /></Link>
                      <button onClick={() => setDeleteTarget(j)} aria-label="Delete job" className="hover:text-danger"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete job posting?">
        <p className="text-sm text-ink-soft">
          This will permanently remove "{deleteTarget?.title}" and its applicant data. This cannot be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={confirmDelete} className="btn-primary flex-1 !bg-danger !text-white hover:!bg-danger/90">Delete</button>
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
