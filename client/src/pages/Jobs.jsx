import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { SlidersHorizontal, X, Search, RefreshCw } from 'lucide-react'
import FilterSidebar from '../components/jobs/FilterSidebar.jsx'
import JobCard from '../components/jobs/JobCard.jsx'
import Pagination from '../components/common/Pagination.jsx'
import SkeletonCard from '../components/common/SkeletonCard.jsx'
import SearchSuggestions from '../components/common/SearchSuggestions.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import api from '../services/api.js'

const PAGE_SIZE = 8

export default function Jobs({ jobType = null, pageTitle = 'Jobs' }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || searchParams.get('keyword') || searchParams.get('search') || '',
    location: searchParams.get('location') || '',
    jobType: searchParams.get('jobType') ? searchParams.get('jobType').split(',') : [],
    workMode: searchParams.get('workMode') ? searchParams.get('workMode').split(',') : [],
    skills: searchParams.get('skill')
      ? [searchParams.get('skill')]
      : searchParams.get('skills')
        ? searchParams.get('skills').split(',')
        : [],
  })

  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Sync state when URL params change (e.g. navigation from Hero, categories, or skills)
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('keyword') || searchParams.get('search') || ''
    const loc = searchParams.get('location') || ''
    const skill = searchParams.get('skill')
    const skillsList = searchParams.get('skills') ? searchParams.get('skills').split(',') : skill ? [skill] : []
    const typeParam = searchParams.get('jobType') ? searchParams.get('jobType').split(',') : []
    const modeParam = searchParams.get('workMode') ? searchParams.get('workMode').split(',') : []

    setFilters((prev) => {
      // Only update if changed to avoid unnecessary renders
      const changed =
        prev.keyword !== q ||
        prev.location !== loc ||
        JSON.stringify(prev.skills) !== JSON.stringify(skillsList) ||
        JSON.stringify(prev.jobType) !== JSON.stringify(typeParam) ||
        JSON.stringify(prev.workMode) !== JSON.stringify(modeParam)

      if (changed) {
        return {
          keyword: q,
          location: loc,
          jobType: typeParam,
          workMode: modeParam,
          skills: skillsList,
        }
      }
      return prev
    })
  }, [searchParams])

  const debouncedKeyword = useDebounce(filters.keyword, 300)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    const effectiveJobType = jobType
      ? jobType
      : filters.jobType.length
        ? filters.jobType.join(',')
        : undefined

    const params = {
      page,
      limit: PAGE_SIZE,
      sort,
      keyword: debouncedKeyword ? debouncedKeyword.trim() : undefined,
      location: filters.location ? filters.location.trim() : undefined,
      workMode: filters.workMode.length ? filters.workMode.join(',') : undefined,
      skills: filters.skills.length ? filters.skills.join(',') : undefined,
      jobType: effectiveJobType,
    }

    api
      .get('/jobs', { params })
      .then(({ data }) => {
        if (!mounted) return
        setJobs(data?.jobs || [])
        setTotalResults(data?.totalResults || 0)
        setTotalPages(data?.totalPages || 1)
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
  }, [
    debouncedKeyword,
    filters.location,
    filters.jobType,
    filters.workMode,
    filters.skills,
    sort,
    page,
    jobType,
  ])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedKeyword,
    filters.location,
    filters.jobType.join(','),
    filters.workMode.join(','),
    filters.skills.join(','),
    jobType,
  ])

  function clearAllFilters() {
    setFilters({ keyword: '', location: '', jobType: [], workMode: [], skills: [] })
    setSearchParams({})
    setPage(1)
  }

  function removeFilter(key, val) {
    if (Array.isArray(filters[key])) {
      setFilters({ ...filters, [key]: filters[key].filter((v) => v !== val) })
    } else {
      setFilters({ ...filters, [key]: '' })
    }
    setPage(1)
  }

  const hasActiveFilters =
    Boolean(filters.keyword) ||
    Boolean(filters.location) ||
    filters.jobType.length > 0 ||
    filters.workMode.length > 0 ||
    filters.skills.length > 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{pageTitle} | CareerHub</title>
        <meta
          name="description"
          content={`Browse ${pageTitle.toLowerCase()} across top companies. Filter by location, skills, and work mode.`}
        />
      </Helmet>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{pageTitle}</h1>
          <p className="mt-0.5 text-xs text-ink-soft">
            Find and apply to curated job openings from verified employers.
          </p>
        </div>
        <button
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="btn-secondary lg:hidden flex items-center gap-1.5"
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Search & Sort Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-xl border border-ink/15 bg-white shadow-2xs">
          <SearchSuggestions
            value={filters.keyword}
            onChange={(v) => {
              setFilters({ ...filters, keyword: v })
              setPage(1)
            }}
            placeholder="Search by title, skill, or company (e.g. React, Developer, Google)..."
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field w-auto text-xs py-2 font-medium"
          >
            <option value="newest">Sort: Newest</option>
            <option value="salary">Sort: Salary</option>
          </select>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-soft">Active filters:</span>
          {filters.keyword && (
            <span className="badge bg-signal/15 text-signal-dark text-xs flex items-center gap-1">
              Search: {filters.keyword}
              <button
                type="button"
                onClick={() => removeFilter('keyword')}
                className="hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.location && (
            <span className="badge bg-signal/15 text-signal-dark text-xs flex items-center gap-1">
              Location: {filters.location}
              <button
                type="button"
                onClick={() => removeFilter('location')}
                className="hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.jobType.map((t) => (
            <span key={t} className="badge bg-signal/15 text-signal-dark text-xs flex items-center gap-1">
              {t}
              <button
                type="button"
                onClick={() => removeFilter('jobType', t)}
                className="hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.workMode.map((m) => (
            <span key={m} className="badge bg-signal/15 text-signal-dark text-xs flex items-center gap-1">
              {m}
              <button
                type="button"
                onClick={() => removeFilter('workMode', m)}
                className="hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.skills.map((s) => (
            <span key={s} className="badge bg-signal/15 text-signal-dark text-xs flex items-center gap-1">
              Skill: {s}
              <button
                type="button"
                onClick={() => removeFilter('skills', s)}
                className="hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-danger hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          filters={filters}
          onChange={(f) => {
            setFilters(f)
            setPage(1)
          }}
          className={mobileFiltersOpen ? 'block' : 'hidden lg:block'}
        />

        <div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-paper text-ink-soft mb-3">
                <Search size={22} />
              </div>
              <p className="font-display text-lg font-bold text-ink">No jobs match your search</p>
              <p className="mt-1 text-xs text-ink-soft max-w-sm mx-auto">
                We couldn&apos;t find any roles matching your current search or filters. Try widening your keywords or clearing filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="btn-primary mt-4 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Reset All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-soft">
                  Showing <strong className="text-ink">{jobs.length}</strong> of{' '}
                  <strong className="text-ink">{totalResults}</strong> job opportunities
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job._id || job.id} job={job} />
                ))}
              </div>

              <div className="mt-8">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
