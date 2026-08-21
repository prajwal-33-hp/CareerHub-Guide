import { useState } from 'react'
import { Sparkles, Map, CheckCircle2, Download, Printer } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

export default function LearningRoadmap() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [roadmap, setRoadmap] = useState(null)

  async function handleGenerateRoadmap() {
    if (!targetRole.trim()) {
      showToast('Please enter a target job role', 'danger')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/ai/learning-roadmap', { targetRole })
      setRoadmap(data.roadmap)
      showToast('Learning roadmap generated successfully!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to generate roadmap', 'danger')
    } finally {
      setLoading(false)
    }
  }

  function handleExportPDF() {
    if (!roadmap) return
    const content = `
      <div class="score-card">
        <div>
          <div class="score-badge">${roadmap.duration || '6 Months'}</div>
          <div style="font-weight: 600; color: #374151;">${roadmap.roadmapTitle || targetRole + ' Roadmap'}</div>
        </div>
        <div style="margin-left: auto; text-align: right; font-size: 12px;">
          <strong>Target Role:</strong> ${targetRole}<br />
          <strong>Commitment:</strong> ${roadmap.hoursPerWeek || 10} hrs/week<br />
          <strong>Candidate:</strong> ${user?.name || 'Applicant'}
        </div>
      </div>

      <div class="section-title">Timeline & Monthly Phases</div>
      ${(roadmap.phases || [])
        .map(
          (p) => `
        <div class="card" style="border-left: 3px solid #059669;">
          <div style="font-weight: 700; font-size: 13px;">Month ${p.month}: ${p.title || 'Phase ' + p.month}</div>
          ${
            p.objectives?.length
              ? `<div style="margin-top: 6px; font-size: 11px;">
                  <strong>Objectives:</strong>
                  <ul>${p.objectives.map((o) => `<li>${o}</li>`).join('')}</ul>
                </div>`
              : ''
          }
          ${
            p.courses?.length
              ? `<div style="margin-top: 6px; font-size: 11px;">
                  <strong>Courses:</strong>
                  <ul>${p.courses.map((c) => `<li>${c}</li>`).join('')}</ul>
                </div>`
              : ''
          }
          ${
            p.projects?.length
              ? `<div style="margin-top: 6px; font-size: 11px;">
                  <strong>Projects:</strong>
                  <ul>${p.projects.map((proj) => `<li>${proj}</li>`).join('')}</ul>
                </div>`
              : ''
          }
          ${p.milestone ? `<div style="margin-top: 6px; font-size: 11px; color: #065f46; font-weight: 600;">✓ Milestone: ${p.milestone}</div>` : ''}
        </div>
      `
        )
        .join('')}

      ${
        roadmap.portfolio?.length
          ? `<div class="section-title">Portfolio Projects</div>
             <ul>${roadmap.portfolio.map((item) => `<li>${item}</li>`).join('')}</ul>`
          : ''
      }

      ${
        roadmap.interviewPrep?.length
          ? `<div class="section-title">Interview Prep Checkpoints</div>
             <ul>${roadmap.interviewPrep.map((item) => `<li>${item}</li>`).join('')}</ul>`
          : ''
      }
    `

    printOrSaveAsPDF(`Learning Roadmap - ${targetRole}`, content)
  }

  function handleExportText() {
    if (!roadmap) return
    let text = `========================================================\n`
    text += `CAREERHUB AI LEARNING ROADMAP\n`
    text += `Target Role: ${targetRole}\n`
    text += `Duration: ${roadmap.duration || '6 Months'} (${roadmap.hoursPerWeek || 10} hours/week)\n`
    text += `Candidate: ${user?.name || 'Student'}\n`
    text += `Date: ${new Date().toLocaleDateString()}\n`
    text += `========================================================\n\n`

    text += `PHASE-BY-PHASE TIMELINE:\n`
    ;(roadmap.phases || []).forEach((p) => {
      text += `\n--- Month ${p.month}: ${p.title || 'Phase ' + p.month} ---\n`
      if (p.objectives?.length) {
        text += `Objectives:\n`
        p.objectives.forEach((o) => {
          text += `  • ${o}\n`
        })
      }
      if (p.courses?.length) {
        text += `Courses / Certifications:\n`
        p.courses.forEach((c) => {
          text += `  • ${c}\n`
        })
      }
      if (p.projects?.length) {
        text += `Projects:\n`
        p.projects.forEach((proj) => {
          text += `  • ${proj}\n`
        })
      }
      if (p.milestone) text += `Milestone: ${p.milestone}\n`
    })

    if (roadmap.portfolio?.length) {
      text += `\nPORTFOLIO PROJECTS TO BUILD:\n`
      roadmap.portfolio.forEach((proj) => {
        text += `• ${proj}\n`
      })
    }

    if (roadmap.interviewPrep?.length) {
      text += `\nINTERVIEW PREP CHECKPOINTS:\n`
      roadmap.interviewPrep.forEach((item) => {
        text += `• ${item}\n`
      })
    }

    downloadTextFile(`Learning_Roadmap_${targetRole.replace(/\s+/g, '_')}.txt`, text)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <Map size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Personalized Learning Roadmap</h2>
            <p className="text-xs text-ink-soft">
              Create a custom month-by-month learning path with projects, courses, and milestones.
            </p>
          </div>
        </div>

        {roadmap && (
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
            placeholder="e.g. Full Stack Developer, DevOps Engineer, Machine Learning Engineer"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateRoadmap()}
            className="input-field flex-1"
          />
          <button
            onClick={handleGenerateRoadmap}
            disabled={loading || !targetRole.trim()}
            className="btn-primary shrink-0 flex items-center gap-2"
          >
            <Sparkles size={16} />
            {loading ? 'Building Roadmap…' : 'Generate Roadmap'}
          </button>
        </div>
      </div>

      {roadmap && (
        <div className="space-y-6">
          {roadmap.roadmapTitle && (
            <div className="rounded-xl border border-ink/10 bg-paper p-6">
              <h3 className="font-display text-xl font-bold text-ink">{roadmap.roadmapTitle}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {roadmap.duration && (
                  <div>
                    <p className="text-xs font-semibold text-ink-soft uppercase">Duration</p>
                    <p className="font-display font-semibold text-ink text-sm">{roadmap.duration}</p>
                  </div>
                )}
                {roadmap.hoursPerWeek !== undefined && (
                  <div>
                    <p className="text-xs font-semibold text-ink-soft uppercase">Time Commitment</p>
                    <p className="font-display font-semibold text-ink text-sm">{roadmap.hoursPerWeek} hours/week</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {roadmap.phases && roadmap.phases.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-6">Step-by-Step Learning Timeline</h3>
              <div className="space-y-6">
                {roadmap.phases.map((phase, idx) => (
                  <div key={idx} className="border-l-4 border-signal pl-6 relative">
                    <div className="absolute -left-[11px] top-0 w-5 h-5 bg-signal rounded-full border-4 border-white shadow-sm" />

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <h4 className="font-display font-bold text-ink text-base">
                        {phase.title || `Phase ${phase.month}`}
                      </h4>
                      <span className="badge bg-signal/15 text-signal-dark text-xs font-semibold">
                        Month {phase.month}
                      </span>
                    </div>

                    {phase.objectives && phase.objectives.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-ink-soft uppercase mb-1">Key Objectives</p>
                        <ul className="space-y-1">
                          {phase.objectives.map((obj, i) => (
                            <li key={i} className="flex gap-2 text-xs text-ink">
                              <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {phase.courses && phase.courses.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-ink-soft uppercase mb-1">Recommended Courses</p>
                        <ul className="space-y-1">
                          {phase.courses.map((course, i) => (
                            <li key={i} className="text-xs text-ink-soft">• {course}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {phase.projects && phase.projects.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-ink-soft uppercase mb-1">Hands-On Projects</p>
                        <ul className="space-y-1">
                          {phase.projects.map((project, i) => (
                            <li key={i} className="text-xs text-ink-soft">• {project}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {phase.milestone && (
                      <div className="mt-3 rounded-md bg-success/10 p-2.5 border-l-2 border-success">
                        <p className="text-xs font-medium text-success">✓ Milestone: {phase.milestone}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {roadmap.portfolio && roadmap.portfolio.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-3">Portfolio Projects to Build</h3>
              <ul className="space-y-2">
                {roadmap.portfolio.map((project, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink">
                    <CheckCircle2 size={15} className="text-signal-dark shrink-0 mt-0.5" />
                    <span>{project}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {roadmap.interviewPrep && roadmap.interviewPrep.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-3">Interview Preparation Checkpoints</h3>
              <ul className="space-y-2">
                {roadmap.interviewPrep.map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-ink">
                    <CheckCircle2 size={15} className="text-signal-dark shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
