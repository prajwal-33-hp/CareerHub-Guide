const asyncHandler = require('../utils/asyncHandler')
const pdfModule = require('pdf-parse')
const User = require('../models/User')
const Job = require('../models/Job')
const Application = require('../models/Application')
const {
  getCareerRecommendations,
  analyzeSkillGap,
  generateLearningRoadmap,
  analyzeResume,
  parseResumeToProfile,
  generateCoverLetter,
  startMockInterview,
  evaluateInterviewAnswer,
  calculateApplicantMatch,
} = require('../services/aiService')

/**
 * Helper to extract text from an uploaded file buffer (PDF, TXT, etc.)
 */
const extractTextFromFile = async (file) => {
  if (!file || !file.buffer) return ''

  const isPdf =
    file.mimetype === 'application/pdf' ||
    (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'))

  if (isPdf) {
    try {
      if (typeof pdfModule === 'function') {
        const data = await pdfModule(file.buffer)
        if (data && data.text) return data.text
      } else if (pdfModule && pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: file.buffer })
        const textResult = await parser.getText()
        if (typeof textResult === 'string') return textResult
        if (textResult && textResult.text) return textResult.text
      }
    } catch (pdfErr) {
      console.warn('PDF binary parsing notice:', pdfErr.message)
    }
  }

  return file.buffer.toString('utf-8')
}

// @route   POST /api/ai/career-recommendations
// @access  Private
const getCareerRecommendationsHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const recommendations = await getCareerRecommendations(user)
  res.json({ success: true, recommendations })
})

