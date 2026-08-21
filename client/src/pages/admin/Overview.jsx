import { useEffect, useState } from 'react'
import api from '../../services/api.js'

export default function Overview() {
  const [stats, setStats] = useState({
    students: 0,
    recruiters: 0,
    companies: 0,
    jobs: 0,
    pending: 0,
  })
  const [recentJobs, setRecentJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      api.get('/users', { params: { role: 'student' } }),
      api.get('/users', { params: { role: 'recruiter' } }),
      api.get('/companies'),
      api.get('/jobs/all'),
    ])
      .then(([students, recruiters, companies, jobsResponse]) => {
        if (!mounted) return

        const jobs = jobsResponse.data.jobs || []
        setStats({
          students: students.data.users.length,
          recruiters: recruiters.data.users.length,
          companies: companies.data.companies.length,
          jobs: jobs.length,
          pending: jobs.filter((job) => job.status === 'pending').length,
        })
        setRecentJobs(jobs.slice(0, 3))
      })
      .catch(() => {
        if (mounted) {
          setStats({ students: 0, recruiters: 0, companies: 0, jobs: 0, pending: 0 })
          setRecentJobs([])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const displayStats = [
    { label: 'Total Students', value: stats.students },
    { label: 'Total Recruiters', value: stats.recruiters },
    { label: 'Companies', value: stats.companies },
    { label: 'Total Jobs', value: stats.jobs },
    { label: 'Pending Approvals', value: stats.pending },
  ]

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Platform Overview</h2>
      <p className="mt-1 text-sm text-ink-soft">Live metrics from active users, companies, and job postings.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {displayStats.map((s) => (
          <div key={s.label} className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="font-display text-2xl font-bold text-ink">{loading ? '—' : s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-ink/10 bg-white p-5">
        <h3 className="font-display font-semibold text-ink">Recent job postings</h3>
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-lg border border-ink/10 bg-white p-5 text-sm text-ink-soft">Loading postings…</div>
          ) : recentJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No recent jobs available.</div>
          ) : (
            recentJobs.map((job) => (
              <div key={job._id} className="rounded-lg border border-ink/10 bg-paper p-4">
                <p className="font-medium text-ink">{job.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{job.company?.name || 'Unknown company'} • {job.location}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
