import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="flex items-center justify-center gap-1 pt-8" aria-label="Pagination">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 text-ink-soft hover:bg-ink/5 disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ${
            p === page ? 'bg-ink text-white' : 'text-ink-soft hover:bg-ink/5'
          }`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 text-ink-soft hover:bg-ink/5 disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
