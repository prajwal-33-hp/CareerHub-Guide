const express = require('express')
const {
  getMyApplications,
  getApplicationsForRecruiter,
  getApplicantsForJob,
  getApplicationById,
  updateApplicationStatus,
} = require('../controllers/applicationController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/', protect, authorize('student'), getMyApplications)
router.get('/recruiter', protect, authorize('recruiter'), getApplicationsForRecruiter)
router.get('/job/:jobId', protect, authorize('recruiter', 'admin'), getApplicantsForJob)
router.get('/:id', protect, getApplicationById)
router.put('/:id/status', protect, authorize('recruiter', 'admin'), updateApplicationStatus)

module.exports = router
