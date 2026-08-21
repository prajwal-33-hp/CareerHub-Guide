import { useState } from 'react'
import { Sparkles, Target, CheckCircle2, AlertCircle, Download, Printer } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

export default function SkillGapAnalysis() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  async function handleAnalyzeGap() {
    if (!targetRole.trim()) {
      showToast('Please enter a target job role', 'danger')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/ai/skill-gap-analysis', { targetRole })
      setAnalysis(data.analysis)
      showToast('Skill gap analysis completed!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to analyze skill gap', 'danger')
    } finally {
      setLoading(false)
    }
  }

  function handleExportPDF() {
    if (!analysis) return
    const content = `
      <div class="score-card">
        <div>
          <div class="score-badge">${analysis.readinessPercentage || 0}%</div>
          <div style="font-weight: 600; color: #374151;">Role Readiness Score</div>
        </div>
        <div style="margin-left: auto; text-align: right; font-size: 13px;">
          <strong>Target Role:</strong> ${analysis.targetRole || targetRole}<br />
          <strong>Candidate:</strong> ${user?.name || 'Applicant'}
        </div>
      </div>

      ${analysis.summary ? `<p style="margin-bottom: 16px;">${analysis.summary}</p>` : ''}

      <div class="section-title">Skills Breakdown & Learning Plan</div>
      ${(analysis.skillsAnalysis || [])
        .map(
          (s) => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 13px;">${s.skill}</span>
            <span>
              <span class="badge" style="background: ${s.status === 'have' ? '#ecfdf5' : '#fee2e2'}; color: ${s.status === 'have' ? '#065f46' : '#991b1b'};">
                ${s.status === 'have' ? 'Acquired (✓)' : 'Gap / Needed (✗)'}
              </span>
              <span class="badge" style="background: #f3f4f6; color: #374151;">${s.priority} Priority</span>
            </span>
          </div>
          ${s.estimatedTime ? `<p style="font-size: 11px; color: #6b7280; margin-top: 4px;">Time to acquire: ${s.estimatedTime}</p>` : ''}
          ${
            s.resources?.length
              ? `<div style="margin-top: 6px; font-size: 11px;">
                  <strong>Recommended Resources:</strong>
                  <ul>${s.resources.map((r) => `<li>${r}</li>`).join('')}</ul>
                </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    `

    printOrSaveAsPDF(`Skill Gap Analysis - ${targetRole}`, content)
  }

  function handleExportText() {
    if (!analysis) return
    let text = `========================================================\n`
    text += `CAREERHUB AI SKILL GAP ANALYSIS REPORT\n`
    text += `Candidate: ${user?.name || 'Student'}\n`
    text += `Target Role: ${analysis.targetRole || targetRole}\n`
    text += `Overall Readiness Score: ${analysis.readinessPercentage || 0}%\n`
    text += `Date: ${new Date().toLocaleDateString()}\n`
    text += `========================================================\n\n`

    if (analysis.summary) text += `EXECUTIVE SUMMARY:\n${analysis.summary}\n\n`

    text += `SKILLS BREAKDOWN:\n`
    ;(analysis.skillsAnalysis || []).forEach((s, idx) => {
      text += `${idx + 1}. ${s.skill} [${s.status === 'have' ? 'HAVE' : 'NEED'}] - Priority: ${s.priority}\n`
      if (s.estimatedTime) text += `   Estimated Time: ${s.estimatedTime}\n`
      if (s.resources?.length) {
        text += `   Resources:\n`
        s.resources.forEach((r) => {
          text += `     • ${r}\n`
        })
      }
      text += `\n`
    })

    downloadTextFile(`Skill_Gap_Analysis_${targetRole.replace(/\s+/g, '_')}.txt`, text)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-danger/10 text-danger'
      case 'Medium':
        return 'bg-amber-100 text-amber-800'
      case 'Low':
        return 'bg-success/15 text-success'
      default:
        return 'bg-ink/10 text-ink'
    }
  }

  const getStatusIcon = (status) => {
    return status === 'have' ? (
      <CheckCircle2 size={16} className="text-success shrink-0" />
    ) : (
      <AlertCircle size={16} className="text-danger shrink-0" />
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <Target size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">AI Skill Gap Analysis</h2>
            <p className="text-xs text-ink-soft">
              Compare your current profile with target roles to discover missing skills and learning paths.
            </p>
          </div>
        </div>

        {analysis && (
          <div className="flex gap-2">
            <button onClick={handleExportPDF} className="btn-secondary text-xs flex items-center gap-1">
              <Printer size={14} /> Download PDF
            </button>
            <button onClick={handleExportText} className="btn-secondary text-xs flex items-center gap-1">
              <Download size={14} /> Export Text
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
          Target Job Role <span className="text-danger">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="e.g. Senior Frontend Engineer, AI Engineer, Full Stack Developer, Product Manager"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeGap()}
            className="input-field flex-1"
          />
          <button
            onClick={handleAnalyzeGap}
            disabled={loading || !targetRole.trim()}
            className="btn-primary shrink-0 flex items-center gap-2"
          >
            <Sparkles size={16} />
            {loading ? 'Analyzing Gap…' : 'Analyze Skill Gap'}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-6">
          {analysis.readinessPercentage !== undefined && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold text-ink">Role Readiness Score</h3>
                  <p className="text-xs text-ink-soft">Alignment of your current skills for "{targetRole}"</p>
                </div>
                <span className="font-display text-3xl font-extrabold text-signal-dark">
                  {analysis.readinessPercentage}%
                </span>
              </div>
              <div className="w-full bg-ink/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-signal h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analysis.readinessPercentage}%` }}
                />
              </div>
            </div>
          )}

          {analysis.skillsAnalysis && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-4">Skills Breakdown & Learning Plan</h3>
              <div className="space-y-4">
                {analysis.skillsAnalysis.map((skill, idx) => (
                  <div key={idx} className="border-t border-ink/10 pt-4 first:border-0 first:pt-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(skill.status)}</div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display font-semibold text-ink text-sm">{skill.skill}</p>
                          <span className={`badge text-xs font-semibold ${getPriorityColor(skill.priority)}`}>
                            {skill.priority} Priority
                          </span>
                          <span
                            className={`badge text-xs font-medium ${
                              skill.status === 'have'
                                ? 'bg-success/15 text-success'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {skill.status === 'have' ? 'Skill Acquired' : 'Skill Needed'}
                          </span>
                        </div>
                        {skill.estimatedTime && (
                          <p className="text-xs text-ink-soft mt-1">⏱️ Estimated time to master: {skill.estimatedTime}</p>
                        )}
                        {skill.resources && skill.resources.length > 0 && (
                          <div className="mt-2.5 rounded-lg bg-paper p-3 text-xs">
                            <p className="font-semibold text-ink-soft uppercase text-[10px] mb-1">
                              Recommended Resources:
                            </p>
                            <ul className="space-y-1 text-ink">
                              {skill.resources.map((resource, i) => (
                                <li key={i} className="flex items-center gap-1.5">
                                  <span className="text-signal-dark font-bold">→</span>
                                  <span>{resource}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.summary && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-2">Executive Summary</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{analysis.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
