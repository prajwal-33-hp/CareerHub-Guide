import { useState, useMemo, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import api from '../../services/api.js'

export default function SearchSuggestions({ value, onChange, onSelect, placeholder = 'Job title or skill', className = '' }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pool, setPool] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    let mounted = true

    api.get('/jobs', { params: { limit: 50, sort: 'newest' } })
      .then(({ data }) => {
        if (!mounted) return
        const titles = data.jobs.map((job) => job.title)
        const skills = data.jobs.flatMap((job) => job.skills || [])
        setPool([...new Set([...titles, ...skills])])
      })
      .catch(() => {
        if (mounted) setPool([])
      })

    return () => {
      mounted = false
    }
  }, [])

  const suggestions = useMemo(() => {
    if (!value || value.trim().length < 1) return []
    const q = value.toLowerCase()
    return pool.filter((item) => item.toLowerCase().includes(q)).slice(0, 6)
  }, [value, pool])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item) {
    onChange(item)
    onSelect?.(item)
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <div className="flex items-center gap-2 px-1 py-1">
        <Search size={18} className="shrink-0 text-ink-soft" />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIndex(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-autocomplete="list"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft/60"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-md border border-ink/10 bg-white py-1 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === activeIndex ? 'bg-signal/10 text-signal-dark' : 'text-ink hover:bg-ink/5'
                }`}
              >
                <Search size={13} className="shrink-0 text-ink-soft/60" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
