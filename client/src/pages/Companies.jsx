import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MapPin, Users } from 'lucide-react'
import api from '../services/api.js'

export default function Companies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/companies')
      .then(({ data }) => {
        if (mounted) setCompanies(data.companies)
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Companies Hiring | CareerHub</title>
        <meta name="description" content="Browse companies actively hiring students for jobs and internships." />
      </Helmet>
      <h1 className="font-display text-2xl font-bold text-ink">Companies Hiring</h1>

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 rounded-3xl border border-ink/10 bg-white p-5" />
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link key={company._id || company.id} to={`/companies/${company.slug}`} className="rounded-lg border border-ink/10 bg-white p-5 transition-colors hover:border-signal">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink font-display text-sm font-bold text-signal">{company.logo || company.name?.[0]}</div>
                <div>
                  <p className="font-display font-semibold text-ink">{company.name}</p>
                  <p className="text-xs text-ink-soft">{company.industry}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft line-clamp-2">{company.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-ink-soft">
                <span className="flex items-center gap-1"><MapPin size={13} />{company.city || company.location || 'India'}</span>
                <span className="flex items-center gap-1"><Users size={13} />{company.companySize || company.employees || '1-10'}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-ink/15 bg-white p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/15 text-signal-dark mb-4">
            <Users size={28} />
          </div>
          <h2 className="font-display text-lg font-bold text-ink">No Verified Companies Yet</h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-ink-soft leading-relaxed">
            All company profiles and hiring dashboards on CareerHub are manually verified and created by approved company recruiters.
          </p>
          <div className="mt-6">
            <Link to="/recruiter/signup" className="btn-primary py-2.5 px-5 text-xs font-bold inline-flex">
              Sign Up as Recruiter / Register Company →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
