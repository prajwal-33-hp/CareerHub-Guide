import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Briefcase } from 'lucide-react'
import SearchSuggestions from '../common/SearchSuggestions.jsx'

export default function Hero() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')

  function search(type) {
    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    if (location) params.set('location', location)
    navigate(`/${type}?${params.toString()}`)
  }

  return (
    <section className="relative overflow-hidden bg-ink">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, #FFB020 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        <span className="badge bg-signal/15 text-signal font-mono">Live Platform &middot; Verified Company Openings</span>
        <h1 className="mt-5 font-display text-4xl font-800 tracking-tight text-white sm:text-5xl">
          Find Your Next Opportunity
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 sm:text-lg">
          Discover jobs and internships that match your skills and career goals — from your first
          internship to your next big role.
        </p>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-lg bg-white p-2 shadow-xl sm:flex-row sm:items-center">
          <SearchSuggestions value={keyword} onChange={setKeyword} className="text-left" />
          <div className="hidden w-px bg-ink/10 sm:block" />
          <div className="flex flex-1 items-center gap-2 rounded-md px-3 py-2">
            <MapPin size={18} className="shrink-0 text-ink-soft" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full text-sm text-ink outline-none placeholder:text-ink-soft/60"
            />
          </div>
          <button onClick={() => search('jobs')} className="btn-primary shrink-0">
            <Briefcase size={16} /> Search Jobs
          </button>
        </div>
        <button onClick={() => search('internships')} className="mt-3 text-sm font-medium text-signal hover:underline">
          Looking for an internship instead? →
        </button>
      </div>
    </section>
  )
}
