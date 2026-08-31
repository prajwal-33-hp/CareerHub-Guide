const express = require('express')
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateAccount,
  googleAuth,
  googleCallback,
} = require('../controllers/authController')
const { protect } = require('../middleware/auth')

const router = express.Router()

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

