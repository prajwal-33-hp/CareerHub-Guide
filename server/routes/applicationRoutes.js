const express = require('express')
const {
  getMyApplications,
  getApplicationsForRecruiter,
  getApplicantsForJob,
  getApplicationById,
  updateApplicationStatus,
} = require('../controllers/applicationController')
const { protect, authorize, requireApprovedRecruiter } = require('../middleware/auth')

const router = express.Router()

router.get('/', protect, authorize('student'), getMyApplications)
router.get('/recruiter', protect, requireApprovedRecruiter, getApplicationsForRecruiter)
router.get('/job/:jobId', protect, requireApprovedRecruiter, getApplicantsForJob)
router.get('/:id', protect, getApplicationById)
router.put('/:id/status', protect, requireApprovedRecruiter, updateApplicationStatus)

module.exports = router
