const jwt = require('jsonwebtoken')
const asyncHandler = require('../utils/asyncHandler')
const User = require('../models/User')

// Verifies the JWT sent in the Authorization header and attaches the
// authenticated user to req.user. This is the middleware that makes a
// route "protected" -- without a valid token, the request never reaches
// the controller.
const protect = asyncHandler(async (req, res, next) => {
  let token

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    res.status(401)
    throw new Error('Not authorized, no token provided')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user) {
      res.status(401)
      throw new Error('Not authorized, user no longer exists')
    }
    if (user.status === 'suspended') {
      res.status(403)
      throw new Error('This account has been suspended')
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401)
    throw new Error('Not authorized, token invalid or expired')
  }
})

// Restricts a route to specific roles, e.g. authorize('recruiter', 'admin').
// Must run after protect(), since it reads req.user.
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403)
      throw new Error(`Role "${req.user.role}" is not permitted to perform this action`)
    }
    next()
  }
}

module.exports = { protect, authorize }
