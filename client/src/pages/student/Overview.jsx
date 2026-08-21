import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  FileText,
  FileEdit,
  MessageSquareCode,
  Target,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { useSavedJobs } from '../../context/SavedJobsContext.jsx'
import { useApplications } from '../../context/ApplicationsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import api from '../../services/api.js'

const AI_QUICK_TOOLS = [
  {
    title: 'ATS Resume Scanner',
    desc: 'Scan your resume, get your ATS score, and auto-fill your profile.',
    to: '/student/dashboard/resume-analyzer',
    icon: FileText,
    badge: 'Instant Score',
  },
  {
    title: 'Voice Mock Interview',
    desc: 'Practice technical & behavioral questions with real-time AI critique.',
    to: '/student/dashboard/mock-interview',
    icon: MessageSquareCode,
    badge: 'Echo-Isolated',
  },
  {
    title: 'Skill Gap Analysis',
    desc: 'Compare your skills against dream jobs and get targeted learning resources.',
    to: '/student/dashboard/skill-gap',
    icon: Target,
    badge: 'Readiness %',
  },
  {
    title: 'Cover Letter Generator',
    desc: 'Generate tailored, recruiter-ready cover letters for any position.',
    to: '/student/dashboard/cover-letter',
    icon: FileEdit,
    badge: '1-Click',
  },
]

export default function Overview() {
  const { user, refreshUser } = useAuth()
  const { applications } = useApplications()
  const { savedIds } = useSavedJobs()
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)

  const interviews = applications.filter((a) => a.status === 'Interview').length

  useEffect(() => {
    let mounted = true
    if (refreshUser) refreshUser()

    api
      .get('/jobs', { params: { limit: 2, sort: 'newest' } })
      .then(({ data }) => {
        if (mounted) setRecommended(data.jobs)
      })
      .catch(() => {
        if (mounted) setRecommended([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [refreshUser])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Welcome back, {user?.name || 'Student'}</h2>
        <p className="mt-1 text-sm text-ink-soft">Here's your career progress and AI-powered preparation tools.</p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Applications', value: applications.length },
          { label: 'Saved Jobs', value: savedIds.length },
          { label: 'Interviews', value: interviews },
          { label: 'Profile Views', value: user?.profileViews || 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
            <p className="font-display text-3xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Career Tools Quick Access Hub */}
      <div className="rounded-2xl border border-signal/30 bg-gradient-to-r from-signal/15 via-white to-paper p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-signal shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">AI Career Tools Hub</h3>
              <p className="text-xs text-ink-soft">Accelerate your job search with intelligent Gemini career tools.</p>
            </div>
          </div>

          <Link
            to="/student/dashboard/ai-suite"
            className="btn-primary text-xs flex items-center gap-1.5 font-semibold"
          >
            <span>Open All-in-One AI Studio</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {AI_QUICK_TOOLS.map((t) => {
            const Icon = t.icon
            return (
              <Link
                key={t.title}
                to={t.to}
                className="group flex flex-col justify-between rounded-xl border border-ink/10 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-signal hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper text-ink group-hover:bg-signal/20 group-hover:text-signal-dark transition">
                      <Icon size={16} />
                    </div>
                    <span className="badge bg-signal/15 text-signal-dark text-[10px] font-bold uppercase">
                      {t.badge}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-ink group-hover:text-signal-dark transition">
                    {t.title}
                  </h4>
                  <p className="mt-1 text-xs text-ink-soft leading-relaxed line-clamp-2">
                    {t.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-signal-dark group-hover:underline">
                  <span>Launch Tool</span>
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recommended Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-ink">Recommended for You</h3>
          <Link to="/jobs" className="text-xs font-semibold text-signal-dark hover:underline flex items-center gap-1">
            <span>Explore all jobs</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {loading ? (
            <div className="rounded-xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">Loading recommendations…</div>
          ) : recommended.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No recommendations available right now.</div>
          ) : (
            recommended.map((job) => <JobCard key={job._id || job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  )
}
