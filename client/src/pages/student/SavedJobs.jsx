import { Helmet } from 'react-helmet-async'
import JobCard from '../../components/jobs/JobCard.jsx'
import { useSavedJobs } from '../../context/SavedJobsContext.jsx'

export default function SavedJobs() {
  const { savedJobs, loading } = useSavedJobs()

  return (
    <div>
      <Helmet><title>Saved Jobs | CareerHub</title></Helmet>
      <h2 className="font-display text-xl font-bold text-ink">Saved Jobs</h2>
      <p className="mt-1 text-sm text-ink-soft">{savedJobs.length} jobs saved for later.</p>

      {loading ? (
        <div className="mt-6 rounded-lg border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">Loading saved jobs…</div>
      ) : savedJobs.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">
          You haven't saved any jobs yet. Browse jobs and tap the bookmark icon to save them here.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {savedJobs.map((job) => (
            <JobCard key={job._id || job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
