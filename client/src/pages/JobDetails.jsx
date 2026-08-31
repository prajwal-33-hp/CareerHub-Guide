import { useState, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  MapPin,
  Briefcase,
  Wallet,
  Clock,
  CalendarClock,
  Bookmark,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  Sparkles,
  FilePen,
  Users,
} from 'lucide-react'
import Breadcrumb from '../components/common/Breadcrumb.jsx'
import Modal from '../components/common/Modal.jsx'
import JobCard from '../components/jobs/JobCard.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useSavedJobs } from '../context/SavedJobsContext.jsx'
import { useApplications } from '../context/ApplicationsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'

export default function JobDetails() {
  const { slug } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { isSaved, toggleSave } = useSavedJobs()
  const { hasApplied, applyToJob } = useApplications()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api
      .get(`/jobs/${slug}`)
      .then(({ data }) => {
        if (!mounted) return
        setJob(data.job)
      })
      .catch(() => {
        if (!mounted) return
        setError(true)
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">Loading job details…</div>
  }

  if (error || !job) {
    return <Navigate to="/404" replace />
  }

  const company = job.company
  const saved = isSaved(job._id)
  const applied = hasApplied(job._id)
  const isExpired = Boolean(job.deadline && new Date() > new Date(job.deadline)) || job.status === 'closed'
  const recruiterUserId =
    job.postedBy?._id ||
    (typeof job.postedBy === 'string' ? job.postedBy : null) ||
    company?.owner?._id ||
    (typeof company?.owner === 'string' ? company?.owner : null)
  const isOwnerRecruiter = user && recruiterUserId && String(recruiterUserId) === String(user._id)
  const isRecruiterOrAdmin = user && (user.role === 'recruiter' || user.role === 'admin')

  function handleApply() {
    if (isRecruiterOrAdmin) {
      showToast('Recruiters and Admins cannot apply for jobs.', 'danger')
      return
    }
    if (isExpired) {
      showToast('This job application deadline has passed.', 'danger')
      return
    }
    applyToJob(job._id)
    setApplyOpen(false)
    showToast('Application submitted! You can track its status from your dashboard.', 'success')
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.postedDate,
    validThrough: job.deadline,
    employmentType: job.jobType.toUpperCase().replace(' ', '_'),
    hiringOrganization: { '@type': 'Organization', name: company?.name },
    jobLocation: { '@type': 'Place', address: job.location },
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{`${job.title} at ${company?.name} | CareerHub`}</title>
        <meta
          name="description"
          content={`Apply for ${job.title} at ${company?.name} in ${job.location}. ${job.description.slice(
            0,
            100
          )}`}
        />
        <meta property="og:title" content={`${job.title} at ${company?.name}`} />
        <meta property="og:description" content={job.description} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Jobs', to: '/jobs' },
          { label: job.title },
        ]}
      />

      {/* Deadline Expired Warning Banner */}
      {isExpired && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
          <XCircle size={18} className="shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">Applications are Closed</p>
            <p className="text-xs text-rose-700">
              The application deadline ({job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Expired'}) for this position has passed. This job is no longer accepting new submissions.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-ink font-display text-lg font-bold text-signal">
              {company?.logo}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">{job.title}</h1>
              <Link
                to={`/companies/${company?.slug}`}
                className="text-sm text-ink-soft hover:text-signal-dark"
              >
                {company?.name}
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwnerRecruiter ? (
              <>
                <Link
                  to={`/recruiter/dashboard/jobs/${job._id}/edit`}
                  className="btn-secondary flex items-center gap-1.5 text-xs font-semibold"
                >
                  <FilePen size={15} /> Edit Job
                </Link>
                <Link
                  to={`/recruiter/dashboard/applicants?job=${job._id}`}
                  className="btn-primary flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Users size={15} /> View Applicants
                </Link>
              </>
            ) : isRecruiterOrAdmin ? null : applied ? (
              <span className="btn-secondary cursor-default !border-success/30 !text-success">
                <CheckCircle2 size={16} /> Applied
              </span>
            ) : isExpired ? (
              <span className="btn-secondary cursor-not-allowed bg-rose-50 !text-rose-700 !border-rose-200">
                <XCircle size={16} /> Applications Closed
              </span>
            ) : (
              <button onClick={() => setApplyOpen(true)} className="btn-primary">
                Apply Now
              </button>
            )}

            {!isRecruiterOrAdmin && (
              <button
                onClick={() => toggleSave(job._id)}
                className={`btn-secondary ${saved ? 'border-signal text-signal-dark' : ''}`}
              >
                <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
              </button>
            )}

            {!isOwnerRecruiter && recruiterUserId && (
              <Link
                to={`/student/dashboard/messages?user=${recruiterUserId}&job=${job._id}`}
                className="btn-secondary flex items-center gap-1.5 text-xs text-ink font-semibold hover:border-signal"
              >
                <MessageSquare size={15} /> Message Recruiter
              </Link>
            )}

            {!isRecruiterOrAdmin && (
              <Link
                to={`/student/dashboard/cover-letter?job=${encodeURIComponent(
                  job.title
                )}&company=${encodeURIComponent(company?.name || '')}`}
                className="btn-secondary flex items-center gap-1.5 text-xs text-signal-dark"
              >
                <Sparkles size={15} /> AI Cover Letter
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-ink/10 py-5 font-mono text-xs sm:grid-cols-4">
          <div className="flex items-center gap-1.5 text-ink-soft">
            <MapPin size={14} />
            {job.location}
          </div>
          <div className="flex items-center gap-1.5 text-ink-soft">
            <Wallet size={14} />
            {job.salary}
          </div>
          <div className="flex items-center gap-1.5 text-ink-soft">
            <Briefcase size={14} />
            {job.experience}
          </div>
          <div className={`flex items-center gap-1.5 ${isExpired ? 'text-rose-600 font-semibold' : 'text-ink-soft'}`}>
            <CalendarClock size={14} />
            {job.deadline
              ? isExpired
                ? `Closed on ${new Date(job.deadline).toLocaleDateString()}`
                : `Apply by ${new Date(job.deadline).toLocaleDateString()}`
              : 'Open Application'}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">About the role</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{job.description}</p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Responsibilities</h2>
            <ul className="mt-2 space-y-1.5">
              {job.responsibilities.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-ink-soft">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" /> {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Requirements</h2>
            <ul className="mt-2 space-y-1.5">
              {job.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-ink-soft">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-signal-dark" /> {r}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Benefits</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {job.benefits.map((b) => (
                <span key={b} className="badge bg-paper text-ink-soft">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>


      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Apply to ${job.title}`}>
        <p className="text-sm text-ink-soft">
          You're applying as yourself, using the resume on your profile. Confirm to submit your application to {company?.name}.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={handleApply} className="btn-primary flex-1">Confirm & Apply</button>
          <button onClick={() => setApplyOpen(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
