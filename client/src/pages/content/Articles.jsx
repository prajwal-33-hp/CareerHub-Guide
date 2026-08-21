import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Clock } from 'lucide-react'
import { articles } from '../../utils/contentData.js'

export default function Articles() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Career Articles | CareerHub</title>
        <meta name="description" content="Practical guides on becoming a full stack developer, React and Node roadmaps, and interview preparation." />
      </Helmet>
      <h1 className="font-display text-2xl font-bold text-ink">Career Articles</h1>
      <p className="mt-1 text-sm text-ink-soft">Practical, no-fluff guides for students starting their careers.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link key={a.id} to={`/articles/${a.slug}`} className="rounded-lg border border-ink/10 bg-white p-5 transition-colors hover:border-signal">
            <span className="badge bg-paper text-ink-soft">{a.category}</span>
            <h2 className="mt-3 font-display font-semibold text-ink">{a.title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{a.excerpt}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1"><Clock size={12} />{a.readTime}</span>
              <span className="flex items-center gap-1 font-medium text-signal-dark">Read <ArrowRight size={12} /></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
