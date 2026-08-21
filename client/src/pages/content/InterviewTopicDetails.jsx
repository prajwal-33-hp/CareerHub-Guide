import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronDown } from 'lucide-react'
import Breadcrumb from '../../components/common/Breadcrumb.jsx'
import { interviewTopics } from '../../utils/contentData.js'

export default function InterviewTopicDetails() {
  const { slug } = useParams()
  const topic = interviewTopics.find((t) => t.slug === slug)
  const [openIndex, setOpenIndex] = useState(0)
  if (!topic) return <Navigate to="/404" replace />

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: topic.questions.map((q) => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: q.a },
    })),
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>{`${topic.title} | CareerHub`}</title>
        <meta name="description" content={`${topic.questions.length} commonly asked ${topic.title.toLowerCase()} with clear explanations.`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Interview Prep', to: '/interview-questions' }, { label: topic.title }]} />

      <h1 className="font-display text-2xl font-bold text-ink">{topic.title}</h1>

      <div className="mt-6 space-y-2">
        {topic.questions.map((item, i) => (
          <div key={i} className="rounded-lg border border-ink/10 bg-white">
            <button
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-ink">{item.q}</span>
              <ChevronDown size={16} className={`shrink-0 text-ink-soft transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {openIndex === i && <p className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{item.a}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
