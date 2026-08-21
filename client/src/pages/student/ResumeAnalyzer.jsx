import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

export default function ResumeAnalyzer() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('upload') // 'upload' | 'text'
  const [selectedFile, setSelectedFile] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fillingProfile, setFillingProfile] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [autoFilledData, setAutoFilledData] = useState(null)

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(pdf|txt|docx|doc)$/i)) {
      showToast('Please select a PDF, TXT, or DOCX document.', 'danger')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File is too large. Maximum size is 10MB.', 'danger')
      return
    }

    setSelectedFile(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (!file.name.match(/\.(pdf|txt|docx|doc)$/i)) {
        showToast('Please select a PDF, TXT, or DOCX document.', 'danger')
        return
      }
      setSelectedFile(file)
    }
  }

  async function handleAnalyzeResume() {
    if (mode === 'upload' && !selectedFile) {
      showToast('Please choose or drop a resume file first.', 'danger')
      return
    }
    if (mode === 'text' && !resumeText.trim()) {
      showToast('Please paste your resume text.', 'danger')
      return
    }

    setLoading(true)
    try {
      let response
      if (mode === 'upload' && selectedFile) {
        const formData = new FormData()
        formData.append('resume', selectedFile)
        response = await api.post('/ai/resume-analysis', formData)
      } else {
        response = await api.post('/ai/resume-analysis', { resumeText })
      }

      setAnalysis(response.data.analysis)
      showToast('Resume ATS analysis complete!', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to analyze resume.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoFillProfile() {
    if (mode === 'upload' && !selectedFile) {
      showToast('Please choose or drop a resume file first.', 'danger')
      return
    }
    if (mode === 'text' && !resumeText.trim()) {
      showToast('Please paste your resume text.', 'danger')
      return
    }

    setFillingProfile(true)
    try {
      let res
      if (mode === 'upload' && selectedFile) {
        const formData = new FormData()
        formData.append('resume', selectedFile)
        res = await api.post('/ai/parse-resume-to-profile', formData)
      } else {
        res = await api.post('/ai/parse-resume-to-profile', { resumeText })
      }

      const parsed = res.data.profileData
      if (parsed) {
        const payload = {
          name: parsed.name || user?.name || '',
          about: parsed.about || user?.about || '',
          linkedin: parsed.linkedin || user?.linkedin || '',
          github: parsed.github || user?.github || '',
          portfolio: parsed.portfolio || user?.portfolio || '',
          skills: JSON.stringify(Array.from(new Set([...(user?.skills || []), ...(parsed.skills || [])]))),
          education: JSON.stringify(parsed.education || user?.education || []),
          projects: JSON.stringify(parsed.projects || user?.projects || []),
        }

        await updateProfile(payload)
        setAutoFilledData(parsed)
        showToast('Profile successfully auto-filled and updated from this resume!', 'success')
      }
    } catch (err) {
      showToast(err.message || 'Failed to auto-fill profile.', 'danger')
    } finally {
      setFillingProfile(false)
    }
  }

  function handleExportPDF() {
    if (!analysis) return
    const content = `
      <div class="score-card">
        <div>
          <div class="score-badge">${analysis.overallScore || 0}/100</div>
          <div style="font-weight: 600; color: #374151;">ATS Compatibility Score</div>
          <div style="font-size: 11px; color: #6b7280;">Pass Likelihood: ${analysis.atsPassLikelihood || 'Good'}</div>
        </div>
        <div style="margin-left: auto; text-align: right; font-size: 12px;">
          <div><strong>Formatting:</strong> ${analysis.formattingScore || 'N/A'}/100</div>
          <div><strong>Keywords:</strong> ${analysis.keywordScore || 'N/A'}/100</div>
          <div><strong>Impact:</strong> ${analysis.experienceImpactScore || 'N/A'}/100</div>
        </div>
      </div>

      ${analysis.summary ? `<p style="margin-bottom: 16px; font-style: italic;">${analysis.summary}</p>` : ''}

      <div class="section-title">Key Strengths</div>
      <ul>
        ${(analysis.strengths || []).map((s) => `<li><strong>${s.point}:</strong> ${s.explanation}</li>`).join('')}
      </ul>

      <div class="section-title">Areas for Improvement</div>
      <ul>
        ${(analysis.improvements || []).map((i) => `<li><strong>${i.area}:</strong> ${i.suggestion}</li>`).join('')}
      </ul>

      <div class="section-title">ATS Optimization Checklist</div>
      <ul>
        ${(analysis.atsOptimization || []).map((t) => `<li>${t}</li>`).join('')}
      </ul>

      <div class="section-title">High-Impact Keywords to Add</div>
      <p>${(analysis.keywordsToAdd || analysis.keywords || []).join(', ')}</p>

      <div class="section-title">Action Items</div>
      <ul>
        ${(analysis.actionItems || []).map((a) => `<li>[${a.priority}] ${a.action}</li>`).join('')}
      </ul>
    `
    printOrSaveAsPDF('Resume ATS Evaluation Report', content)
  }

  function handleExportText() {
    if (!analysis) return
    let text = `========================================================\n`
    text += `CAREERHUB AI RESUME ATS REPORT\n`
    text += `Date: ${new Date().toLocaleDateString()}\n`
    text += `Overall Score: ${analysis.overallScore}/100 (${analysis.atsPassLikelihood || 'Normal'} Likelihood)\n`
    text += `Formatting: ${analysis.formattingScore}/100 | Keywords: ${analysis.keywordScore}/100\n`
    text += `========================================================\n\n`

    if (analysis.summary) text += `SUMMARY:\n${analysis.summary}\n\n`

    text += `STRENGTHS:\n`
    ;(analysis.strengths || []).forEach((s) => {
      text += `• ${s.point}: ${s.explanation}\n`
    })

    text += `\nAREAS FOR IMPROVEMENT:\n`
    ;(analysis.improvements || []).forEach((i) => {
      text += `• ${i.area}: ${i.suggestion}\n`
    })

    text += `\nATS OPTIMIZATION TIPS:\n`
    ;(analysis.atsOptimization || []).forEach((tip) => {
      text += `• ${tip}\n`
    })

    text += `\nKEYWORDS TO ADD:\n`
    text += (analysis.keywordsToAdd || analysis.keywords || []).join(', ') + `\n`

    text += `\nACTION ITEMS:\n`
    ;(analysis.actionItems || []).forEach((a) => {
      text += `[${a.priority}] ${a.action}\n`
    })

    downloadTextFile(`CareerHub_ATS_Resume_Report_${new Date().toISOString().slice(0, 10)}.txt`, text)
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

  const scoreColor =
    (analysis?.overallScore || 0) >= 80
      ? 'text-success'
      : (analysis?.overallScore || 0) >= 60
      ? 'text-signal-dark'
      : 'text-danger'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">AI Resume & Profile Hub</h2>
            <p className="text-xs text-ink-soft">
              Upload your resume (PDF/DOCX/TXT) to scan ATS scores and auto-fill your profile with one click.
            </p>
          </div>
        </div>

        <div className="flex rounded-md border border-ink/10 bg-white p-1">
          <button
            onClick={() => setMode('upload')}
            className={`rounded px-3 py-1 text-xs font-semibold transition ${
              mode === 'upload' ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Upload Resume File
          </button>
          <button
            onClick={() => setMode('text')}
            className={`rounded px-3 py-1 text-xs font-semibold transition ${
              mode === 'text' ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Paste Text
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm mb-8">
        {mode === 'upload' ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/20 py-10 text-center transition hover:border-signal/80 hover:bg-signal/5"
            >
              <Upload size={32} className="text-signal-dark" />
              <p className="mt-3 font-display text-sm font-semibold text-ink">
                {selectedFile ? selectedFile.name : 'Click or drag & drop your resume file here'}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Supports PDF, DOCX, and TXT files (Max 10MB)</p>
              {selectedFile && (
                <span className="mt-2 badge bg-success/15 text-success font-mono text-xs">
                  Ready to process ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              Paste Resume Content
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your complete resume text here..."
              rows={8}
              className="input-field"
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <ShieldCheck size={16} className="text-success" />
            <span>Parsed securely with Gemini AI algorithms</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoFillProfile}
              disabled={fillingProfile || (mode === 'upload' ? !selectedFile : !resumeText.trim())}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              <UserCheck size={15} className="text-signal-dark" />
              {fillingProfile ? 'Auto-filling profile…' : '⚡ Auto-Fill My Profile'}
            </button>

            <button
              onClick={handleAnalyzeResume}
              disabled={loading || (mode === 'upload' ? !selectedFile : !resumeText.trim())}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              <Sparkles size={15} />
              {loading ? 'Analyzing with ATS scanner…' : 'Scan & Score Resume (ATS)'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Filled Profile Notification Banner */}
      {autoFilledData && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-success shrink-0" />
              <div>
                <p className="font-display font-bold text-ink text-sm">
                  Profile Successfully Auto-Filled from Resume!
                </p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Extracted Name: <strong>{autoFilledData.name || 'Candidate'}</strong> | {autoFilledData.skills?.length || 0} Skills | {autoFilledData.education?.length || 0} Education items | {autoFilledData.projects?.length || 0} Projects.
                </p>
              </div>
            </div>

            <Link
              to="/student/dashboard/profile"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <span>View & Edit My Profile</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* ATS Analysis Output Section */}
      {analysis && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white p-4">
            <div>
              <p className="font-display font-semibold text-ink">ATS Analysis Complete</p>
              <p className="text-xs text-ink-soft">Evaluation report is ready to review and download.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Printer size={14} /> Download PDF Report
              </button>
              <button
                onClick={handleExportText}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Download size={14} /> Export Text
              </button>
            </div>
          </div>

          {/* Scores Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-ink/10 bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Overall ATS Score</p>
              <div className="mt-3 flex items-center justify-center">
                <span className={`font-display text-4xl font-extrabold ${scoreColor}`}>
                  {analysis.overallScore || 0}
                </span>
                <span className="text-lg font-bold text-ink-soft">/100</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                Pass Likelihood: <strong className={scoreColor}>{analysis.atsPassLikelihood || 'Normal'}</strong>
              </p>
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Formatting & Layout</p>
              <div className="mt-3 font-display text-3xl font-bold text-ink">
                {analysis.formattingScore || 85}
                <span className="text-sm text-ink-soft">/100</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">ATS parseability rating</p>
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Keyword Match</p>
              <div className="mt-3 font-display text-3xl font-bold text-ink">
                {analysis.keywordScore || 80}
                <span className="text-sm text-ink-soft">/100</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">Technical keyword density</p>
            </div>

            <div className="rounded-xl border border-ink/10 bg-white p-5 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Experience Impact</p>
              <div className="mt-3 font-display text-3xl font-bold text-ink">
                {analysis.experienceImpactScore || 78}
                <span className="text-sm text-ink-soft">/100</span>
              </div>
              <p className="mt-2 text-xs text-ink-soft">Action verbs & quantifiable metrics</p>
            </div>
          </div>

          {/* Executive Summary */}
          {analysis.summary && (
            <div className="rounded-xl border border-ink/10 bg-paper p-5">
              <h3 className="font-display font-semibold text-ink text-sm mb-1">ATS Scanner Summary</h3>
              <p className="text-xs text-ink-soft leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="grid gap-6 lg:grid-cols-2">
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-display font-semibold text-ink mb-4">
                  <CheckCircle2 size={18} className="text-success" />
                  Key Strengths
                </h3>
                <div className="space-y-3">
                  {analysis.strengths.map((strength, idx) => (
                    <div key={idx} className="border-l-2 border-success pl-3">
                      <p className="text-xs font-bold text-ink">{strength.point}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{strength.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-display font-semibold text-ink mb-4">
                  <AlertCircle size={18} className="text-danger" />
                  Areas for Improvement
                </h3>
                <div className="space-y-3">
                  {analysis.improvements.map((improvement, idx) => (
                    <div key={idx} className="border-l-2 border-danger pl-3">
                      <p className="text-xs font-bold text-ink">{improvement.area}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{improvement.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ATS Optimization Checklist */}
          {analysis.atsOptimization && analysis.atsOptimization.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-3">ATS Optimization Recommendations</h3>
              <ul className="space-y-2">
                {analysis.atsOptimization.map((tip, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-ink">
                    <span className="text-signal-dark font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords to Add */}
          {analysis.keywordsToAdd && analysis.keywordsToAdd.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-2">High-Impact Keywords to Consider Adding</h3>
              <p className="text-xs text-ink-soft mb-3">
                Include these relevant industry keywords in your skills or experience sections to improve search match:
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.keywordsToAdd.map((kw, idx) => (
                  <span key={idx} className="badge bg-signal/15 text-signal-dark font-mono text-xs">
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          {analysis.actionItems && analysis.actionItems.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-4">Prioritized Action Items</h3>
              <div className="space-y-2.5">
                {analysis.actionItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 rounded-lg bg-paper p-3">
                    <span className="text-xs text-ink font-medium">{item.action}</span>
                    <span className={`badge shrink-0 text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                      {item.priority} Priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bullet Point Rewrites */}
          {analysis.exampleBulletPoints && analysis.exampleBulletPoints.length > 0 && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-semibold text-ink mb-2">
                Action-Oriented Bullet Point Rewrites (Google X-Y-Z Formula)
              </h3>
              <p className="text-xs text-ink-soft mb-4">
                Formula: <em>Accomplished [X] as measured by [Y], by doing [Z]</em>
              </p>

              <div className="space-y-4">
                {analysis.exampleBulletPoints.map((bp, idx) => (
                  <div key={idx} className="rounded-lg border border-ink/10 p-4 space-y-2">
                    <div className="text-xs text-ink-soft">
                      <strong className="text-danger">Original:</strong> "{bp.original}"
                    </div>
                    <div className="text-xs text-ink">
                      <strong className="text-success">Improved:</strong> "{bp.improved}"
                    </div>
                    {bp.reason && (
                      <p className="text-[11px] text-ink-soft/80 italic">Why: {bp.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
