import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Briefcase,
  Building2,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react'
import api from '../../services/api.js'

export default function Overview() {
  const [stats, setStats] = useState({
    students: 0,
    recruiters: 0,
    companies: 0,
    jobs: 0,
    pendingJobs: 0,
    pendingRecruiters: 0,
    totalRecruiterRequests: 0,
  })
  const [recentApplications, setRecentApplications] = useState([])
  const [recentJobs, setRecentJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.all([
      api.get('/users', { params: { role: 'student' } }).catch(() => ({ data: { users: [] } })),
      api.get('/users', { params: { role: 'recruiter' } }).catch(() => ({ data: { users: [] } })),
      api.get('/companies').catch(() => ({ data: { companies: [] } })),
      api.get('/jobs/all').catch(() => ({ data: { jobs: [] } })),
      api.get('/recruiter-verification/admin/applications', { params: { limit: 5 } }).catch(() => ({
        data: { applications: [], total: 0, counts: [] },
      })),
    ])
      .then(([studentsRes, recruitersRes, companiesRes, jobsRes, applicationsRes]) => {
        if (!mounted) return

        const students = studentsRes.data?.users || []
        const recruiters = recruitersRes.data?.users || []
        const companies = companiesRes.data?.companies || []
        const jobs = jobsRes.data?.jobs || []
        const applications = applicationsRes.data?.applications || []
        const appCounts = applicationsRes.data?.counts || []

        // Calculate pending recruiter applications (REQUESTED or UNDER_REVIEW)
        const pendingAppsCount = applications.filter(
          (app) => app.status === 'REQUESTED' || app.status === 'UNDER_REVIEW'
        ).length

        setStats({
          students: students.length,
          recruiters: recruiters.length,
          companies: companies.length,
          jobs: jobs.length,
          pendingJobs: jobs.filter((job) => job.status === 'pending').length,
          pendingRecruiters: pendingAppsCount,
          totalRecruiterRequests: applicationsRes.data?.total || applications.length,
        })

        setRecentApplications(applications.slice(0, 4))
        setRecentJobs(jobs.slice(0, 4))
      })
      .catch(() => {
        if (mounted) {
          setStats({
            students: 0,
            recruiters: 0,
            companies: 0,
            jobs: 0,
            pendingJobs: 0,
            pendingRecruiters: 0,
            totalRecruiterRequests: 0,
          })
          setRecentApplications([])
          setRecentJobs([])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const displayStats = [
    {
      label: 'Pending Recruiter Requests',
      value: stats.pendingRecruiters,
      icon: Clock,
      to: '/admin/dashboard/recruiter-requests',
      highlight: stats.pendingRecruiters > 0,
    },
    {
      label: 'Approved Recruiters',
      value: stats.recruiters,
      icon: ShieldCheck,
      to: '/admin/dashboard/users',
      highlight: false,
    },
    {
      label: 'Total Candidates',
      value: stats.students,
      icon: Users,
      to: '/admin/dashboard/users',
      highlight: false,
    },
    {
      label: 'Verified Companies',
      value: stats.companies,
      icon: Building2,
      to: '/admin/dashboard/companies',
      highlight: false,
    },
    {
      label: 'Active Jobs',
      value: stats.jobs,
      icon: Briefcase,
      to: '/admin/dashboard/jobs',
      highlight: false,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">Platform Overview</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Live administrative analytics, pending recruiter verification queue, and real-time moderation.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {displayStats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              to={s.to}
              className={`rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                s.highlight
                  ? 'border-amber-400/60 bg-gradient-to-b from-amber-50/50 to-white text-ink'
                  : 'border-ink/10 bg-white hover:border-signal'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">{s.label}</span>
                <Icon
                  size={16}
                  className={s.highlight ? 'text-amber-600' : 'text-ink-soft/60'}
                />
              </div>
              <p className="mt-3 font-display text-3xl font-bold text-ink">
                {loading ? '—' : s.value}
              </p>
              {s.highlight && s.value > 0 && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Action Required
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recruiter Requests Live Queue */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <FileCheck size={18} className="text-signal-dark" /> Recruiter Applications
              </h3>
              <p className="text-xs text-ink-soft">Recent recruiter onboarding requests</p>
            </div>
            <Link
              to="/admin/dashboard/recruiter-requests"
              className="text-xs font-semibold text-signal-dark hover:underline flex items-center gap-1"
            >
              <span>View all ({stats.totalRecruiterRequests})</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-ink-soft animate-pulse">
                Loading recruiter requests…
              </div>
            ) : recentApplications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink/15 py-10 text-center text-xs text-ink-soft">
                No recruiter applications received yet.
              </div>
            ) : (
              recentApplications.map((app) => (
                <div
                  key={app._id}
                  className="flex items-center justify-between rounded-xl border border-ink/10 bg-paper p-3.5 hover:border-signal/50 transition"
                >
                  <div className="space-y-1">
                    <p className="font-display text-sm font-bold text-ink">
                      {app.applicantDetails?.fullName || 'Applicant'}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {app.companyDetails?.legalName || 'Company'} • {app.applicantDetails?.workEmail}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`badge text-[10px] font-bold uppercase ${
                        app.status === 'APPROVED'
                          ? 'bg-success/15 text-success'
                          : app.status === 'REJECTED'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                    <Link
                      to="/admin/dashboard/recruiter-requests"
                      className="btn-secondary py-1 px-2.5 text-xs font-semibold shrink-0"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Job Postings */}
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <Briefcase size={18} className="text-signal-dark" /> Recent Job Postings
              </h3>
              <p className="text-xs text-ink-soft">Latest opportunities posted by recruiters</p>
            </div>
            <Link
              to="/admin/dashboard/jobs"
              className="text-xs font-semibold text-signal-dark hover:underline flex items-center gap-1"
            >
              <span>Manage all ({stats.jobs})</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-ink-soft animate-pulse">
                Loading job postings…
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink/15 py-10 text-center text-xs text-ink-soft">
                No jobs posted yet. Jobs will appear once approved recruiters post openings.
              </div>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job._id}
                  className="flex items-center justify-between rounded-xl border border-ink/10 bg-paper p-3.5 hover:border-signal/50 transition"
                >
                  <div className="space-y-1">
                    <p className="font-display text-sm font-bold text-ink">{job.title}</p>
                    <p className="text-xs text-ink-soft">
                      {job.company?.name || 'Verified Company'} • {job.location} • {job.jobType}
                    </p>
                  </div>

                  <span
                    className={`badge text-[10px] font-bold uppercase ${
                      job.status === 'approved'
                        ? 'bg-success/15 text-success'
                        : job.status === 'rejected'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {job.status || 'Active'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
