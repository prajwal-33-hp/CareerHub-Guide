import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Clock } from 'lucide-react'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import { articles } from '../../utils/contentData.js'

export default function ArticleDetails() {
  const { slug } = useParams()
  const article = articles.find((a) => a.slug === slug)
  if (!article) return <Navigate to="/404" replace />

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

      <span className="badge bg-paper text-ink-soft">{article.category}</span>
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
