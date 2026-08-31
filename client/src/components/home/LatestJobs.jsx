import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import JobCard from '../jobs/JobCard.jsx'
import api from '../../services/api.js'

export default function LatestJobs({ type = 'Full Time', title, viewAllTo }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/jobs', { params: { limit: 8, sort: 'newest', jobType: type } })
      .then(({ data }) => {
        if (!mounted) return
        setJobs(data.jobs || [])
      })
      .catch(() => {
        if (mounted) setJobs([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [type])

  if (!loading && jobs.length === 0) {
    return null
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <Link to={viewAllTo} className="flex items-center gap-1 text-sm font-medium text-signal-dark hover:underline">
          View all <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[220px] animate-pulse rounded-3xl bg-paper" />
          ))
        ) : (
          jobs.map((job) => <JobCard key={job._id} job={job} />)
        )}
      </div>
    </section>
  )
}
