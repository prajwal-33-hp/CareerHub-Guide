const express = require('express')
const {
  scheduleInterview,
  selectInterviewSlot,
  getInterviewByApplication,
  getMyInterviews,
  downloadICS,
  cancelInterview,
} = require('../controllers/interviewController')
const { protect } = require('../middleware/auth')

const router = express.Router()

// ICS download can be accessed directly
router.get('/:id/ics', downloadICS)

// All other interview routes require authentication
router.use(protect)

router.post('/schedule', scheduleInterview)
router.post('/:id/select-slot', selectInterviewSlot)
router.get('/application/:applicationId', getInterviewByApplication)
router.get('/mine', getMyInterviews)
router.put('/:id/cancel', cancelInterview)

module.exports = router
