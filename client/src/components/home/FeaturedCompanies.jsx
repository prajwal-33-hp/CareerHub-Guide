import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../services/api.js'

export default function FeaturedCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/companies')
      .then(({ data }) => {
        if (!mounted) return
        setCompanies(data.companies || [])
      })
      .catch(() => {
        if (mounted) setCompanies([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const featured = companies.slice(0, 5)

  if (!loading && featured.length === 0) {
    return null
  }

  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-bold text-ink">Featured Companies</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg border border-ink/10 bg-paper" />
            ))
          ) : (
            featured.map((c) => (
              <Link
                key={c._id}
                to={`/companies/${c.slug}`}
                className="flex flex-col items-center gap-2 rounded-lg border border-ink/10 p-5 text-center transition-colors hover:border-signal"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-ink font-display text-sm font-bold text-signal">
                  {c.logo || c.name?.charAt(0)}
                </span>
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-soft">{c.industry || 'Hiring now'}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
