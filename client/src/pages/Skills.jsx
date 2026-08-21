import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Code2 } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import api from '../services/api.js'

export default function Skills() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/jobs', { params: { limit: 200, sort: 'newest' } })
      .then(({ data }) => {
        if (!mounted) return
        const counts = (data.jobs || []).reduce((acc, job) => {
          ; (job.skills || []).forEach((skill) => {
            acc[skill] = (acc[skill] || 0) + 1
          })
          return acc
        }, {})

        const skillList = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        setSkills(skillList)
      })
      .catch(() => {
        if (mounted) setSkills([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const skillsWithCounts = useMemo(
    () => skills,
    [skills]
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Browse Jobs by Skill | CareerHub</title>
        <meta
          name="description"
          content="Explore open jobs and internships by skill — React, Node.js, Python, MongoDB, AWS, and more."
        />
      </Helmet>

      <h1 className="font-display text-2xl font-bold text-ink">Browse by Skill</h1>
      <p className="mt-1 text-sm text-ink-soft">Find roles that match the skills you already have.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-paper" />
          ))
        ) : skillsWithCounts.length > 0 ? (
          skillsWithCounts.map((s) => (
            <Link
              key={s.name}
              to={`/jobs?skill=${encodeURIComponent(s.name)}`}
              className="group flex items-center justify-between rounded-lg border border-ink/10 bg-white p-4 transition-colors hover:border-signal"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper text-ink-soft group-hover:bg-signal/15 group-hover:text-signal-dark">
                  <Code2 size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{s.name}</p>
                  <p className="font-mono text-xs text-ink-soft">{s.count} open roles</p>
                </div>
              </div>
              <ArrowRight size={14} className="shrink-0 text-ink-soft/40 group-hover:text-signal-dark" />
            </Link>
          ))
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">
            No skills available right now.
          </div>
        )}
      </div>
    </div>
  )
}
