const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const {
  sendContactMessage,
  getRecruiterMessages,
  markMessageAsRead,
} = require('../controllers/contactController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

// Optional auth middleware for POST /api/contact
const optionalAuth = async (req, res, next) => {
  let token
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)
      if (user && user.status !== 'suspended') {
        req.user = user
      }
    } catch (err) {
      // Ignore invalid token and continue as guest
    }
  }
  next()
}

router.post('/', optionalAuth, sendContactMessage)
router.get('/recruiter', protect, authorize('recruiter', 'admin'), getRecruiterMessages)
router.put('/:id/read', protect, authorize('recruiter', 'admin'), markMessageAsRead)

module.exports = router
