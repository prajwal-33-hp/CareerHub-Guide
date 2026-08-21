import { useState } from 'react'
import { Sparkles, Briefcase, TrendingUp, Download, Printer } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

export default function CareerRecommendations() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState(null)

  async function handleGetRecommendations() {
    if (!user?.skills || user.skills.length === 0) {
      showToast('Please add skills to your profile first', 'danger')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/ai/career-recommendations')
      setRecommendations(data.recommendations)
      showToast('Career recommendations generated successfully!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to generate recommendations', 'danger')
    } finally {
      setLoading(false)
    }
  }

  function handleExportPDF() {
    if (!recommendations?.recommendations) return
    const recsHtml = recommendations.recommendations
      .map(
        (rec) => `
        <div class="card">
          <div style="font-size: 16px; font-weight: 700; color: #111827;">${rec.careerPath}</div>
          <p style="font-size: 12px; color: #4b5563; margin-top: 4px;">${rec.explanation}</p>
          <div style="margin-top: 8px; font-size: 11px; color: #374151;">
            <strong>Salary Expectation:</strong> ${rec.salaryRange} | <strong>Demand:</strong> ${rec.industryDemand}
          </div>
          ${
            rec.skillsGap?.length
              ? `<div style="margin-top: 6px;"><strong>Skills to Learn:</strong> ${rec.skillsGap
                  .map((s) => `<span class="badge" style="background: #fee2e2; color: #991b1b;">${s}</span>`)
                  .join(' ')}</div>`
              : ''
          }
          ${
            rec.nextSteps?.length
              ? `<div style="margin-top: 6px;"><strong>Action Steps:</strong><ul>${rec.nextSteps
                  .map((step) => `<li>${step}</li>`)
                  .join('')}</ul></div>`
              : ''
          }
        </div>
      `
      )
      .join('')

    printOrSaveAsPDF('Personalized Career Recommendations Report', recsHtml)
  }

  function handleExportText() {
    if (!recommendations?.recommendations) return
    let text = `========================================================\n`
    text += `CAREERHUB AI CAREER RECOMMENDATIONS\n`
    text += `Candidate: ${user?.name || 'Student'}\n`
    text += `Date: ${new Date().toLocaleDateString()}\n`
    text += `========================================================\n\n`

    recommendations.recommendations.forEach((rec, idx) => {
      text += `${idx + 1}. ${rec.careerPath.toUpperCase()}\n`
      text += `Why It Fits: ${rec.explanation}\n`
      text += `Salary Range: ${rec.salaryRange}\n`
      text += `Industry Demand: ${rec.industryDemand}\n`
      if (rec.skillsGap?.length) {
        text += `Skills to Develop: ${rec.skillsGap.join(', ')}\n`
      }
      if (rec.nextSteps?.length) {
        text += `Next Steps:\n`
        rec.nextSteps.forEach((step, sIdx) => {
          text += `   ${sIdx + 1}) ${step}\n`
        })
      }
      text += `\n--------------------------------------------------------\n\n`
    })

    downloadTextFile(`Career_Recommendations_${new Date().toISOString().slice(0, 10)}.txt`, text)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <Briefcase size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">AI Career Recommendations</h2>
            <p className="text-xs text-ink-soft">
              Personalized career path suggestions and growth trajectories based on your profile.
            </p>
          </div>
        </div>

        {recommendations?.recommendations && (
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-ink mb-1">Ready for a career boost?</h3>
            <p className="text-xs text-ink-soft mb-3">
              We will analyze your skills and projects to identify your top match career opportunities.
            </p>
            {user?.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {user.skills.slice(0, 6).map((skill) => (
                  <span key={skill} className="badge bg-signal/15 text-signal-dark text-xs">
                    {skill}
                  </span>
                ))}
                {user.skills.length > 6 && (
                  <span className="text-xs text-ink-soft">+{user.skills.length - 6} more</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleGetRecommendations}
            disabled={loading || !user?.skills?.length}
            className="btn-primary shrink-0 flex items-center gap-2"
          >
            <Sparkles size={16} />
            {loading ? 'Generating…' : 'Generate Recommendations'}
          </button>
        </div>
      </div>

      {recommendations && (
        <div className="space-y-4">
          {recommendations.recommendations ? (
            recommendations.recommendations.map((rec, idx) => (
              <div key={idx} className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <TrendingUp size={22} className="text-signal-dark mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-ink text-lg">{rec.careerPath}</h3>
                    <p className="text-sm text-ink-soft mt-1 leading-relaxed">{rec.explanation}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-paper p-3.5">
                    <p className="text-xs font-semibold text-ink-soft uppercase mb-1">Estimated Salary Range</p>
                    <p className="font-display font-semibold text-ink text-sm">{rec.salaryRange}</p>
                  </div>
                  <div className="rounded-lg bg-paper p-3.5">
                    <p className="text-xs font-semibold text-ink-soft uppercase mb-1">Industry Demand</p>
                    <p className="font-display font-semibold text-ink text-sm">{rec.industryDemand}</p>
                  </div>
                </div>

                {rec.skillsGap && rec.skillsGap.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink-soft uppercase mb-2">Skills to Develop</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.skillsGap.map((skill) => (
                        <span key={skill} className="badge bg-danger/10 text-danger text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {rec.nextSteps && rec.nextSteps.length > 0 && (
                  <div className="mt-4 border-t border-ink/5 pt-3">
                    <p className="text-xs font-semibold text-ink-soft uppercase mb-2">Recommended Next Steps</p>
                    <ol className="space-y-1 text-xs text-ink-soft">
                      {rec.nextSteps.map((step, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 font-bold text-signal-dark">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-ink/10 bg-white p-6 text-center text-sm text-ink-soft">
              {recommendations.raw || 'No recommendations available.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
