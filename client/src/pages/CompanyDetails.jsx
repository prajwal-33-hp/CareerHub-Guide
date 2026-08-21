import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MapPin, Users, Briefcase, Mail } from 'lucide-react'
import Breadcrumb from '../components/common/Breadcrumb.jsx'
import JobCard from '../components/jobs/JobCard.jsx'
import api from '../services/api.js'

export default function CompanyDetails() {
  const { slug } = useParams()
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    api.get(`/companies/${slug}`)
      .then(({ data }) => {
        if (!mounted) return
        setCompany(data.company)
        return api.get('/jobs', { params: { company: data.company._id } })
      })
      .then((jobsResponse) => {
        if (!mounted || !jobsResponse) return
        setJobs(jobsResponse.data.jobs)
      })
      .catch((err) => {
        if (!mounted) return
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">Loading company details…</div>
  }

  if (notFound || !company) {
    return <Navigate to="/404" replace />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{`${company.name} Jobs & Internships | CareerHub`}</title>
        <meta name="description" content={`Explore open roles at ${company.name}. ${company.description}`} />
      </Helmet>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Companies', to: '/companies' }, { label: company.name }]} />

      <div className="rounded-lg border border-ink/10 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-ink font-display text-xl font-bold text-signal">{company.logo || company.name?.[0]}</div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">{company.name}</h1>
              <p className="text-sm text-ink-soft">{company.industry}</p>
            </div>
          </div>
          <Link
            to={`/contact?company=${company._id}&subject=Inquiry%20regarding%20${encodeURIComponent(company.name)}`}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <Mail size={15} /> Contact Recruiter
          </Link>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{company.description}</p>
        <div className="mt-4 flex gap-5 font-mono text-xs text-ink-soft">
          <span className="flex items-center gap-1"><MapPin size={13} />{company.location}</span>
          <span className="flex items-center gap-1"><Users size={13} />{company.employees || '1-10'} employees</span>
          <span className="flex items-center gap-1"><Briefcase size={13} />{jobs.length} open roles</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-bold text-ink">Open Roles</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/20 py-12 text-center text-sm text-ink-soft">No current roles are posted for this company.</div>
          ) : (
            jobs.map((job) => <JobCard key={job._id || job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  )
}
