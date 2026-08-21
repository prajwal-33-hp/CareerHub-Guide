import { useEffect, useState } from 'react'
import api from '../../services/api.js'

export default function Stats() {
  const [stats, setStats] = useState([
    { label: 'Open roles', value: '—' },
    { label: 'Companies hiring', value: '—' },
    { label: 'Internships', value: '—' },
    { label: 'Remote roles', value: '—' },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      api.get('/jobs', { params: { limit: 200, sort: 'newest' } }),
      api.get('/companies'),
    ])
      .then(([jobsResponse, companiesResponse]) => {
        if (!mounted) return
        const jobs = jobsResponse.data.jobs || []
        const companies = companiesResponse.data.companies || []
        const internshipCount = jobs.filter((job) => job.jobType === 'Internship').length
        const remoteCount = jobs.filter((job) => job.workMode === 'Remote' || (job.location || '').toLowerCase().includes('remote')).length

        setStats([
          { label: 'Open roles', value: jobs.length },
          { label: 'Companies hiring', value: companies.length },
          { label: 'Internships', value: internshipCount },
          { label: 'Remote roles', value: remoteCount },
        ])
      })
      .catch(() => {
        if (mounted) {
          setStats([
            { label: 'Open roles', value: 0 },
            { label: 'Companies hiring', value: 0 },
            { label: 'Internships', value: 0 },
            { label: 'Remote roles', value: 0 },
          ])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="bg-ink py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-800 text-signal sm:text-4xl">{loading ? '—' : s.value}</p>
            <p className="mt-1 text-sm text-white/60">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
