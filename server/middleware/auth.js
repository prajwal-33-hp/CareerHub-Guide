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

// Strict middleware: ensures the user is an APPROVED recruiter (or system admin).
// Prevents unverified, pending, rejected, or suspended accounts from performing recruiter actions.
const requireApprovedRecruiter = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(401)
    throw new Error('Not authorized')
  }

  // System admin bypasses recruiter status checks
  if (req.user.role === 'admin') {
    return next()
  }

  if (req.user.role !== 'recruiter' || req.user.recruiterStatus !== 'APPROVED') {
    res.status(403)
    const statusMsg = req.user.recruiterStatus
      ? `Current verification status: ${req.user.recruiterStatus}`
      : 'Recruiter access has not been requested'
    throw new Error(
      `Recruiter access requires an approved verification application. ${statusMsg}`
    )
  }

  if (req.user.status !== 'active') {
    res.status(403)
    throw new Error('This recruiter account is not active')
  }

  next()
})

// Ensures the recruiter holds one of the specified company roles in CompanyMember
function requireCompanyRole(...allowedCompanyRoles) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401)
      throw new Error('Not authorized')
    }

    if (req.user.role === 'admin') {
      return next()
    }

    const CompanyMember = require('../models/CompanyMember')
    const membership = await CompanyMember.findOne({
      user: req.user._id,
      status: 'active',
    })

    if (!membership) {
      res.status(403)
      throw new Error('You are not registered as an active member of any verified company')
    }

    if (
      allowedCompanyRoles.length > 0 &&
      !allowedCompanyRoles.includes(membership.companyRole)
    ) {
      res.status(403)
      throw new Error(
        `Action requires company role: ${allowedCompanyRoles.join(', ')}. Your role is ${
          membership.companyRole
        }`
      )
    }

    req.companyMember = membership
    next()
  })
}

module.exports = { protect, authorize, requireApprovedRecruiter, requireCompanyRole }

