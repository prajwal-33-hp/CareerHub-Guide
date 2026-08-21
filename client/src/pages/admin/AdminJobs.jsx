import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function AdminJobs() {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/jobs/all')
      .then(({ data }) => {
        if (!mounted) return
        setJobs(data.jobs || [])
      })
      .catch(() => {
        if (mounted) setJobs([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function toggleApproval(job) {
    const nextStatus = job.status === 'approved' ? 'rejected' : 'approved'

    try {
      const { data } = await api.put(`/jobs/${job._id}/status`, { status: nextStatus })
      setJobs((prevJobs) => prevJobs.map((j) => (j._id === job._id ? data.job : j)))
      showToast(`${job.title} ${nextStatus === 'approved' ? 'approved' : 'rejected'}.`, nextStatus === 'approved' ? 'success' : 'error')
    } catch (error) {
      showToast('Unable to update job status. Please try again.', 'error')
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Manage Jobs</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {jobs.map((j) => (
              <tr key={j._id}>
                <td className="px-4 py-3 font-medium text-ink">{j.title}</td>
                <td className="px-4 py-3 text-ink-soft">{j.company?.name || 'Unknown company'}</td>
                <td className="px-4 py-3 text-ink-soft">{j.jobType}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${j.status === 'approved' ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'}`}>
                    {j.status === 'approved' ? 'Approved' : j.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleApproval(j)} className="flex items-center gap-1 justify-end text-xs font-medium text-ink-soft hover:text-ink ml-auto">
                    {j.status === 'approved' ? <><XCircle size={14} /> Reject</> : <><CheckCircle2 size={14} /> Approve</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
