import { memo } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Bookmark, Clock } from 'lucide-react'
import { useSavedJobs } from '../../context/SavedJobsContext.jsx'

const typeStyles = {
  'Full Time': 'bg-ink/5 text-ink',
  'Part Time': 'bg-ink/5 text-ink',
  'Internship': 'bg-signal/15 text-signal-dark',
  'Contract': 'bg-ink/5 text-ink',
}

function daysAgo(dateStr) {
  if (!dateStr) return 'Today'
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

function JobCard({ job }) {
  const { isSaved, toggleSave } = useSavedJobs()
  const jobId = job._id || job.id
  const company = job.company || null
  const postedDate = job.postedDate || job.createdAt
  const saved = isSaved(jobId)
  const isExpired = Boolean(job.deadline && new Date() > new Date(job.deadline)) || job.status === 'closed'

  return (
    <div className={`group relative flex overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${
      isExpired ? 'border-rose-200 opacity-90' : 'border-ink/10'
    }`}>
      <Link to={`/jobs/${job.slug}`} className="flex-1 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ink font-display text-sm font-bold text-signal">
            {company?.logo || (company?.name ? company.name[0] : job.title?.[0] ?? '?')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-base font-semibold text-ink group-hover:text-signal-dark">
                {job.title}
              </h3>
              {isExpired && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                  Closed
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft">{company?.name || job.companyName || 'Unknown company'}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span className="flex items-center gap-1"><MapPin size={13} />{job.location}</span>
          <span className="flex items-center gap-1"><Clock size={13} />{daysAgo(postedDate)}</span>
          {job.deadline && (
            <span className={`text-[11px] ${isExpired ? 'text-rose-600 font-semibold' : 'text-ink-soft'}`}>
              {isExpired ? `Expired (${new Date(job.deadline).toLocaleDateString()})` : `Apply by ${new Date(job.deadline).toLocaleDateString()}`}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(job.skills || []).slice(0, 3).map((s) => (
            <span key={s} className="badge bg-paper text-ink-soft">{s}</span>
          ))}
        </div>
      </Link>

      <div className="relative w-px shrink-0 bg-perforation bg-perforation">
        <div className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-paper" />
        <div className="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-paper" />
      </div>

      <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-2 p-3 font-mono">
        <span className={`badge ${typeStyles[job.jobType]}`}>{job.jobType}</span>
        <span className="text-center text-xs font-semibold text-ink">{job.salary}</span>
        <button
          onClick={() => toggleSave(jobId)}
          aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
          className={`mt-1 rounded-full p-1.5 transition-colors ${
            saved ? 'text-signal-dark' : 'text-ink-soft/50 hover:text-ink'
          }`}
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  )
}

export default memo(JobCard)
