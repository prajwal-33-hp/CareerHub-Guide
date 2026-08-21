import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight,
  Code2,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  HelpCircle,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import api from '../services/api.js'

export default function Skills() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  // Quiz Modal State
  const [activeSkillQuiz, setActiveSkillQuiz] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState(null)
  const [userAnswers, setUserAnswers] = useState({})
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)

  useEffect(() => {
    let mounted = true
    api
      .get('/jobs', { params: { limit: 200, sort: 'newest' } })
      .then(({ data }) => {
        if (!mounted) return
        const counts = (data.jobs || []).reduce((acc, job) => {
          ;(job.skills || []).forEach((skill) => {
            acc[skill] = (acc[skill] || 0) + 1
          })
          return acc
        }, {})

        const skillList = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        setSkills(skillList)
      })
      .catch(() => {
        if (mounted) setSkills([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function handleStartAssessment(skillName) {
    if (!user) {
      showToast('Please sign in to take skill assessments and earn verified badges.', 'info')
      return
    }

    setActiveSkillQuiz(skillName)
    setQuizLoading(true)
    setQuizQuestions(null)
    setUserAnswers({})
    setQuizResult(null)

    try {
      const { data } = await api.post('/ai/skill-quiz/generate', {
        skill: skillName,
        level: 'Intermediate',
      })

      if (data.quiz && data.quiz.questions?.length) {
        setQuizQuestions(data.quiz.questions)
      } else {
        throw new Error('Could not generate quiz questions')
      }
    } catch (err) {
      showToast(err.message || 'Failed to start assessment.', 'danger')
      setActiveSkillQuiz(null)
    } finally {
      setQuizLoading(false)
    }
  }

  async function handleSubmitQuiz() {
    if (!quizQuestions || !activeSkillQuiz) return

    setSubmittingQuiz(true)
    try {
      const { data } = await api.post('/ai/skill-quiz/submit', {
        skill: activeSkillQuiz,
        userAnswers,
        questions: quizQuestions,
      })

      setQuizResult(data.evaluation)
      if (data.evaluation?.passed) {
        showToast(`🎉 You passed and earned your ${activeSkillQuiz} badge!`, 'success')
      } else {
        showToast('Assessment completed. Review explanations below.', 'info')
      }
    } catch (err) {
      showToast(err.message || 'Failed to evaluate quiz.', 'danger')
    } finally {
      setSubmittingQuiz(false)
    }
  }

  function handleCloseModal() {
    setActiveSkillQuiz(null)
    setQuizQuestions(null)
    setUserAnswers({})
    setQuizResult(null)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <Helmet>
        <title>Browse Skills & AI Skill Assessments | CareerHub</title>
        <meta
          name="description"
          content="Explore open roles by skill and take interactive Gemini AI skill assessments to earn verified badges."
        />
      </Helmet>

      {/* Header Banner */}
      <div className="rounded-2xl border border-signal/30 bg-gradient-to-r from-signal/15 via-white to-paper p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-signal shadow-xs">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink">Skills & AI Skill Badges</h1>
                <span className="badge bg-signal text-ink text-[11px] font-bold uppercase">AI Verified</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">
                Browse open jobs by tech stack or take a 5-question AI skill assessment to prove your competence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-4">Top In-Demand Skills</h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-paper" />
            ))
          ) : skills.length > 0 ? (
            skills.map((s) => (
              <div
                key={s.name}
                className="group flex flex-col justify-between rounded-xl border border-ink/10 bg-white p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-signal hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-paper text-ink group-hover:bg-signal/20 group-hover:text-signal-dark transition">
                      <Code2 size={18} />
                    </span>
                    <div>
                      <p className="font-display text-base font-bold text-ink">{s.name}</p>
                      <p className="font-mono text-xs text-ink-soft">{s.count} active job opportunities</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-ink/5 pt-3">
                  <Link
                    to={`/jobs?skill=${encodeURIComponent(s.name)}`}
                    className="text-xs font-semibold text-ink hover:text-signal-dark flex items-center gap-1"
                  >
                    <span>View Jobs</span>
                    <ArrowRight size={12} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleStartAssessment(s.name)}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-2.5 bg-signal/10 text-signal-dark border-signal/20 hover:bg-signal/20 font-bold"
                  >
                    <Award size={13} />
                    <span>Take AI Quiz</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-ink/20 py-16 text-center text-sm text-ink-soft">
              No skills indexed at the moment.
            </div>
          )}
        </div>
      </div>

      {/* Interactive AI Skill Quiz Modal */}
      {activeSkillQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/20 text-signal-dark">
                  <Award size={22} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {activeSkillQuiz} Skill Assessment
                  </h3>
                  <p className="text-xs text-ink-soft">
                    5 AI-generated multiple choice questions to verify your competence.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quiz Content */}
            {quizLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-signal border-t-transparent" />
                <p className="font-display text-sm font-bold text-ink">
                  Gemini is generating 5 custom questions for {activeSkillQuiz}…
                </p>
                <p className="text-xs text-ink-soft">Tailoring real-world concepts and debugging scenarios.</p>
              </div>
            ) : quizResult ? (
              /* Quiz Result Review */
              <div className="space-y-5">
                <div className="rounded-xl border border-ink/10 bg-paper p-5 text-center">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-white shadow-xs mb-2">
                    <Award size={28} className={quizResult.passed ? 'text-success' : 'text-signal-dark'} />
                  </div>
                  <h4 className="font-display text-xl font-bold text-ink">
                    Score: {quizResult.score}% ({quizResult.correctCount}/{quizResult.totalQuestions} Correct)
                  </h4>
                  <p className="text-xs font-semibold text-signal-dark mt-0.5">
                    Badge Status: <strong>{quizResult.badgeLevel}</strong>
                  </p>
                  <p className="mt-2 text-xs text-ink-soft max-w-md mx-auto">{quizResult.feedback}</p>
                </div>

                {/* Review Questions */}
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {(quizResult.review || []).map((r, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-4 text-xs space-y-2 ${
                        r.isCorrect ? 'border-success/30 bg-success/5' : 'border-danger/20 bg-danger/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {r.isCorrect ? (
                          <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-display font-bold text-ink">
                            Q{i + 1}: {r.question}
                          </p>
                          <p className="mt-1 text-ink-soft">
                            Your answer: <strong>{r.selectedOption}</strong>
                          </p>
                          {!r.isCorrect && (
                            <p className="text-success font-semibold mt-0.5">
                              Correct answer: {r.correctOption}
                            </p>
                          )}
                          <p className="mt-1 text-ink-soft/90 italic">💡 {r.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-ink/10">
                  <button
                    type="button"
                    onClick={() => handleStartAssessment(activeSkillQuiz)}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} /> Retake Assessment
                  </button>
                  <button type="button" onClick={handleCloseModal} className="btn-primary text-xs">
                    Done
                  </button>
                </div>
              </div>
            ) : quizQuestions ? (
              /* Quiz Taking Form */
              <div className="space-y-6">
                <div className="space-y-5 max-h-[450px] overflow-y-auto pr-2">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="rounded-xl border border-ink/10 bg-paper/40 p-4 space-y-3">
                      <p className="font-display text-sm font-bold text-ink">
                        {qIdx + 1}. {q.question}
                      </p>

                      <div className="space-y-2">
                        {(q.options || []).map((opt, optIdx) => {
                          const isSelected = userAnswers[qIdx] === optIdx
                          return (
                            <button
                              type="button"
                              key={optIdx}
                              onClick={() =>
                                setUserAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                              }
                              className={`w-full text-left rounded-lg border p-2.5 text-xs transition flex items-center gap-2.5 ${
                                isSelected
                                  ? 'border-signal bg-signal/15 text-signal-dark font-semibold shadow-2xs'
                                  : 'border-ink/10 bg-white text-ink-soft hover:border-ink/20 hover:text-ink'
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isSelected ? 'bg-signal text-ink' : 'bg-paper text-ink-soft'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-ink/10">
                  <span className="text-xs text-ink-soft">
                    Answered {Object.keys(userAnswers).length} of {quizQuestions.length} questions
                  </span>

                  <div className="flex gap-2">
                    <button type="button" onClick={handleCloseModal} className="btn-secondary text-xs">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz || Object.keys(userAnswers).length === 0}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className={submittingQuiz ? 'animate-spin' : ''} />
                      {submittingQuiz ? 'Evaluating Answers…' : 'Submit Assessment'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
