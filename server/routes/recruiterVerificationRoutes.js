const express = require('express')
const {
  submitApplication,
  sendOtp,
  verifyOtp,
  getApplicationStatus,
  uploadDocument,
  getAllApplicationsForAdmin,
  getApplicationByIdForAdmin,
  updateApplicationStatusByAdmin,
  getAuditLogsForAdmin,
} = require('../controllers/recruiterVerificationController')
const { protect, authorize } = require('../middleware/auth')
const documentUpload = require('../middleware/documentUpload')

const router = express.Router()

// User Onboarding & Verification Routes
router.post('/apply', protect, submitApplication)
router.post('/send-otp', protect, sendOtp)
router.post('/verify-otp', protect, verifyOtp)
router.get('/status', protect, getApplicationStatus)
router.post('/upload-document', protect, documentUpload.single('document'), uploadDocument)

// Admin Verification Workflow Routes (restricted to role: admin)
router.get('/admin/applications', protect, authorize('admin'), getAllApplicationsForAdmin)
router.get('/admin/applications/:id', protect, authorize('admin'), getApplicationByIdForAdmin)
router.put('/admin/applications/:id/status', protect, authorize('admin'), updateApplicationStatusByAdmin)
router.get('/admin/audit-logs', protect, authorize('admin'), getAuditLogsForAdmin)

module.exports = router
