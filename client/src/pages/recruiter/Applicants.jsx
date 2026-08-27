import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  List,
  Sparkles,
  Search,
  MessageSquare,
  ChevronRight,
  User,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react'
import ScheduleInterviewModal from '../../components/interview/ScheduleInterviewModal.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']

const STAGE_CONFIG = {
  Applied: {
    label: 'Applied',
    badgeClass: 'bg-ink/5 text-ink-soft border-ink/10',
    headerBg: 'bg-slate-50 text-slate-700 border-slate-200',
    cardBorder: 'hover:border-slate-300',
  },
  Shortlisted: {
    label: 'Shortlisted',
    badgeClass: 'bg-signal/15 text-signal-dark border-signal/20',
    headerBg: 'bg-amber-50 text-amber-900 border-amber-200',
    cardBorder: 'hover:border-signal/50',
  },
  Interview: {
    label: 'Interview',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'bg-blue-50 text-blue-900 border-blue-200',
    cardBorder: 'hover:border-blue-300',
  },
  Selected: {
    label: 'Selected / Offer',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    cardBorder: 'hover:border-emerald-300',
  },
  Rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    headerBg: 'bg-rose-50 text-rose-900 border-rose-200',
    cardBorder: 'hover:border-rose-300',
  },
}

function getFitScoreColor(score) {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-rose-50 text-rose-700 border-rose-200'
}

