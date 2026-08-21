import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  FileEdit,
  Sparkles,
  Copy,
  Check,
  Printer,
  Download,
  Building2,
  Briefcase,
  Layers,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

const TONES = [
  { id: 'Professional', label: 'Professional & Confident', desc: 'Balanced, standard industry tone' },
  { id: 'Enthusiastic', label: 'Enthusiastic & High Energy', desc: 'Great for startups & fast-paced roles' },
  { id: 'Creative', label: 'Creative & Story-driven', desc: 'Emphasizes unique problem solving' },
  { id: 'Executive', label: 'Executive & Strategic', desc: 'Direct, results & metrics oriented' },
]

export default function CoverLetterGenerator() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [tone, setTone] = useState('Professional')
  const [loading, setLoading] = useState(false)
  const [coverLetter, setCoverLetter] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const jobParam = searchParams.get('job')
    const companyParam = searchParams.get('company')
    if (jobParam) setJobTitle(jobParam)
    if (companyParam) setCompanyName(companyParam)
  }, [searchParams])

  async function handleGenerate(e) {
    if (e) e.preventDefault()
    if (!jobTitle.trim()) {
      showToast('Please enter the target job title.', 'danger')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/ai/cover-letter', {
        jobTitle,
        companyName,
        jobDescription,
        tone,
      })

      setCoverLetter(data.coverLetter)
      showToast('Cover letter generated successfully!', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to generate cover letter.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!coverLetter) return
    const textToCopy = coverLetter.fullCoverLetter || coverLetter.raw || ''
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    showToast('Cover letter copied to clipboard!', 'success')
    setTimeout(() => setCopied(false), 3000)
  }

  function handleExportPDF() {
    if (!coverLetter) return
    const text = coverLetter.fullCoverLetter || coverLetter.raw || ''
    const content = `
      <div class="card" style="padding: 24px; font-size: 13px; line-height: 1.8; white-space: pre-wrap;">${text}</div>
    `
    printOrSaveAsPDF(`Cover Letter - ${jobTitle} (${companyName || 'Application'})`, content)
  }

  function handleExportText() {
    if (!coverLetter) return
    const text = coverLetter.fullCoverLetter || coverLetter.raw || ''
    downloadTextFile(`Cover_Letter_${jobTitle.replace(/\s+/g, '_')}.txt`, text)
  }

  return (
    <div>
      <Helmet>
        <title>AI Cover Letter Generator | CareerHub</title>
      </Helmet>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal/20 text-signal-dark">
            <FileEdit size={22} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink">AI Cover Letter Generator</h2>
            <p className="text-xs text-ink-soft">
              Generate tailored, persuasive cover letters matching your profile directly with job requirements.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Input Form */}
        <form onSubmit={handleGenerate} className="space-y-4 rounded-xl border border-ink/10 bg-white p-6 shadow-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Target Job Title <span className="text-danger">*</span>
            </label>
            <input
              required
              placeholder="e.g. Frontend Engineer, Product Analyst"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Company Name (Optional)
            </label>
            <input
              placeholder="e.g. Google, Stripe, CareerHub"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Job Description / Key Requirements (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Paste responsibilities or requirements from the job posting to align keywords..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              Desired Tone
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    tone === t.id
                      ? 'border-signal bg-signal/10 text-signal-dark font-medium'
                      : 'border-ink/10 bg-paper text-ink-soft hover:border-ink/20'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-ink-soft mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !jobTitle.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
          >
            <Sparkles size={16} />
            {loading ? 'Crafting Cover Letter with Gemini…' : 'Generate Tailored Cover Letter'}
          </button>
        </form>

        {/* Output Preview */}
        <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink/10 pb-3 mb-4">
              <h3 className="font-display font-semibold text-ink text-sm">Cover Letter Preview</h3>
              {coverLetter && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="btn-ghost text-xs flex items-center gap-1 text-ink-soft hover:text-ink"
                    title="Copy text"
                  >
                    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="btn-ghost text-xs flex items-center gap-1 text-ink-soft hover:text-ink"
                    title="Download PDF"
                  >
                    <Printer size={14} /> PDF
                  </button>
                  <button
                    onClick={handleExportText}
                    className="btn-ghost text-xs flex items-center gap-1 text-ink-soft hover:text-ink"
                    title="Download Text"
                  >
                    <Download size={14} /> TXT
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal border-t-transparent mb-3" />
                <p className="text-sm font-display font-medium text-ink">Analyzing candidate profile & job requirements…</p>
                <p className="text-xs text-ink-soft mt-1">Generating personalized paragraphs with Gemini AI.</p>
              </div>
            ) : coverLetter ? (
              <div className="space-y-4 font-sans text-xs text-ink leading-relaxed whitespace-pre-wrap rounded-lg bg-paper/60 p-4 border border-ink/5 max-h-[500px] overflow-y-auto">
                {coverLetter.fullCoverLetter || coverLetter.raw}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-ink-soft">
                <FileEdit size={36} className="text-ink-soft/30 mb-3" />
                <p className="font-display font-medium text-sm text-ink">No Cover Letter Generated Yet</p>
                <p className="text-xs text-ink-soft mt-1 max-w-xs">
                  Fill in the target role on the left and click Generate to create a custom cover letter.
                </p>
              </div>
            )}
          </div>

          {coverLetter?.keyHighlights && (
            <div className="mt-4 border-t border-ink/5 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
                Key Selling Points Highlighted:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {coverLetter.keyHighlights.map((h, i) => (
                  <span key={i} className="badge bg-signal/15 text-signal-dark text-[11px]">
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
