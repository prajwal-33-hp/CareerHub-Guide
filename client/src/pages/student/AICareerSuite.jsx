import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Sparkles,
  FileText,
  FileEdit,
  MessageSquareCode,
  Briefcase,
  Target,
  Map,
} from 'lucide-react'
import ResumeAnalyzer from './ResumeAnalyzer.jsx'
import CoverLetterGenerator from './CoverLetterGenerator.jsx'
import MockInterview from './MockInterview.jsx'
import CareerRecommendations from './CareerRecommendations.jsx'
import SkillGapAnalysis from './SkillGapAnalysis.jsx'
import LearningRoadmap from './LearningRoadmap.jsx'

const TOOLS = [
  { id: 'resume', label: 'Resume & ATS Score', icon: FileText, desc: 'Scan & score resume' },
  { id: 'cover-letter', label: 'Cover Letter Generator', icon: FileEdit, desc: 'Tailored cover letters' },
  { id: 'interview', label: 'Mock Interview', icon: MessageSquareCode, desc: 'Practice Q&A with AI' },
  { id: 'recommendations', label: 'Career Recommendations', icon: Briefcase, desc: 'Matching career paths' },
  { id: 'skill-gap', label: 'Skill Gap Analysis', icon: Target, desc: 'Find missing skills' },
  { id: 'roadmap', label: 'Learning Roadmap', icon: Map, desc: 'Custom 6-month plan' },
]

export default function AICareerSuite({ defaultTab = 'resume' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || defaultTab)

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  function handleTabChange(toolId) {
    setActiveTab(toolId)
    setSearchParams({ tab: toolId })
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>AI Career Tools Suite | CareerHub</title>
        <meta
          name="description"
          content="All-in-one AI career intelligence suite: ATS Resume scanner, Cover Letter generator, Mock Interview simulator, Career Recommendations, Skill Gap Analysis, and Learning Roadmap."
        />
      </Helmet>

      {/* Header Banner */}
      <div className="rounded-2xl border border-signal/30 bg-gradient-to-r from-signal/15 via-white to-paper p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-signal shadow-sm">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink">AI Career Suite</h1>
                <span className="badge bg-signal text-ink text-[11px] font-bold uppercase">All-in-One</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                Switch between all 6 AI tools in one unified studio. Instant outputs on the same page.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-4">
          {TOOLS.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-ink text-white shadow-md scale-[1.02]'
                    : 'bg-white text-ink-soft hover:bg-paper hover:text-ink border border-ink/10'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-signal' : 'text-ink-soft'} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Tool Output Container (Rendered seamlessly on the same page) */}
      <div className="transition-all duration-300">
        {activeTab === 'resume' && <ResumeAnalyzer />}
        {activeTab === 'cover-letter' && <CoverLetterGenerator />}
        {activeTab === 'interview' && <MockInterview />}
        {activeTab === 'recommendations' && <CareerRecommendations />}
        {activeTab === 'skill-gap' && <SkillGapAnalysis />}
        {activeTab === 'roadmap' && <LearningRoadmap />}
      </div>
    </div>
  )
}
