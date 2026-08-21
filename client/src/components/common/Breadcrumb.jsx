import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export default function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-ink-soft/50" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-ink">{item.label}</Link>
            ) : (
              <span className="text-ink font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
