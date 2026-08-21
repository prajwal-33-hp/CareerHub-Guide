import { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import api from '../../services/api.js'

const jobTypes = ['Full Time', 'Part Time', 'Internship', 'Contract']
const workModes = ['Remote', 'Hybrid', 'On-site']

function Section({ title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-ink/10 py-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-semibold text-ink"
      >
        {title}
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

export default function FilterSidebar({ filters, onChange, className = '' }) {
  function toggleArrayValue(key, value) {
    const current = filters[key] || []
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    onChange({ ...filters, [key]: next })
  }

  const [skills, setSkills] = useState([])
  const [loadingSkills, setLoadingSkills] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/jobs', { params: { limit: 200, sort: 'newest' } })
      .then(({ data }) => {
        if (!mounted) return
        const counts = (data.jobs || []).reduce((acc, job) => {
          ;(job.skills || []).forEach((skill) => {
            acc[skill] = (acc[skill] || 0) + 1
          })
          return acc
        }, {})

        setSkills(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12)
            .map((item) => item.name)
        )
      })
      .catch(() => {
        if (mounted) setSkills([])
      })
      .finally(() => {
        if (mounted) setLoadingSkills(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function clearAll() {
    onChange({ keyword: '', location: '', jobType: [], workMode: [], skills: [] })
  }

  return (
    <aside className={`rounded-lg border border-ink/10 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-display text-sm font-semibold text-ink">Filters</h2>
        <button onClick={clearAll} className="flex items-center gap-1 text-xs text-ink-soft hover:text-danger">
          <X size={12} /> Clear all
        </button>
      </div>

      <Section title="Location">
        <input
          type="text"
          placeholder="City or 'Remote'"
          value={filters.location || ''}
          onChange={(e) => onChange({ ...filters, location: e.target.value })}
          className="input-field"
        />
      </Section>

      <Section title="Job Type">
        {jobTypes.map((t) => (
          <label key={t} className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={(filters.jobType || []).includes(t)}
              onChange={() => toggleArrayValue('jobType', t)}
              className="rounded border-ink/30 text-signal focus:ring-signal"
            />
            {t}
          </label>
        ))}
      </Section>

      <Section title="Work Mode">
        {workModes.map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={(filters.workMode || []).includes(m)}
              onChange={() => toggleArrayValue('workMode', m)}
              className="rounded border-ink/30 text-signal focus:ring-signal"
            />
            {m}
          </label>
        ))}
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1.5">
          {loadingSkills ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 w-20 rounded-full bg-paper" />
            ))
          ) : skills.length > 0 ? (
            skills.map((s) => {
              const active = (filters.skills || []).includes(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleArrayValue('skills', s)}
                  className={`badge border ${
                    active ? 'border-signal bg-signal/15 text-signal-dark' : 'border-ink/15 text-ink-soft hover:border-ink/30'
                  }`}
                >
                  {s}
                </button>
              )
            })
          ) : (
            <p className="text-xs text-ink-soft">No skill filters available.</p>
          )}
        </div>
      </Section>
    </aside>
  )
}
