import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Clock } from 'lucide-react'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import api from '../../services/api.js'

export default function ArticleDetails() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get(`/articles/${slug}`)
      .then(({ data }) => {
        if (mounted) setArticle(data.article)
      })
      .catch(() => {
        if (mounted) setNotFound(true)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [slug])

  if (notFound) return <Navigate to="/404" replace />

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8 space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-paper" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-paper" />
        <div className="h-4 w-32 animate-pulse rounded bg-paper" />
        <div className="space-y-2 pt-4">
          <div className="h-20 animate-pulse rounded-xl bg-paper" />
          <div className="h-20 animate-pulse rounded-xl bg-paper" />
        </div>
      </div>
    )
  }

  if (!article) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{`${article.title} | CareerHub`}</title>
        <meta name="description" content={article.excerpt} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Articles', to: '/articles' }, { label: article.title }]} />

      <span className="badge bg-paper text-ink-soft text-xs">{article.category}</span>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">{article.title}</h1>
      <span className="mt-2 flex items-center gap-1 text-xs text-ink-soft"><Clock size={12} />{article.readTime}</span>

      <div className="mt-6 space-y-4">
        {article.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink-soft">{p}</p>
        ))}
      </div>
    </div>
  )
}
