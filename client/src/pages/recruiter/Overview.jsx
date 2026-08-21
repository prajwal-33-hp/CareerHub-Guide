import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api.js'

const funnelStages = [
  { stage: 'Applied', colorClass: 'bg-ink/5 text-ink-soft' },
  { stage: 'Shortlisted', colorClass: 'bg-signal/15 text-signal-dark' },
  { stage: 'Interview', colorClass: 'bg-blue-100 text-blue-700' },
  { stage: 'Selected', colorClass: 'bg-success/15 text-success' },
  { stage: 'Rejected', colorClass: 'bg-danger/10 text-danger' },
]

const statusStyles = {
  Applied: 'bg-ink/5 text-ink-soft',
  Shortlisted: 'bg-signal/15 text-signal-dark',
  Interview: 'bg-blue-100 text-blue-700',
  Selected: 'bg-success/15 text-success',
  Rejected: 'bg-danger/10 text-danger',
}

export default function Overview() {
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
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

  const pendingInterviews = useMemo(
    () => applications.filter((a) => a.status === 'Interview').length,
    [applications]
  )

  const averageTimeToHire = useMemo(() => {
    const selectedApplications = applications.filter(
      (a) => a.status === 'Selected' && a.createdAt && a.updatedAt
    )

    if (selectedApplications.length === 0) return null

    const totalDays = selectedApplications.reduce((sum, app) => {
      const created = new Date(app.createdAt)
      const updated = new Date(app.updatedAt)
      return sum + Math.max(0, (updated - created) / (1000 * 60 * 60 * 24))
    }, 0)

    return Math.round(totalDays / selectedApplications.length)
  }, [applications])

  const stats = useMemo(() => {
    const applied = applications.length
    const activeJobs = jobs.length
    const shortlisted = applications.filter((a) => a.status === 'Shortlisted').length
    const selected = applications.filter((a) => a.status === 'Selected').length
    const rejected = applications.filter((a) => a.status === 'Rejected').length

    return [
      { label: 'Total Jobs', value: activeJobs },
      { label: 'Applicants', value: applied },
      { label: 'Pending interviews', value: pendingInterviews },
      { label: 'Avg time to hire', value: averageTimeToHire !== null ? `${averageTimeToHire} days` : '—' },
      { label: 'Shortlisted', value: shortlisted },
      { label: 'Selected', value: selected },
      { label: 'Rejected', value: rejected },
    ]
  }, [applications, jobs, pendingInterviews, averageTimeToHire])

  const funnelData = useMemo(() => {
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {})

    return funnelStages.map((stage) => ({
      ...stage,
      count: counts[stage.stage] || 0,
      pct: applications.length ? Math.round(((counts[stage.stage] || 0) / applications.length) * 100) : 0,
    }))
  }, [applications])

  const topJobs = useMemo(() => {
    const counts = applications.reduce((acc, app) => {
      const jobId = app.job._id || app.job
      acc[jobId] = acc[jobId] || { title: app.job.title, count: 0, id: jobId }
      acc[jobId].count += 1
      return acc
    }, {})

    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3)
  }, [applications])

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Dashboard Overview</h2>
      <p className="mt-1 text-sm text-ink-soft">A snapshot of your hiring activity.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="font-display text-2xl font-bold text-ink">{loading ? '—' : s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-ink/10 bg-white p-5">
        <h3 className="font-display font-semibold text-ink">Applicant funnel</h3>
        <div className="mt-4 space-y-2">
          {funnelData.map((row) => (
            <div key={row.stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-ink-soft">{row.stage}</span>
              <div className="h-2.5 flex-1 rounded-full bg-ink/5">
                <div className="h-2.5 rounded-full bg-signal" style={{ width: `${row.pct}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs text-ink-soft">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-ink">Recently posted</h3>
              <p className="text-sm text-ink-soft">Your newest live job listings.</p>
            </div>
            <Link to="/recruiter/dashboard/jobs" className="text-xs font-semibold text-signal-dark hover:underline">See all jobs</Link>
          </div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="rounded-lg border border-ink/10 bg-white p-5">Loading recent roles…</div>
            ) : jobs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No jobs posted yet.</div>
            ) : (
              jobs.slice(0, 3).map((j) => (
                <div key={j._id} className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{j.title}</p>
                    <p className="text-xs text-ink-soft">{j.jobType} · {j.location}</p>
                  </div>
                  <span className="text-xs text-ink-soft">Posted {new Date(j.createdAt).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-ink">Recent applicants</h3>
              <p className="text-sm text-ink-soft">Track the latest candidates who applied to your roles.</p>
            </div>
            <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">
              {loading ? '—' : applications.length} total
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-lg border border-ink/10 bg-paper p-5">Loading applicants…</div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink/20 py-10 text-center text-sm text-ink-soft">No applications yet.</div>
            ) : (
              applications.slice(0, 3).map((app) => (
                <Link key={app._id} to={`/recruiter/dashboard/applicants/${app._id}`} className="grid gap-3 rounded-lg border border-ink/10 p-4 transition hover:border-signal/40 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-semibold text-ink">{app.applicant.name}</p>
                    <p className="text-xs text-ink-soft">Applied for {app.job.title}</p>
                    <p className="text-xs text-ink-soft">{new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${statusStyles[app.status]}`}>{app.status}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-ink/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-ink">Top jobs by applicants</h3>
            <p className="text-sm text-ink-soft">Know which roles are attracting the most interest.</p>
          </div>
          <Link to="/recruiter/dashboard/jobs" className="text-xs font-semibold text-signal-dark hover:underline">Manage jobs</Link>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-lg border border-ink/10 bg-paper p-5">Loading top jobs…</div>
          ) : topJobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/20 py-10 text-center text-sm text-ink-soft">No applicant activity yet.</div>
          ) : (
            topJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{job.title}</p>
                  <p className="text-xs text-ink-soft">{job.count} applicants</p>
                </div>
                <span className="badge bg-signal/15 text-signal-dark">Hot</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
