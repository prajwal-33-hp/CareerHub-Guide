import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SlidersHorizontal } from 'lucide-react'
import FilterSidebar from '../components/jobs/FilterSidebar.jsx'
import JobCard from '../components/jobs/JobCard.jsx'
import Pagination from '../components/common/Pagination.jsx'
import SkeletonCard from '../components/common/SkeletonCard.jsx'
import SearchSuggestions from '../components/common/SearchSuggestions.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import api from '../services/api.js'

const PAGE_SIZE = 4

export default function Jobs({ jobType = null, pageTitle = 'Jobs' }) {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    jobType: [],
    workMode: [],
    skills: searchParams.get('skill') ? [searchParams.get('skill')] : [],
  })
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const debouncedKeyword = useDebounce(filters.keyword, 300)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const params = {
      page,
      limit: PAGE_SIZE,
      sort,
      keyword: debouncedKeyword || undefined,
      location: filters.location || undefined,
      workMode: filters.workMode.length ? filters.workMode.join(',') : undefined,
      skills: filters.skills.length ? filters.skills.join(',') : undefined,
      jobType: jobType ? jobType : filters.jobType.length ? filters.jobType.join(',') : undefined,
    }

    api.get('/jobs', { params })
      .then(({ data }) => {
        if (!mounted) return
        setJobs(data.jobs)
        setTotalResults(data.totalResults)
        setTotalPages(data.totalPages)
      })
      .catch(() => {
        if (mounted) {
          setJobs([])
          setTotalResults(0)
          setTotalPages(1)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [debouncedKeyword, filters.location, filters.jobType, filters.workMode, filters.skills, sort, page, jobType])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, filters.location, filters.jobType.join(','), filters.workMode.join(','), filters.skills.join(','), jobType])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{pageTitle} | CareerHub</title>
        <meta name="description" content={`Browse ${pageTitle.toLowerCase()} across top companies. Filter by location, skills, and work mode.`} />
      </Helmet>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">{pageTitle}</h1>
        <button
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="btn-secondary lg:hidden"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="max-w-md flex-1 rounded-md border border-ink/15 bg-white">
          <SearchSuggestions
            value={filters.keyword}
            onChange={(v) => { setFilters({ ...filters, keyword: v }); setPage(1) }}
            placeholder="Search by title or skill..."
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field w-auto">
          <option value="newest">Newest</option>
          <option value="salary">Salary</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(1) }}
          className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}
        />

        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ink/20 py-16 text-center">
              <p className="font-display text-lg font-semibold text-ink">No jobs match your filters</p>
              <p className="mt-1 text-sm text-ink-soft">Try widening your search or clearing a filter.</p>
              <button onClick={() => setFilters({ keyword: '', location: '', jobType: [], workMode: [], skills: [] })} className="btn-secondary mt-4">
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">{totalResults} results</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
