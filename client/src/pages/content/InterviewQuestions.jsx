import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight } from 'lucide-react'
import { interviewTopics } from '../../utils/contentData.js'

export default function InterviewQuestions() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet>
        <title>Interview Questions | CareerHub</title>
        <meta name="description" content="Common React, JavaScript, Node.js, MongoDB, and full-stack interview questions with clear explanations." />
      </Helmet>
      <h1 className="font-display text-2xl font-bold text-ink">Interview Preparation</h1>
      <p className="mt-1 text-sm text-ink-soft">Commonly asked questions, organized by topic.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {interviewTopics.map((t) => (
          <Link key={t.id} to={`/interview-questions/${t.slug}`} className="rounded-lg border border-ink/10 bg-white p-5 transition-colors hover:border-signal">
            <h2 className="font-display font-semibold text-ink">{t.title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{t.questions.length} questions covered</p>
            <span className="mt-3 flex items-center gap-1 text-xs font-medium text-signal-dark">View questions <ArrowRight size={12} /></span>
          </Link>
        ))}
      </div>
    </div>
  )
}
