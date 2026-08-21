import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useApplications } from '../../context/ApplicationsContext.jsx'

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']

const statusStyles = {
  Applied: 'bg-ink/5 text-ink-soft',
  Shortlisted: 'bg-signal/15 text-signal-dark',
  Interview: 'bg-blue-100 text-blue-700',
  Selected: 'bg-success/15 text-success',
  Rejected: 'bg-danger/10 text-danger',
}

function StatusTracker({ status }) {
  const activeIndex = status === 'Rejected' ? -1 : STAGES.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STAGES.filter((s) => s !== 'Rejected').map((stage, i) => (
        <div key={stage} className="flex items-center gap-1">
          <div className={`h-1.5 w-6 rounded-full sm:w-10 ${i <= activeIndex ? 'bg-signal' : 'bg-ink/10'}`} />
        </div>
      ))}
    </div>
  )
}

export default function Applications() {
  const { applications } = useApplications()
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? applications : applications.filter((a) => a.status === filter)

  return (
    <div>
      <Helmet><title>My Applications | CareerHub</title></Helmet>
      <h2 className="font-display text-xl font-bold text-ink">My Applications</h2>
      <p className="mt-1 text-sm text-ink-soft">Track where each application stands.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {['All', ...STAGES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`badge border ${filter === s ? 'border-signal bg-signal/15 text-signal-dark' : 'border-ink/15 text-ink-soft'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">
            No applications in this stage yet.
          </div>
        )}
        {filtered.map((app) => {
          const job = app.job
          const company = job?.company
          return (
            <div key={app._id} className="rounded-lg border border-ink/10 bg-white p-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <Link to={`/jobs/${job?.slug}`} className="font-display font-semibold text-ink hover:text-signal-dark">{job?.title || 'Unknown role'}</Link>
                <p className="text-xs text-ink-soft">{company?.name || 'Unknown company'} · Applied {new Date(app.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-3 flex items-center gap-3 sm:mt-0">
                <StatusTracker status={app.status} />
                <span className={`badge ${statusStyles[app.status]}`}>{app.status}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
