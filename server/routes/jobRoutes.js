const express = require('express')
const {
  getJobs,
  getJobByIdOrSlug,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getAllJobsForAdmin,
  updateJobStatus,
} = require('../controllers/jobController')
const { applyToJob } = require('../controllers/applicationController')
const { addBookmark, removeBookmark } = require('../controllers/bookmarkController')
const { protect, authorize, requireApprovedRecruiter } = require('../middleware/auth')

const router = express.Router()

// Order matters: specific static paths (/mine, /all) must be declared before
// the dynamic /:idOrSlug route, or Express will treat "mine"/"all" as an id.
router.get('/mine', protect, requireApprovedRecruiter, getMyJobs)
router.get('/all', protect, authorize('admin'), getAllJobsForAdmin)

router.get('/', getJobs)
router.post('/', protect, requireApprovedRecruiter, createJob)

router.get('/:idOrSlug', getJobByIdOrSlug)
router.put('/:id', protect, requireApprovedRecruiter, updateJob)
router.delete('/:id', protect, requireApprovedRecruiter, deleteJob)
router.put('/:id/status', protect, authorize('admin'), updateJobStatus)

router.post('/:id/apply', protect, authorize('student'), applyToJob)
router.post('/:id/bookmark', protect, authorize('student'), addBookmark)
router.delete('/:id/bookmark', protect, authorize('student'), removeBookmark)

module.exports = router