export default function Applicants() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [viewMode, setViewMode] = useState('kanban') // 'kanban' | 'table'
  const [jobFilter, setJobFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('fit') // 'fit' | 'newest' | 'name'

  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState({})
  const [analyzingIds, setAnalyzingIds] = useState({})
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)

  // Drag & drop state
  const [draggingAppId, setDraggingAppId] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)
  const [schedulingApp, setSchedulingApp] = useState(null)

  function loadData() {
    setLoading(true)
    Promise.all([api.get('/applications/recruiter'), api.get('/jobs/mine')])
      .then(([appsResponse, jobsResponse]) => {
        setApplications(appsResponse.data.applications || [])
        setJobs(jobsResponse.data.jobs || [])
      })
      .catch((err) => {
        showToast(err.message || 'Failed to load applicants', 'danger')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  async function updateStatus(applicationId, nextStatus) {
    setStatusLoading((prev) => ({ ...prev, [applicationId]: true }))
    try {
      await api.put(`/applications/${applicationId}/status`, { status: nextStatus })
      setApplications((prev) =>
        prev.map((app) => (app._id === applicationId ? { ...app, status: nextStatus } : app))
      )
      showToast(`Moved candidate to "${nextStatus}" stage.`, 'success')
    } catch (err) {
      showToast(err.message || 'Failed to update application status.', 'danger')
    } finally {
      setStatusLoading((prev) => {
        const next = { ...prev }
        delete next[applicationId]
        return next
      })
    }
  }

  async function handleAnalyzeFit(e, applicationId) {
    if (e) e.stopPropagation()
    setAnalyzingIds((prev) => ({ ...prev, [applicationId]: true }))

    try {
      const { data } = await api.post(`/ai/applicant-match/${applicationId}`)
      if (data.application) {
        setApplications((prev) =>
          prev.map((app) => (app._id === applicationId ? { ...app, ...data.application } : app))
        )
        showToast(
          `Analyzed fit score: ${data.match.matchScore}% (${data.match.recommendation})`,
          'success'
        )
      }
    } catch (err) {
      showToast(err.message || 'Could not analyze applicant match.', 'danger')
    } finally {
      setAnalyzingIds((prev) => {
        const next = { ...prev }
        delete next[applicationId]
        return next
      })
    }
  }

  async function handleBatchAutoRank() {
    if (jobFilter === 'all' && jobs.length > 0) {
      showToast('Please select a specific job filter above to auto-rank candidates.', 'info')
      return
    }
    const targetJobId = jobFilter !== 'all' ? jobFilter : jobs[0]?._id
    if (!targetJobId) return

    setBatchAnalyzing(true)
    try {
      const { data } = await api.post(`/ai/batch-match/${targetJobId}`)
      showToast(data.message || 'Auto-ranked candidates successfully!', 'success')
      loadData()
    } catch (err) {
      showToast(err.message || 'Batch ranking failed.', 'danger')
    } finally {
      setBatchAnalyzing(false)
    }
  }

  // Drag & drop handlers
  function handleDragStart(e, appId) {
    setDraggingAppId(appId)
    e.dataTransfer.setData('text/plain', appId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStage !== stage) {
      setDragOverStage(stage)
    }
  }

  function handleDragLeave(e, stage) {
    if (dragOverStage === stage) {
      setDragOverStage(null)
    }
  }

  function handleDrop(e, stage) {
    e.preventDefault()
    setDragOverStage(null)
    const appId = e.dataTransfer.getData('text/plain') || draggingAppId
    if (appId) {
      const app = applications.find((a) => a._id === appId)
      if (app && app.status !== stage) {
        updateStatus(appId, stage)
      }
    }
    setDraggingAppId(null)
  }

  // Filter & sort
  const filtered = useMemo(() => {
    return applications
      .filter((app) => {
        if (jobFilter !== 'all' && String(app.job?._id) !== String(jobFilter)) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const nameMatch = app.applicant?.name?.toLowerCase().includes(q)
          const jobMatch = app.job?.title?.toLowerCase().includes(q)
          const skillMatch = (app.applicant?.skills || []).some((s) => s.toLowerCase().includes(q))
          if (!nameMatch && !jobMatch && !skillMatch) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'fit') {
          const scoreA = typeof a.aiMatchScore === 'number' ? a.aiMatchScore : -1
          const scoreB = typeof b.aiMatchScore === 'number' ? b.aiMatchScore : -1
          return scoreB - scoreA
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt) - new Date(a.createdAt)
        }
        if (sortBy === 'name') {
          return (a.applicant?.name || '').localeCompare(b.applicant?.name || '')
        }
        return 0
      })
  }, [applications, jobFilter, searchQuery, sortBy])

  // Group by stage for Kanban
  const stageGroups = useMemo(() => {
    const groups = {}
    STAGES.forEach((stage) => {
      groups[stage] = filtered.filter((app) => app.status === stage)
    })
    return groups
  }, [filtered])

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Applicant Pipeline & Review</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage candidates across hiring stages, run AI fit scoring, and move applicants seamlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleBatchAutoRank}
            disabled={batchAnalyzing || loading}
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Sparkles size={14} className={batchAnalyzing ? 'animate-spin' : ''} />
            {batchAnalyzing ? 'Analyzing Candidates…' : '✨ AI Auto-Rank Candidates'}
          </button>

          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-ink/10 bg-white p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'kanban' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'table' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
            >
              <List size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-ink/10 bg-white p-3.5 sm:grid-cols-3 lg:grid-cols-4">
        {/* Search */}
        <div className="relative sm:col-span-1 lg:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search candidate name, skill, or role…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-xs"
          />
        </div>

        {/* Job Filter */}
        <div>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="input-field text-xs"
          >
            <option value="all">All Job Postings ({applications.length})</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title} ({applications.filter((a) => String(a.job?._id) === String(j._id)).length})
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field text-xs"
          >
            <option value="fit">Sort: Highest AI Fit Score</option>
            <option value="newest">Sort: Newest Applied</option>
            <option value="name">Sort: Candidate Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="rounded-xl border border-ink/10 bg-white p-12 text-center text-sm text-ink-soft">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
          <p className="mt-3">Loading candidate pipeline…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 bg-white py-16 text-center">
          <User size={36} className="mx-auto text-ink-soft/40" />
          <h3 className="mt-3 font-display font-semibold text-ink">No candidates found</h3>
          <p className="mt-1 text-xs text-ink-soft">
            Try adjusting your search criteria or job filter above.
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Pipeline Board */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {STAGES.map((stage) => {
            const conf = STAGE_CONFIG[stage]
            const stageApps = stageGroups[stage] || []
            const isOver = dragOverStage === stage

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={(e) => handleDragLeave(e, stage)}
                onDrop={(e) => handleDrop(e, stage)}
                className={`flex flex-col rounded-xl border transition-all duration-200 ${isOver
                  ? 'border-signal bg-signal/5 ring-2 ring-signal/20'
                  : 'border-ink/10 bg-paper/40'
                  }`}
                style={{ minHeight: '520px' }}
              >
                {/* Column Header */}
                <div
                  className={`flex items-center justify-between border-b px-3.5 py-3 font-display text-xs font-semibold ${conf.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{conf.label}</span>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold shadow-xs">
                    {stageApps.length}
                  </span>
                </div>

                {/* Column Card Stream */}
                <div className="flex-1 space-y-3 p-2.5">
                  {stageApps.length === 0 ? (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-ink/15 text-center text-xs text-ink-soft/60">
                      Drag candidates here
                    </div>
                  ) : (
                    stageApps.map((app) => {
                      const hasAiScore = typeof app.aiMatchScore === 'number'
                      const isAnalyzing = analyzingIds[app._id]

                      return (
                        <div
                          key={app._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app._id)}
                          className={`group relative cursor-grab rounded-lg border border-ink/10 bg-white p-3.5 shadow-xs transition hover:shadow-md active:cursor-grabbing ${conf.cardBorder}`}
                        >
                          {/* Candidate Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xs font-bold text-signal">
                                {app.applicant?.photoUrl ? (
                                  <img
                                    src={app.applicant.photoUrl}
                                    alt={app.applicant.name}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  app.applicant?.name
                                    ?.split(' ')
                                    .map((n) => n[0])
                                    .join('') || <User size={14} />
                                )}
                              </div>
                              <div>
                                <Link
                                  to={`/recruiter/dashboard/applicants/${app._id}`}
                                  className="font-display text-xs font-bold text-ink hover:text-signal-dark"
                                >
                                  {app.applicant?.name || 'Applicant'}
                                </Link>
                                <p className="text-[11px] text-ink-soft line-clamp-1">
                                  {app.job?.title}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* AI Fit Match Badge */}
                          <div className="mt-3">
                            {hasAiScore ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFitScoreColor(
                                      app.aiMatchScore
                                    )}`}
                                  >
                                    <Sparkles size={10} />
                                    {app.aiMatchScore}% Match • {app.aiRecommendation}
                                  </span>
                                </div>
                                {app.aiMatchedSkills && app.aiMatchedSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {app.aiMatchedSkills.slice(0, 3).map((s) => (
                                      <span
                                        key={s}
                                        className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-800"
                                      >
                                        ✓ {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleAnalyzeFit(e, app._id)}
                                disabled={isAnalyzing}
                                className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-signal/40 bg-signal/5 py-1 text-[10px] font-semibold text-signal-dark transition hover:bg-signal/15"
                              >
                                <Sparkles size={11} className={isAnalyzing ? 'animate-spin' : ''} />
                                {isAnalyzing ? 'Analyzing…' : '✨ Score Fit with AI'}
                              </button>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="mt-3 flex items-center justify-between border-t border-ink/5 pt-2.5 text-[11px] text-ink-soft">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(app.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Schedule Interview Modal Trigger */}
                              <button
                                type="button"
                                onClick={() => setSchedulingApp(app)}
                                title="Schedule Interview"
                                className="rounded p-1 text-ink-soft hover:bg-amber-50 hover:text-amber-700 transition-colors"
                              >
                                <Calendar size={13} />
                              </button>

                              {/* Direct Message Link */}
                              <Link
                                to={`/recruiter/dashboard/messages?user=${app.applicant?._id}&job=${app.job?._id}`}
                                title="Message Candidate"
                                className="rounded p-1 text-ink-soft hover:bg-ink/5 hover:text-signal-dark"
                              >
                                <MessageSquare size={13} />
                              </Link>

                              {/* View Details */}
                              <Link
                                to={`/recruiter/dashboard/applicants/${app._id}`}
                                title="View Application Details"
                                className="rounded p-1 text-ink-soft hover:bg-ink/5 hover:text-ink"
                              >
                                <ChevronRight size={14} />
                              </Link>
                            </div>
                          </div>

                          {/* Quick Stage Change Dropdown */}
                          <div className="mt-2">
                            <select
                              value={app.status}
                              onChange={(e) => updateStatus(app._id, e.target.value)}
                              disabled={Boolean(statusLoading[app._id])}
                              className="w-full rounded border border-ink/10 bg-paper py-1 px-1.5 text-[10px] font-medium text-ink focus:border-signal"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  Move to {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Applied For</th>
                <th className="px-4 py-3">AI Fit Match</th>
                <th className="px-4 py-3">Applied On</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map((app) => {
                const hasScore = typeof app.aiMatchScore === 'number'
                const isAnalyzing = analyzingIds[app._id]

                return (
                  <tr key={app._id} className="transition hover:bg-paper/40">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-xs font-bold text-signal">
                          {app.applicant?.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                        </div>
                        <div>
                          <Link
                            to={`/recruiter/dashboard/applicants/${app._id}`}
                            className="font-medium text-ink hover:text-signal-dark"
                          >
                            {app.applicant?.name}
                          </Link>
                          <p className="text-xs text-ink-soft">{app.applicant?.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-ink-soft">{app.job?.title}</td>

                    <td className="px-4 py-3.5">
                      {hasScore ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${getFitScoreColor(
                              app.aiMatchScore
                            )}`}
                          >
                            <Sparkles size={11} /> {app.aiMatchScore}% • {app.aiRecommendation}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleAnalyzeFit(e, app._id)}
                          disabled={isAnalyzing}
                          className="btn-secondary text-xs inline-flex items-center gap-1"
                        >
                          <Sparkles size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                          {isAnalyzing ? 'Analyzing…' : 'Calculate Fit'}
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-ink-soft">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app._id, e.target.value)}
                        disabled={Boolean(statusLoading[app._id])}
                        className="rounded border border-ink/15 bg-white py-1 px-2 text-xs font-semibold text-ink"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSchedulingApp(app)}
                          className="btn-secondary text-xs inline-flex items-center gap-1 bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                        >
                          <Calendar size={13} /> Schedule
                        </button>
                        <Link
                          to={`/recruiter/dashboard/messages?user=${app.applicant?._id}&job=${app.job?._id}`}
                          className="btn-secondary text-xs inline-flex items-center gap-1"
                        >
                          <MessageSquare size={13} /> Chat
                        </Link>
                        <Link
                          to={`/recruiter/dashboard/applicants/${app._id}`}
                          className="btn-primary text-xs inline-flex items-center gap-1"
                        >
                          View Details <ChevronRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {schedulingApp && (
        <ScheduleInterviewModal
          isOpen={Boolean(schedulingApp)}
          onClose={() => setSchedulingApp(null)}
          application={schedulingApp}
          onScheduled={() => {
            loadData()
            setSchedulingApp(null)
          }}
        />
      )}
    </div>
  )
}
