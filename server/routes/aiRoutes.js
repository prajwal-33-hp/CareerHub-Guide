const express = require('express')
const multer = require('multer')
const {
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
} = require('../controllers/aiController')
const { protect } = require('../middleware/auth')

const router = express.Router()

// Multer in-memory storage for PDF / document processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
})

// All AI routes require authentication
router.use(protect)

router.post('/career-recommendations', getCareerRecommendationsHandler)
router.post('/skill-gap-analysis', analyzeSkillGapHandler)
router.post('/learning-roadmap', generateLearningRoadmapHandler)

// Resume analysis supports both direct file upload (PDF/TXT) and text payload
router.post('/resume-analysis', upload.single('resume'), analyzeResumeHandler)

// Auto-fill profile from resume supports file upload or text
router.post('/parse-resume-to-profile', upload.single('resume'), parseResumeToProfileHandler)

// Cover Letter Generator
router.post('/cover-letter', generateCoverLetterHandler)

// AI Mock Interview Simulator
router.post('/mock-interview/start', startMockInterviewHandler)
router.post('/mock-interview/evaluate', evaluateInterviewAnswerHandler)

// Recruiter AI Applicant Match Analysis & Batch Ranking
router.post('/applicant-match/:applicationId', calculateApplicantMatchHandler)
router.post('/batch-match/:jobId', batchMatchApplicantsHandler)

module.exports = router
