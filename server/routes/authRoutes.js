const express = require('express')
const {
  sendSignupOtp,
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateAccount,
  getAdminStatus,
  registerAdmin,
  checkEmailLive,
  googleAuth,
  googleCallback,
} = require('../controllers/authController')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.get('/admin-status', getAdminStatus)
router.get('/check-email-live', checkEmailLive)
router.post('/register-admin', registerAdmin)
router.post('/send-signup-otp', sendSignupOtp)
router.post('/register', register)
router.post('/login', login)
router.get('/me', protect, getMe)
router.put('/update-account', protect, updateAccount)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

// Google OAuth 2.0 routes
router.get('/google', googleAuth)
router.get('/google/callback', googleCallback)

module.exports = router

