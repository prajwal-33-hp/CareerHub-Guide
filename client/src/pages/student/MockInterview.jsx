import { useState, useEffect, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Sparkles,
  Award,
  RotateCcw,
  ArrowRight,
  Printer,
  Download,
  Lightbulb,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Radio,
  CheckCircle2,
  AlertCircle,
  Headphones,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadTextFile, printOrSaveAsPDF } from '../../utils/exportUtils.js'
import api from '../../services/api.js'

export default function MockInterview() {
  const { user } = useAuth()
  const { showToast } = useToast()

  // Setup state
  const [targetRole, setTargetRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('Entry Level (0-2 YOE)')
  const [interviewType, setInterviewType] = useState('Technical & Behavioral')

  // Flow state: 'setup' | 'interview' | 'finished'
  const [stage, setStage] = useState('setup')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  // In-session state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answerInput, setAnswerInput] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [history, setHistory] = useState([])

  // Conversational Turn-Taking States: 'ai_speaking' | 'candidate_recording' | 'idle'
  const [turnState, setTurnState] = useState('idle')
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const recognitionRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const autoMicTimerRef = useRef(null)

  // Play gentle studio chime when AI finishes and candidate's mic opens
  function playTurnChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15) // A5 note

      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch (e) {
      // AudioContext fallback
    }
  }

  // Setup SpeechRecognition once on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition()
      recognizer.continuous = true
      recognizer.interimResults = true
      recognizer.lang = 'en-US'

      recognizer.onresult = (event) => {
        // STRICT AUDIO ISOLATION: Discard if AI is currently speaking!
        if (isSpeakingRef.current) return

        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' '
        }
        setAnswerInput(transcript.trim())
      }

      recognizer.onerror = (err) => {
        if (err.error !== 'no-speech' && !isSpeakingRef.current) {
          console.warn('Speech recognition notice:', err.error)
          setTurnState('idle')
        }
      }

      recognizer.onend = () => {
        if (!isSpeakingRef.current && turnState === 'candidate_recording') {
          try {
            recognizer.start()
          } catch (e) {
            setTurnState('idle')
          }
        }
      }

      recognitionRef.current = recognizer
    }

    return () => {
      clearTimeout(autoMicTimerRef.current)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  function startCandidateMic() {
    if (isSpeakingRef.current) return

    if (!recognitionRef.current) {
      showToast('Voice input is not supported in this browser. Please use Google Chrome or Edge.', 'info')
      return
    }

    try {
      recognitionRef.current.start()
      setTurnState('candidate_recording')
      showToast('🎙️ AI finished reading! Speak your answer now.', 'success')
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        setTurnState('candidate_recording')
      } else {
        console.warn('Mic start notice:', err)
      }
    }
  }

  function stopCandidateMic() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    }
    setTurnState('idle')
    showToast('Microphone paused.', 'info')
  }

  function toggleCandidateMic() {
    if (turnState === 'candidate_recording') {
      stopCandidateMic()
    } else {
      stopAudioPlayback()
      startCandidateMic()
    }
  }

  function stopAudioPlayback() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    clearTimeout(autoMicTimerRef.current)
    setTurnState('idle')
  }

  /**
   * Loud Question Reading with Automatic Echo Isolation & Mic Turn Taking
   */
  const speakLoudQuestion = useCallback((text, autoOpenMic = true) => {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

    // 1. Instantly abort microphone so speaker output is never captured
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {}
    }

    if (!voiceEnabled) {
      if (autoOpenMic) {
        setTimeout(() => startCandidateMic(), 400)
      }
      return
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.resume() // Unfreeze Chrome audio engine
    clearTimeout(autoMicTimerRef.current)

    isSpeakingRef.current = true
    setTurnState('ai_speaking')

    const cleanText = text.replace(/[*_#`~[\]]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.pitch = 1.0
    utterance.volume = 1.0 // 100% full loud volume

    const voices = window.speechSynthesis.getVoices()
    const preferredVoice =
      voices.find(
        (v) =>
          (v.name.includes('Google US English') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Jenny') ||
            v.name.includes('Guy')) &&
          v.lang.startsWith('en')
      ) || voices.find((v) => v.lang === 'en-US' || v.lang.startsWith('en'))

    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = () => {
      isSpeakingRef.current = false
      setTurnState('idle')

      if (autoOpenMic) {
        // Acoustic buffer: wait 400ms for room echo to settle, play chime, then activate mic
        autoMicTimerRef.current = setTimeout(() => {
          playTurnChime()
          startCandidateMic()
        }, 400)
      }
    }

    utterance.onerror = () => {
      isSpeakingRef.current = false
      setTurnState('idle')
      if (autoOpenMic) {
        startCandidateMic()
      }
    }

    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  // Automatically read question aloud whenever session starts or index advances
  useEffect(() => {
    if (stage === 'interview' && session && session.questions && session.questions[currentIndex]) {
      const qText = session.questions[currentIndex]?.question
      if (qText) {
        const timer = setTimeout(() => {
          speakLoudQuestion(qText, true)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [stage, session, currentIndex, speakLoudQuestion])

  async function handleStartInterview(e) {
    if (e) e.preventDefault()
    if (!targetRole.trim()) {
      showToast('Please enter your target role.', 'danger')
      return
    }

    // Warm up speech synthesis immediately on user click gesture
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }

    setLoading(true)
    try {
      const { data } = await api.post('/ai/mock-interview/start', {
        targetRole,
        experienceLevel,
        interviewType,
      })

      if (data.session && data.session.questions?.length > 0) {
        setSession(data.session)
        setCurrentIndex(0)
        setAnswerInput('')
        setCurrentEvaluation(null)
        setHistory([])
        setStage('interview')
        showToast('Session started! AI is reading Question 1 out loud...', 'success')
      } else {
        throw new Error('No questions generated. Please try again.')
      }
    } catch (err) {
      showToast(err.message || 'Failed to start mock interview.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!answerInput.trim()) {
      showToast('Please speak or type your response before submitting.', 'danger')
      return
    }

    stopCandidateMic()
    stopAudioPlayback()

    const currentQ = session.questions[currentIndex]
    setEvaluating(true)

    try {
      const { data } = await api.post('/ai/mock-interview/evaluate', {
        targetRole,
        experienceLevel,
        question: currentQ.question,
        category: currentQ.category,
        answer: answerInput,
      })

      const evalData = data.evaluation
      setCurrentEvaluation(evalData)

      setHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          answer: answerInput,
          evaluation: evalData,
        },
      ])

      showToast('Answer evaluated by AI!', 'success')

      // Read verbal critique aloud (mic stays closed during evaluation)
      if (voiceEnabled && evalData.feedbackSummary) {
        setTimeout(() => {
          speakLoudQuestion(
            `Score: ${evalData.score} out of 10. ${evalData.feedbackSummary}`,
            false
          )
        }, 300)
      }
    } catch (err) {
      showToast(err.message || 'Evaluation failed. Please retry.', 'danger')
    } finally {
      setEvaluating(false)
    }
  }

  function handleNextQuestion() {
    stopCandidateMic()
    stopAudioPlayback()

    if (currentIndex + 1 < session.questions.length) {
      setCurrentIndex((prev) => prev + 1)
      setAnswerInput('')
      setCurrentEvaluation(null)
      setShowHint(false)
    } else {
      setStage('finished')
    }
  }

  function handleRestart() {
    stopCandidateMic()
    stopAudioPlayback()
    setStage('setup')
    setSession(null)
    setHistory([])
    setCurrentEvaluation(null)
    setAnswerInput('')
    setTurnState('idle')
  }

  const averageScore = history.length
    ? (
        history.reduce((sum, h) => sum + (h.evaluation?.score || 5), 0) / history.length
      ).toFixed(1)
    : 0

  function handleExportPDF() {
    const reportHtml = `
      <div class="score-card">
        <div>
          <div class="score-badge">${averageScore}/10</div>
          <div style="font-weight: 600; color: #374151;">Overall Interview Score</div>
        </div>
        <div style="margin-left: auto; text-align: right; font-size: 12px;">
          <strong>Target Role:</strong> ${targetRole} (${experienceLevel})<br />
          <strong>Type:</strong> ${interviewType}<br />
          <strong>Candidate:</strong> ${user?.name || 'Applicant'}
        </div>
      </div>

      <div class="section-title">Question by Question Review</div>
      ${history
        .map(
          (h, i) => `
        <div class="card">
          <div style="font-weight: 700; font-size: 13px; color: #111827;">Q${i + 1} (${h.question.category}): ${h.question.question}</div>
          <div style="margin-top: 8px; font-size: 12px; background: #f9fafb; padding: 10px; border-radius: 4px;">
            <strong>Your Answer:</strong><br />
            ${h.answer}
          </div>
          <div style="margin-top: 8px; font-size: 12px;">
            <strong>Score:</strong> ${h.evaluation?.score || 'N/A'}/10<br />
            <strong>Feedback:</strong> ${h.evaluation?.feedbackSummary || ''}
          </div>
          ${
            h.evaluation?.modelAnswer
              ? `<div style="margin-top: 8px; font-size: 11px; color: #065f46; background: #ecfdf5; padding: 8px; border-radius: 4px;">
                  <strong>Model Answer:</strong><br />${h.evaluation.modelAnswer}
                </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    `
    printOrSaveAsPDF(`Mock Interview Report - ${targetRole}`, reportHtml)
  }

  function handleExportText() {
    let text = `========================================================\n`
    text += `CAREERHUB AI MOCK INTERVIEW REPORT\n`
    text += `Target Role: ${targetRole} (${experienceLevel})\n`
    text += `Interview Type: ${interviewType}\n`
    text += `Overall Score: ${averageScore}/10\n`
    text += `Candidate: ${user?.name || 'Student'}\n`
    text += `Date: ${new Date().toLocaleDateString()}\n`
    text += `========================================================\n\n`

    history.forEach((h, i) => {
      text += `QUESTION ${i + 1} [${h.question.category}]:\n${h.question.question}\n\n`
      text += `YOUR ANSWER:\n${h.answer}\n\n`
      text += `SCORE: ${h.evaluation?.score}/10\n`
      text += `FEEDBACK: ${h.evaluation?.feedbackSummary}\n`
      if (h.evaluation?.modelAnswer) {
        text += `MODEL ANSWER:\n${h.evaluation.modelAnswer}\n`
      }
      text += `\n--------------------------------------------------------\n\n`
    })

    downloadTextFile(`Mock_Interview_${targetRole.replace(/\s+/g, '_')}.txt`, text)
  }

  return (
    <div>
      <Helmet>
        <title>Voice AI Mock Interview Simulator | CareerHub</title>
      </Helmet>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal/20 text-signal-dark shadow-2xs">
            <Radio size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <span>Voice AI Mock Interview Simulator</span>
              <span className="rounded-full bg-signal/20 border border-signal/30 px-2.5 py-0.5 text-[10px] font-extrabold text-signal-dark uppercase tracking-wider">
                🎙️ Echo-Isolated Audio
              </span>
            </h2>
            <p className="text-xs text-ink-soft">
              AI reads questions directly out loud $\to$ Mic automatically opens for your spoken response.
            </p>
          </div>
        </div>

        {stage !== 'setup' && (
          <button
            onClick={handleRestart}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> New Session
          </button>
        )}
      </div>

      {/* STAGE 1: SETUP */}
      {stage === 'setup' && (
        <form
          onSubmit={handleStartInterview}
          className="max-w-2xl mx-auto rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8 space-y-5"
        >
          {/* Audio Guarantee Card */}
          <div className="rounded-2xl border border-signal/30 bg-gradient-to-r from-signal/15 via-amber-500/10 to-signal/5 p-4.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-signal text-ink shrink-0 shadow-2xs">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-ink">
                    AI Assistant
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Interactive voice mock interview with real-time speech recognition.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !voiceEnabled
                  setVoiceEnabled(next)
                  if (next && typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.resume()
                  }
                  showToast(next ? '🔊 AI Voice turned ON' : '🔇 AI Voice turned OFF', 'info')
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                  voiceEnabled ? 'bg-signal text-ink shadow-2xs' : 'bg-ink/10 text-ink-soft'
                }`}
              >
                {voiceEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF'}
              </button>
            </div>

            <div className="border-t border-signal/20 pt-2 flex items-center justify-between text-[11px] text-ink-soft">
              <span className="flex items-center gap-1.5 font-medium">
                <Headphones size={13} className="text-signal-dark" />
                Works on all speakers & headphones
              </span>

              <button
                type="button"
                onClick={() => {
                  speakLoudQuestion(
                    'Welcome! I will read each question directly out loud and listen to your answer.',
                    false
                  )
                }}
                className="text-signal-dark font-bold hover:underline flex items-center gap-1"
              >
                <Play size={11} /> Test AI Loud Voice
              </button>
            </div>
          </div>

          <div className="text-center mb-4">
            <h3 className="font-display text-lg font-bold text-ink">Configure Your Interview Session</h3>
            <p className="text-xs text-ink-soft mt-1">
              Gemini will act as your technical interviewer and conduct a 5-question round.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Target Job Role <span className="text-danger">*</span>
            </label>
            <input
              required
              placeholder="e.g. Full Stack Developer, React Engineer, Data Scientist, Backend Node.js"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Internship / Student">Internship / Student</option>
                <option value="Entry Level (0-2 YOE)">Entry Level (0-2 YOE)</option>
                <option value="Mid Level (2-5 YOE)">Mid Level (2-5 YOE)</option>
                <option value="Senior Level (5+ YOE)">Senior Level (5+ YOE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
                Interview Focus
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Technical & Behavioral">Technical & Behavioral (Mixed)</option>
                <option value="Deep Technical & System Design">Deep Technical & System Design</option>
                <option value="Behavioral & Leadership (STAR)">Behavioral & Leadership (STAR)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !targetRole.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4 py-3 text-sm font-bold shadow-md"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" />
                <span>AI Interviewer Preparing Questions…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Start Interactive Voice Mock Interview</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* STAGE 2: INTERACTIVE INTERVIEW */}
      {stage === 'interview' && session && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Progress header */}
          <div className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="badge bg-signal text-ink font-bold text-xs">
                Question {currentIndex + 1} of {session.questions.length}
              </span>
              <span className="badge bg-paper text-ink-soft text-xs">
                {session.questions[currentIndex]?.category || 'Technical'}
              </span>
            </div>

            <div className="w-32 bg-ink/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-signal h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / session.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            {/* Turn Status & Audio Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper/70 p-3 text-xs border border-ink/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled
                    setVoiceEnabled(next)
                    if (!next) stopAudioPlayback()
                    showToast(next ? '🔊 AI Voice turned ON' : '🔇 AI Voice turned OFF', 'info')
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
                    voiceEnabled ? 'bg-signal/20 text-signal-dark border border-signal/30' : 'bg-ink/5 text-ink-soft'
                  }`}
                >
                  {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{voiceEnabled ? 'AI Voice: Active' : 'AI Voice: Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => speakLoudQuestion(session.questions[currentIndex]?.question, true)}
                  className="flex items-center gap-1.5 text-ink font-bold px-3 py-1 rounded-md bg-signal/20 border border-signal/40 hover:bg-signal/30 shadow-2xs transition"
                  title="Re-read Question Loudly"
                >
                  <Volume2 size={13} className="text-signal-dark" />
                  <span>🔊 Re-read Question Loudly</span>
                </button>

                {turnState === 'ai_speaking' && (
                  <button
                    type="button"
                    onClick={stopAudioPlayback}
                    className="flex items-center gap-1 text-danger font-semibold px-2 py-1"
                  >
                    <Square size={12} />
                    <span>Skip Audio</span>
                  </button>
                )}
              </div>

              {/* Dynamic Turn Status Indicator */}
              {turnState === 'ai_speaking' && (
                <div className="flex items-center gap-2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-[11px] font-bold animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>AI Reading Question Directly Aloud…</span>
                </div>
              )}

              {turnState === 'candidate_recording' && (
                <div className="flex items-center gap-2 rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 text-[11px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Your Turn: Recording Your Voice</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-signal-dark mb-1">
                Interviewer Question:
              </p>
              <h3 className="font-display text-lg font-bold text-ink leading-snug">
                {session.questions[currentIndex]?.question}
              </h3>
            </div>

            {session.questions[currentIndex]?.hint && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="text-xs font-semibold text-signal-dark flex items-center gap-1 hover:underline"
                >
                  <Lightbulb size={13} /> {showHint ? 'Hide Hint' : 'Need a hint?'}
                </button>
                {showHint && (
                  <p className="mt-1 text-xs text-ink-soft rounded-lg bg-paper p-3 border-l-3 border-signal">
                    💡 {session.questions[currentIndex].hint}
                  </p>
                )}
              </div>
            )}

            {!currentEvaluation ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Your Response:
                  </label>

                  {/* Speak Your Answer Microphone Button */}
                  <button
                    type="button"
                    onClick={toggleCandidateMic}
                    disabled={turnState === 'ai_speaking'}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                      turnState === 'candidate_recording'
                        ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                        : turnState === 'ai_speaking'
                        ? 'bg-ink/10 text-ink-soft cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-signal via-amber-400 to-amber-500 text-ink hover:opacity-90'
                    }`}
                  >
                    {turnState === 'candidate_recording' ? (
                      <>
                        <MicOff size={15} />
                        <span>⏹️ Stop Mic (Done Speaking)</span>
                      </>
                    ) : turnState === 'ai_speaking' ? (
                      <>
                        <MicOff size={15} />
                        <span>Mic Locked (AI Speaking…)</span>
                      </>
                    ) : (
                      <>
                        <Mic size={15} />
                        <span>🎤 Speak Answer (Mic)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={6}
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder={
                      turnState === 'ai_speaking'
                        ? '🔊 AI is reading the question directly out loud. Microphone will activate automatically as soon as AI finishes...'
                        : turnState === 'candidate_recording'
                        ? '🎙️ AI is listening to your voice! Speak your answer clearly now...'
                        : "Click 'Speak Answer' or wait for AI to finish reading, then speak..."
                    }
                    className={`input-field transition ${
                      turnState === 'candidate_recording'
                        ? 'border-rose-500 ring-4 ring-rose-100 bg-rose-50/20 font-medium text-ink'
                        : turnState === 'ai_speaking'
                        ? 'bg-paper/50 cursor-wait'
                        : ''
                    }`}
                  />
                  {turnState === 'candidate_recording' && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-rose-600 text-white px-3.5 py-1 text-[11px] font-bold shadow-md">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                      <span>Recording Your Answer…</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  disabled={evaluating || !answerInput.trim() || turnState === 'ai_speaking'}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 font-bold text-sm shadow-sm"
                >
                  <Sparkles size={16} />
                  {evaluating ? 'AI Interviewer is evaluating your response…' : 'Submit Answer for AI Evaluation'}
                </button>
              </div>
            ) : (
              /* Immediate Feedback Card */
              <div className="space-y-4 pt-4 border-t border-ink/10">
                <div className="flex items-center justify-between rounded-xl bg-paper/80 p-3.5 border border-ink/5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-signal text-ink px-3.5 py-1 font-display text-base font-extrabold shadow-2xs">
                      {currentEvaluation.score}/10
                    </span>
                    <span className="text-xs font-semibold text-ink-soft">Score Evaluation</span>
                  </div>
                  <p className="text-xs text-ink font-medium text-right max-w-sm">
                    {currentEvaluation.feedbackSummary}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {currentEvaluation.strengths?.length > 0 && (
                    <div className="rounded-xl bg-success/5 border border-success/20 p-3.5 space-y-1.5">
                      <p className="font-bold text-success flex items-center gap-1">
                        <CheckCircle2 size={14} /> What You Did Well:
                      </p>
                      <ul className="space-y-1">
                        {currentEvaluation.strengths.map((s, idx) => (
                          <li key={idx} className="flex gap-1.5 text-ink leading-relaxed">
                            <span className="text-success font-bold">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentEvaluation.improvements?.length > 0 && (
                    <div className="rounded-xl bg-danger/5 border border-danger/20 p-3.5 space-y-1.5">
                      <p className="font-bold text-danger flex items-center gap-1">
                        <AlertCircle size={14} /> Areas for Improvement:
                      </p>
                      <ul className="space-y-1">
                        {currentEvaluation.improvements.map((imp, idx) => (
                          <li key={idx} className="flex gap-1.5 text-ink leading-relaxed">
                            <span className="text-danger font-bold">•</span> {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {currentEvaluation.modelAnswer && (
                  <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/60 p-4 text-xs">
                    <p className="font-bold text-emerald-900 uppercase text-[11px] mb-1">
                      🌟 Exemplary Model Response:
                    </p>
                    <p className="text-emerald-950 leading-relaxed italic">{currentEvaluation.modelAnswer}</p>
                  </div>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 font-bold"
                >
                  <span>
                    {currentIndex + 1 < session.questions.length
                      ? 'Proceed to Next Question'
                      : 'Finish & View Diagnostic Scorecard'}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: FINISHED SCORECARD */}
      {stage === 'finished' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-signal/20 text-signal-dark mb-4 shadow-2xs">
              <Award size={36} className="text-amber-600" />
            </div>
            <h3 className="font-display text-2xl font-bold text-ink">Mock Interview Completed!</h3>
            <p className="text-xs text-ink-soft mt-1">
              Role: <strong className="text-ink">{targetRole}</strong> ({experienceLevel})
            </p>

            <div className="mt-6 flex justify-center gap-6">
              <div className="rounded-2xl border border-signal/40 bg-signal/10 px-6 py-4">
                <div className="font-display text-3xl font-extrabold text-signal-dark">
                  {averageScore}/10
                </div>
                <div className="text-xs font-semibold text-ink-soft uppercase mt-1">
                  Overall Score
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={handleExportPDF}
                className="btn-primary text-xs flex items-center gap-1.5 font-bold shadow-xs"
              >
                <Printer size={14} /> Download PDF Diagnostic Report
              </button>
              <button
                onClick={handleExportText}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download size={14} /> Export Text Summary
              </button>
              <button
                onClick={handleRestart}
                className="btn-ghost text-xs flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Start New Interview
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-ink-soft">
              Question-by-Question Diagnostic Review:
            </h4>
            {history.map((h, i) => (
              <div
                key={i}
                className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-signal text-ink font-bold text-xs">
                      Q{i + 1}
                    </span>
                    <span className="badge bg-paper text-ink-soft text-xs">
                      {h.question.category}
                    </span>
                  </div>
                  <span className="rounded-full bg-signal/20 px-2.5 py-0.5 text-xs font-bold text-signal-dark">
                    Score: {h.evaluation?.score}/10
                  </span>
                </div>

                <p className="font-display text-sm font-bold text-ink">
                  {h.question.question}
                </p>

                <div className="rounded-lg bg-paper p-3 text-xs">
                  <p className="font-semibold text-ink-soft mb-1">Your Spoken/Typed Answer:</p>
                  <p className="text-ink leading-relaxed">{h.answer}</p>
                </div>

                <p className="text-xs text-ink-soft">
                  <strong>Feedback:</strong> {h.evaluation?.feedbackSummary}
                </p>

                {h.evaluation?.modelAnswer && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-xs border border-emerald-100">
                    <p className="font-bold text-emerald-900 mb-1">Model Response:</p>
                    <p className="text-emerald-950 italic leading-relaxed">{h.evaluation.modelAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
