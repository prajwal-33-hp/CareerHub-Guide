import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../services/api.js'

export default function PopularCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    api.get('/jobs', { params: { limit: 200, sort: 'newest' } })
      .then(({ data }) => {
        if (!mounted) return
        const skillCount = data.jobs.reduce((counts, job) => {
          (job.skills || []).forEach((skill) => {
            counts[skill] = (counts[skill] || 0) + 1
          })
          return counts
        }, {})

        const popular = Object.entries(skillCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        setCategories(popular)
      })
      .catch(() => {
        if (mounted) setCategories([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  if (!loading && categories.length === 0) {
    return null
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-bold text-ink">Popular Categories</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-ink/10 bg-paper" />
          ))
        ) : (
          categories.map((c) => (
            <Link
              key={c.name}
              to={`/jobs?skill=${encodeURIComponent(c.name)}`}
              className="rounded-lg border border-ink/10 bg-white p-4 text-center transition-colors hover:border-signal"
            >
              <p className="text-sm font-semibold text-ink">{c.name}</p>
              <p className="mt-1 font-mono text-xs text-ink-soft">{c.count} open roles</p>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
