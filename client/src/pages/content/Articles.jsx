import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, Clock, BookOpen } from 'lucide-react'
import api from '../../services/api.js'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/articles')
      .then(({ data }) => {
        if (mounted) setArticles(data.articles || [])
      })
      .catch(() => {
        if (mounted) setArticles([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Career Articles | CareerHub</title>
        <meta name="description" content="Practical guides on becoming a full stack developer, React and Node roadmaps, and interview preparation." />
      </Helmet>
      <h1 className="font-display text-2xl font-bold text-ink">Career Articles & Roadmaps</h1>
      <p className="mt-1 text-sm text-ink-soft">Practical, no-fluff guides for candidates launching their tech careers.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-paper" />
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {articles.map((a) => (
            <Link key={a._id || a.slug} to={`/articles/${a.slug}`} className="rounded-xl border border-ink/10 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-signal hover:shadow-sm">
              <span className="badge bg-paper text-ink-soft text-xs">{a.category}</span>
              <h2 className="mt-3 font-display font-bold text-ink">{a.title}</h2>
              <p className="mt-1.5 text-xs text-ink-soft line-clamp-2">{a.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-ink-soft border-t border-ink/5 pt-3">
                <span className="flex items-center gap-1"><Clock size={12} />{a.readTime}</span>
                <span className="flex items-center gap-1 font-semibold text-signal-dark">Read Guide <ArrowRight size={12} /></span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/20 py-16 text-center text-sm text-ink-soft">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-ink-soft/40" />
          No articles published yet.
        </div>
      )}
    </div>
  )
}
