import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Mail,
  Phone,
  Download,
  MapPin,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  Briefcase,
  User,
  GraduationCap,
  Video,
} from 'lucide-react'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']

const statusStyles = {
  Applied: 'bg-ink/5 text-ink-soft',
  Shortlisted: 'bg-signal/15 text-signal-dark',
  Interview: 'bg-blue-100 text-blue-700',
  Selected: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-rose-100 text-rose-800',
}

function getFitBadge(score, recommendation) {
  if (score >= 80)
    return {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: recommendation || 'Strong Fit',
    }
  if (score >= 60)
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: recommendation || 'Moderate Fit',
    }
  return {
    bg: 'bg-rose-50 text-rose-800 border-rose-200',
    label: recommendation || 'Low Fit',
  }
}

export default function ApplicantDetails() {
  const { id } = useParams()
  const { showToast } = useToast()
  const [application, setApplication] = useState(null)
  const [status, setStatus] = useState('Applied')
  const [loading, setLoading] = useState(true)
  const [analyzingAi, setAnalyzingAi] = useState(false)

  useEffect(() => {
    let mounted = true
    api
      .get(`/applications/${id}`)
      .then(({ data }) => {
        if (!mounted) return
        setApplication(data.application)
        setStatus(data.application.status)
      })
      .catch(() => { })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [id])

  async function handleStatusChange(next) {
    if (!application) return
    try {
      await api.put(`/applications/${application._id}/status`, { status: next })
      setStatus(next)
      setApplication({ ...application, status: next })
      showToast(`Status updated to "${next}".`, 'success')
    } catch (err) {
      showToast('Could not update status.', 'danger')
    }
  }

  async function handleRunAiMatch() {
    if (!application) return
    setAnalyzingAi(true)
    try {
      const { data } = await api.post(`/ai/applicant-match/${application._id}`)
      if (data.application) {
        setApplication((prev) => ({ ...prev, ...data.application }))
        showToast(
          `AI Fit Analysis completed: ${data.match.matchScore}% (${data.match.recommendation})`,
          'success'
        )
      }
    } catch (err) {
      showToast(err.message || 'AI Match Analysis failed.', 'danger')
    } finally {
      setAnalyzingAi(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white p-12 text-center text-sm text-ink-soft">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
        <p className="mt-3">Loading candidate profile…</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white p-12 text-center text-sm text-ink-soft">
        Application not found.
      </div>
    )
  }

  const hasAiMatch = typeof application.aiMatchScore === 'number'
  const fitInfo = hasAiMatch
    ? getFitBadge(application.aiMatchScore, application.aiRecommendation)
    : null

  function handleStartVideoInterview() {
    const roomId = `int_${application._id.slice(-6)}_${Math.random().toString(36).substring(2, 7)}`
    const baseParams = `candidate=${encodeURIComponent(application.applicant.name)}&recruiter=${encodeURIComponent(
      user?.name || 'Recruiter'
    )}&job=${encodeURIComponent(application.job.title)}`

    const studentInterviewUrl = `/interview/${roomId}?${baseParams}&role=student`
    const recruiterInterviewUrl = `/interview/${roomId}?${baseParams}&role=recruiter`

    api
      .post('/messages', {
        recipientId: application.applicant._id,
        jobId: application.job._id,
        text: `🎥 Live Video Interview Invitation! Join meeting room here: ${window.location.origin}${studentInterviewUrl}`,
      })
      .catch(() => { })

    window.open(recruiterInterviewUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Applicants', to: '/recruiter/dashboard/applicants' },
          { label: application.applicant.name },
        ]}
      />

      {/* Main Candidate Card */}
      <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-xl font-bold text-signal shadow-sm">
              {application.applicant.photoUrl ? (
                <img
                  src={application.applicant.photoUrl}
                  alt={application.applicant.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                application.applicant.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('') || <User size={24} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-2xl font-bold text-ink">
                  {application.applicant.name}
                </h1>
                <span className={`badge ${statusStyles[status]}`}>{status}</span>
              </div>
              <p className="text-sm font-medium text-ink-soft">
                Applied for <span className="text-ink font-semibold">{application.job.title}</span>{' '}
                • {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live WebRTC Video Interview */}
            <button
              onClick={handleStartVideoInterview}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-xs"
            >
              <Video size={14} className="text-emerald-600" /> Start Video Interview
            </button>

            {/* Direct Real-time Message CTA */}
            <Link
              to={`/recruiter/dashboard/messages?user=${application.applicant._id}&job=${application.job._id}`}
              className="btn-primary inline-flex items-center gap-2 text-xs font-semibold shadow-xs"
            >
              <MessageSquare size={14} /> Message Candidate
            </Link>

            {/* Change Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Stage:</span>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="input-field w-auto py-1.5 text-xs font-semibold"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-6 border-y border-ink/10 py-4 text-xs font-medium text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Mail size={14} className="text-ink-soft" />
            <a href={`mailto:${application.applicant.email}`} className="hover:underline text-ink">
              {application.applicant.email}
            </a>
          </span>
          <span className="flex items-center gap-1.5">
            <Phone size={14} className="text-ink-soft" />
            {application.applicant.phone || 'Phone not provided'}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-ink-soft" />
            {application.job?.company?.location || 'Remote'}
          </span>
          {application.applicant.resumeUrl && (
            <a
              href={application.applicant.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 font-semibold text-signal-dark hover:underline"
            >
              <Download size={14} /> View / Download Resume
            </a>
          )}
        </div>

        {/* AI Fit Match & Scoring Section */}
        <div className="mt-8 rounded-xl border border-signal/30 bg-signal/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal text-ink font-bold shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-display font-bold text-ink">AI Semantic Fit & Match Score</h3>
                <p className="text-xs text-ink-soft">
                  Automated Gemini analysis comparing profile & resume against{' '}
                  <span className="font-medium text-ink">{application.job.title}</span> requirements.
                </p>
              </div>
            </div>

            <button
              onClick={handleRunAiMatch}
              disabled={analyzingAi}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Sparkles size={13} className={analyzingAi ? 'animate-spin' : ''} />
              {analyzingAi ? 'Evaluating Match…' : hasAiMatch ? 'Re-Analyze Fit' : 'Calculate Fit Score'}
            </button>
          </div>

          {hasAiMatch ? (
            <div className="mt-5 space-y-4">
              {/* Score Bar & Badge */}
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 border border-ink/10">
                <div className="flex items-center gap-3">
                  <div className="font-display text-3xl font-black text-ink">
                    {application.aiMatchScore}
                    <span className="text-base font-normal text-ink-soft">/100</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold ${fitInfo?.bg}`}
                  >
                    <Award size={13} />
                    {fitInfo?.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-[200px]">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${application.aiMatchScore >= 80
                        ? 'bg-emerald-600'
                        : application.aiMatchScore >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                        }`}
                      style={{ width: `${application.aiMatchScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              {application.aiMatchSummary && (
                <div className="rounded-lg bg-white p-4 border border-ink/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Recruiter Assessment
                  </p>
                  <p className="mt-1.5 text-sm text-ink leading-relaxed">
                    {application.aiMatchSummary}
                  </p>
                </div>
              )}

              {/* Matched vs Missing Skills Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Matched Skills */}
                <div className="rounded-lg bg-emerald-50/70 p-4 border border-emerald-200">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Overlapping / Matched
                    Skills
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {application.aiMatchedSkills && application.aiMatchedSkills.length > 0 ? (
                      application.aiMatchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-2xs"
                        >
                          ✓ {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-700 italic">
                        No direct skill overlaps identified.
                      </span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="rounded-lg bg-amber-50/70 p-4 border border-amber-200">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
                    <AlertCircle size={14} className="text-amber-600" /> Missing / Skill Gaps
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {application.aiMissingSkills && application.aiMissingSkills.length > 0 ? (
                      application.aiMissingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 shadow-2xs"
                        >
                          • {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700 italic">
                        Candidate meets all specified skill requirements.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg bg-white p-6 text-center border border-ink/10">
              <p className="text-sm text-ink font-medium">Fit analysis not run yet</p>
              <p className="mt-1 text-xs text-ink-soft">
                Click "Calculate Fit Score" to evaluate how well this candidate matches the role.
              </p>
            </div>
          )}
        </div>

        {/* Candidate Profile Details Sections */}
        <div className="mt-8 space-y-6">
          {/* About */}
          <div>
            <h3 className="font-display font-bold text-ink">About Candidate</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              {application.applicant.about || 'No bio provided.'}
            </p>
          </div>

          {/* Skills */}
          <div>
            <h3 className="font-display font-bold text-ink">Skills</h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(application.applicant.skills || []).length > 0 ? (
                application.applicant.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-ink/10 bg-paper px-3 py-1 text-xs font-medium text-ink"
                  >
                    {s}
                  </span>
                ))
              ) : (
                <p className="text-xs text-ink-soft">No skills specified.</p>
              )}
            </div>
          </div>

          {/* Education */}
          <div>
            <h3 className="font-display font-bold text-ink">Education</h3>
            {(application.applicant.education || []).length > 0 ? (
              <div className="mt-2.5 space-y-2">
                {application.applicant.education.map((ed, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-ink/10 bg-paper/40 p-3"
                  >
                    <GraduationCap size={16} className="mt-0.5 text-signal-dark" />
                    <div>
                      <p className="text-sm font-semibold text-ink">{ed.degree}</p>
                      <p className="text-xs text-ink-soft">
                        {ed.institute} • Class of {ed.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">No education history provided.</p>
            )}
          </div>

          {/* Projects */}
          <div>
            <h3 className="font-display font-bold text-ink">Projects</h3>
            {(application.applicant.projects || []).length > 0 ? (
              <div className="mt-2.5 space-y-2.5">
                {application.applicant.projects.map((p, i) => (
                  <div key={i} className="rounded-lg border border-ink/10 bg-paper/40 p-3.5">
                    <p className="text-sm font-semibold text-ink">{p.title}</p>
                    <p className="mt-1 text-xs text-ink-soft leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-soft">No project details provided.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