// @route   POST /api/ai/skill-gap-analysis
// @access  Private
const analyzeSkillGapHandler = asyncHandler(async (req, res) => {
  const { targetRole } = req.body
  if (!targetRole) {
    res.status(400)
    throw new Error('Target role is required')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const analysis = await analyzeSkillGap(user.skills || [], targetRole)
  res.json({ success: true, analysis })
})

// @route   POST /api/ai/learning-roadmap
// @access  Private
const generateLearningRoadmapHandler = asyncHandler(async (req, res) => {
  const { targetRole } = req.body
  if (!targetRole) {
    res.status(400)
    throw new Error('Target role is required')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const roadmap = await generateLearningRoadmap(user, targetRole)
  res.json({ success: true, roadmap })
})

// @route   POST /api/ai/resume-analysis
// @access  Private
const analyzeResumeHandler = asyncHandler(async (req, res) => {
  let resumeText = req.body.resumeText

  if (req.file) {
    resumeText = await extractTextFromFile(req.file)
  }

  if (!resumeText || !resumeText.trim()) {
    res.status(400)
    throw new Error('Please upload a resume file (PDF/TXT) or paste your resume text.')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const analysis = await analyzeResume(resumeText, user.skills || [])
  res.json({ success: true, analysis, extractedLength: resumeText.length })
})

// @route   POST /api/ai/parse-resume-to-profile
// @access  Private
const parseResumeToProfileHandler = asyncHandler(async (req, res) => {
  let resumeText = req.body.resumeText

  if (req.file) {
    resumeText = await extractTextFromFile(req.file)
  }

  if (!resumeText || !resumeText.trim()) {
    res.status(400)
    throw new Error('Please upload a resume file (PDF/TXT) or provide resume text to parse.')
  }

  const profileData = await parseResumeToProfile(resumeText)
  res.json({ success: true, profileData })
})

// @route   POST /api/ai/cover-letter
// @access  Private
const generateCoverLetterHandler = asyncHandler(async (req, res) => {
  const { jobTitle, companyName, jobDescription, tone } = req.body

  if (!jobTitle) {
    res.status(400)
    throw new Error('Job title is required to generate a cover letter.')
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const coverLetter = await generateCoverLetter({
    candidateProfile: user,
    jobTitle,
    companyName: companyName || 'Hiring Team',
    jobDescription: jobDescription || '',
    tone: tone || 'Professional',
  })

  res.json({ success: true, coverLetter })
})

// @route   POST /api/ai/mock-interview/start
// @access  Private
const startMockInterviewHandler = asyncHandler(async (req, res) => {
  const { targetRole, experienceLevel, interviewType } = req.body

  if (!targetRole) {
    res.status(400)
    throw new Error('Target role is required to start mock interview.')
  }

  const sessionData = await startMockInterview({
    targetRole,
    experienceLevel: experienceLevel || 'Entry Level',
    interviewType: interviewType || 'Technical & Behavioral',
  })

  res.json({ success: true, session: sessionData })
})

// @route   POST /api/ai/mock-interview/evaluate
// @access  Private
const evaluateInterviewAnswerHandler = asyncHandler(async (req, res) => {
  const { targetRole, question, answer, category, experienceLevel } = req.body

  if (!question || !answer) {
    res.status(400)
    throw new Error('Both question and answer are required for evaluation.')
  }

  const evaluation = await evaluateInterviewAnswer({
    targetRole: targetRole || 'Software Engineer',
    question,
    answer,
    category: category || 'General',
    experienceLevel: experienceLevel || 'Entry Level',
  })

  res.json({ success: true, evaluation })
})

// @route   POST /api/ai/applicant-match/:applicationId
// @access  Private (recruiter or admin)
const calculateApplicantMatchHandler = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.applicationId)
    .populate('job')
    .populate('applicant', 'name email skills about education projects resumeUrl')

  if (!application) {
    res.status(404)
    throw new Error('Application not found')
  }

  // Permission check
  if (req.user.role !== 'admin' && String(application.job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to analyze this applicant')
  }

  const matchResult = await calculateApplicantMatch(application.job, application.applicant)

  const matchScore =
    typeof matchResult.matchScore === 'number'
      ? Math.min(100, Math.max(0, Math.round(matchResult.matchScore)))
      : 75
  const recommendation =
    matchResult.recommendation || (matchScore >= 80 ? 'Strong Fit' : matchScore >= 55 ? 'Moderate Fit' : 'Low Fit')

  application.aiMatchScore = matchScore
  application.aiMatchSummary = matchResult.matchSummary || ''
  application.aiMatchedSkills = Array.isArray(matchResult.matchedSkills) ? matchResult.matchedSkills : []
  application.aiMissingSkills = Array.isArray(matchResult.missingSkills) ? matchResult.missingSkills : []
  application.aiRecommendation = recommendation
  application.aiAnalyzedAt = new Date()

  await application.save()

  res.json({
    success: true,
    match: {
      matchScore: application.aiMatchScore,
      recommendation: application.aiRecommendation,
      matchSummary: application.aiMatchSummary,
      matchedSkills: application.aiMatchedSkills,
      missingSkills: application.aiMissingSkills,
      keyStrengths: matchResult.keyStrengths || [],
      analyzedAt: application.aiAnalyzedAt,
    },
    application,
  })
})

// @route   POST /api/ai/batch-match/:jobId
// @access  Private (recruiter or admin)
const batchMatchApplicantsHandler = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  if (req.user.role !== 'admin' && String(job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to analyze applicants for this job')
  }

  const applications = await Application.find({ job: job._id }).populate(
    'applicant',
    'name email skills about education projects resumeUrl'
  )

  if (!applications.length) {
    return res.json({ success: true, message: 'No applicants to analyze', updatedCount: 0 })
  }

  const analyzed = []
  for (const app of applications) {
    try {
      const matchResult = await calculateApplicantMatch(job, app.applicant)
      const matchScore =
        typeof matchResult.matchScore === 'number'
          ? Math.min(100, Math.max(0, Math.round(matchResult.matchScore)))
          : 75
      const recommendation =
        matchResult.recommendation || (matchScore >= 80 ? 'Strong Fit' : matchScore >= 55 ? 'Moderate Fit' : 'Low Fit')

      app.aiMatchScore = matchScore
      app.aiMatchSummary = matchResult.matchSummary || ''
      app.aiMatchedSkills = Array.isArray(matchResult.matchedSkills) ? matchResult.matchedSkills : []
      app.aiMissingSkills = Array.isArray(matchResult.missingSkills) ? matchResult.missingSkills : []
      app.aiRecommendation = recommendation
      app.aiAnalyzedAt = new Date()

      await app.save()
      analyzed.push(app._id)
    } catch (err) {
      console.error(`Batch match failed for app ${app._id}:`, err.message)
    }
  }

  res.json({
    success: true,
    message: `Successfully analyzed ${analyzed.length} applicant(s).`,
    updatedCount: analyzed.length,
  })
})

module.exports = {
  getCareerRecommendationsHandler,
  analyzeSkillGapHandler,
  generateLearningRoadmapHandler,
  analyzeResumeHandler,
  parseResumeToProfileHandler,
  generateCoverLetterHandler,
  startMockInterviewHandler,
  evaluateInterviewAnswerHandler,
  calculateApplicantMatchHandler,
  batchMatchApplicantsHandler,
}
