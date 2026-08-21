import { useEffect, useState } from 'react'
import { useSavedJobs } from '../../context/SavedJobsContext.jsx'
import { useApplications } from '../../context/ApplicationsContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import JobCard from '../../components/jobs/JobCard.jsx'
import api from '../../services/api.js'

export default function Overview() {
  const { user, refreshUser } = useAuth()
  const { applications } = useApplications()
  const { savedIds } = useSavedJobs()
  const [recommended, setRecommended] = useState([])
  const [loading, setLoading] = useState(true)

  const interviews = applications.filter((a) => a.status === 'Interview').length

  useEffect(() => {
    let mounted = true
    if (refreshUser) refreshUser()

    api
      .get('/jobs', { params: { limit: 2, sort: 'newest' } })
      .then(({ data }) => {
        if (mounted) setRecommended(data.jobs)
      })
      .catch(() => {
        if (mounted) setRecommended([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [refreshUser])

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Welcome back</h2>
      <p className="mt-1 text-sm text-ink-soft">Here's a snapshot of your job search.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Applications', value: applications.length },
          { label: 'Saved Jobs', value: savedIds.length },
          { label: 'Interviews', value: interviews },
          { label: 'Profile views', value: user?.profileViews || 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-ink/10 bg-white p-4">
            <p className="font-display text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 font-display text-lg font-semibold text-ink">Recommended for you</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {loading ? (
          <div className="rounded-lg border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">Loading recommendations…</div>
        ) : recommended.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No recommendations available right now.</div>
        ) : (
          recommended.map((job) => <JobCard key={job._id || job.id} job={job} />)
        )}
      </div>
    </div>
  )
}
