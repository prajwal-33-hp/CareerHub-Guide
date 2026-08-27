import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Calendar, Video, Clock } from 'lucide-react'
import { useApplications } from '../../context/ApplicationsContext.jsx'
import InterviewScheduleCard from '../../components/interview/InterviewScheduleCard.jsx'
import api from '../../services/api.js'

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']

const statusStyles = {
  Applied: 'bg-ink/5 text-ink-soft',
  Shortlisted: 'bg-signal/15 text-signal-dark',
  Interview: 'bg-blue-100 text-blue-700 font-bold',
  Selected: 'bg-success/15 text-success font-bold',
  Rejected: 'bg-danger/10 text-danger',
}

function StatusTracker({ status }) {
  const activeIndex = status === 'Rejected' ? -1 : STAGES.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STAGES.filter((s) => s !== 'Rejected').map((stage, i) => (
        <div key={stage} className="flex items-center gap-1">
          <div
            className={`h-1.5 w-6 rounded-full sm:w-10 ${
              i <= activeIndex ? 'bg-signal' : 'bg-ink/10'
            }`}
          />
        </div>
      ))}
    </div>
  )
}

export default function Applications() {
  const { applications, refreshApplications } = useApplications()
  const [filter, setFilter] = useState('All')
  const [interviews, setInterviews] = useState([])
  const [loadingInterviews, setLoadingInterviews] = useState(true)

  function loadInterviews() {
    api
      .get('/interviews/mine')
      .then(({ data }) => {
        setInterviews(data.interviews || [])
      })
      .catch(() => {
        setInterviews([])
      })
      .finally(() => setLoadingInterviews(false))
  }

  useEffect(() => {
    loadInterviews()
  }, [])

  const filtered =
    filter === 'All'
      ? applications
      : applications.filter((a) => a.status === filter)

  return (
    <div>
      <Helmet>
        <title>My Applications | CareerHub</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">My Applications</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Track application progress, select interview slots, and access calendar invites.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['All', ...STAGES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`badge border transition-colors ${
              filter === s
                ? 'border-signal bg-signal/15 text-signal-dark font-bold'
                : 'border-ink/15 text-ink-soft hover:bg-paper'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">
            No applications in this stage yet.
          </div>
        )}

        {filtered.map((app) => {
          const job = app.job
          const company = job?.company

          // Find matching scheduled interview for this application
          const matchedInterview = interviews.find(
            (i) =>
              String(i.application?._id || i.application) === String(app._id) ||
              String(i.job?._id || i.job) === String(job?._id)
          )

          return (
            <div
              key={app._id}
              className="rounded-xl border border-ink/10 bg-white p-5 shadow-2xs space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Link
                    to={`/jobs/${job?.slug}`}
                    className="font-display font-bold text-base text-ink hover:text-signal-dark"
                  >
                    {job?.title || 'Unknown role'}
                  </Link>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {company?.name || 'Unknown company'} · Applied{' '}
                    {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusTracker status={app.status} />
                  <span className={`badge ${statusStyles[app.status]}`}>{app.status}</span>
                </div>
              </div>

              {/* Integrated Interview Card for Interview Stage */}
              {matchedInterview && (
                <div className="mt-3 pt-3 border-t border-ink/5">
                  <InterviewScheduleCard
                    interview={matchedInterview}
                    onUpdated={() => {
                      loadInterviews()
                      if (refreshApplications) refreshApplications()
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
