import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Mail, Send, Building2, User, MessageSquare } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'

export default function Contact() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    recipientType: 'all_recruiters',
    recipientCompany: '',
    subject: '',
    message: '',
  })

  useEffect(() => {
    // Populate user details if logged in
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  useEffect(() => {
    // Fetch available companies for direct recruiter outreach
    setLoadingCompanies(true)
    api.get('/companies')
      .then(({ data }) => {
        setCompanies(data.companies || [])
        const companyParam = searchParams.get('company')
        if (companyParam) {
          const match = (data.companies || []).find(
            (c) => c._id === companyParam || c.slug === companyParam
          )
          if (match) {
            setForm((prev) => ({
              ...prev,
              recipientType: 'company',
              recipientCompany: match._id,
            }))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCompanies(false))

    const subjectParam = searchParams.get('subject')
    if (subjectParam) {
      setForm((prev) => ({ ...prev, subject: subjectParam }))
    }
  }, [searchParams])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      showToast('Please fill in all required fields.', 'danger')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        subject: form.subject || 'Applicant Inquiry',
        message: form.message,
        recipientType: form.recipientType,
        recipientCompany: form.recipientType === 'company' ? form.recipientCompany : undefined,
      }

      await api.post('/contact', payload)
      showToast('Message sent! Recruiters and hiring teams have been notified.', 'success')
      setForm({
        name: user?.name || '',
        email: user?.email || '',
        recipientType: 'all_recruiters',
        recipientCompany: '',
        subject: '',
        message: '',
      })
    } catch (err) {
      showToast(err.message || 'Failed to send message. Please try again.', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Helmet>
        <title>Contact Recruiters & CareerHub Support</title>
        <meta
          name="description"
          content="Send messages, inquiries, or feedback directly to company recruiters, hiring teams, and CareerHub support."
        />
      </Helmet>

      <div className="text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-signal/20 text-signal-dark">
          <Mail size={24} />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Get in Touch</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Send a direct message to recruiters, hiring managers, or our platform support team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Your Name <span className="text-danger">*</span>
            </label>
            <input
              required
              placeholder="e.g. Alex Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Email Address <span className="text-danger">*</span>
            </label>
            <input
              required
              type="email"
              placeholder="alex@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
            Send Message To
          </label>
          <select
            value={form.recipientType}
            onChange={(e) => setForm({ ...form, recipientType: e.target.value })}
            className="input-field"
          >
            <option value="all_recruiters">All Hiring Recruiters (Broadcast inquiry / open to opportunities)</option>
            <option value="company">Specific Company / Recruiter Team</option>
            <option value="general">CareerHub Platform Support</option>
          </select>
        </div>

        {form.recipientType === 'company' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Select Target Company <span className="text-danger">*</span>
            </label>
            <select
              required
              value={form.recipientCompany}
              onChange={(e) => setForm({ ...form, recipientCompany: e.target.value })}
              className="input-field"
            >
              <option value="">-- Choose a company --</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.industry || 'Tech / Hiring'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
            Subject
          </label>
          <input
            placeholder="e.g. Inquiry regarding Frontend Engineer opening"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
            Message <span className="text-danger">*</span>
          </label>
          <textarea
            required
            placeholder="Write your message, inquiry, or question for the recruiters here..."
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span>Sending message…</span>
          ) : (
            <>
              <Send size={16} />
              <span>Send Message to Recruiter</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
