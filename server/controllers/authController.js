const asyncHandler = require('../utils/asyncHandler')
const generateToken = require('../utils/generateToken')
const User = require('../models/User')
const { sendPasswordResetEmail } = require('../services/emailService')
const {
  getGoogleAuthUrl,
  verifySignedState,
  exchangeCodeForTokens,
  getGoogleUserInfo,
} = require('../config/googleOAuth')

// @route   GET /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const role = req.query.role || 'student'

  // Detect origin from query, headers, or environment variable
  let detectedClient = req.query.clientUrl || req.headers.origin
  if (!detectedClient && req.headers.referer) {
    try {
      detectedClient = new URL(req.headers.referer).origin
    } catch {
      // keep fallback
    }
  }
  const clientUrl =
    detectedClient ||
    process.env.CLIENT_URL ||
    'https://careerhub-guide-2.onrender.com'

  try {
    const authUrl = getGoogleAuthUrl(role, clientUrl)
    res.redirect(authUrl)
  } catch (err) {
    return res.redirect(
      `${clientUrl}/auth/callback?error=${encodeURIComponent(
        err.message || 'Google OAuth is not properly configured on the server.'
      )}`
    )
  }
})

// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = asyncHandler(async (req, res) => {
  const { code, state, error, error_description } = req.query

  // Verify CSRF state first to recover target client URL if present
  const stateData = verifySignedState(state)
  const clientUrl =
    stateData?.clientUrl ||
    process.env.CLIENT_URL ||
    'https://careerhub-guide-2.onrender.com'

  // User cancelled or Google reported an error
  if (error) {
    const message =
      error_description ||
      (error === 'access_denied'
        ? 'Sign in with Google was cancelled.'
        : `Google authentication failed: ${error}`)
    return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(message)}`)
  }

  if (!code) {
    return res.redirect(
      `${clientUrl}/auth/callback?error=${encodeURIComponent(
        'No authorization code received from Google.'
      )}`
    )
  }

  if (!stateData) {
    return res.redirect(
      `${clientUrl}/auth/callback?error=${encodeURIComponent(
        'Invalid or expired authentication session. Please try again.'
      )}`
    )
  }

  try {
    // 1. Exchange authorization code for Google tokens
    const tokens = await exchangeCodeForTokens(code)

    // 2. Fetch Google user profile
    const googleProfile = await getGoogleUserInfo(tokens.access_token)

    // 3. Search for existing user by googleId or email in MongoDB
    let user = await User.findOne({
      $or: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
    })

    if (user) {
      // Check if suspended
      if (user.status === 'suspended') {
        return res.redirect(
          `${clientUrl}/auth/callback?error=${encodeURIComponent(
            'This account has been suspended. Please contact support.'
          )}`
        )
      }

      // Link googleId or fill avatar if missing
      let needsSave = false
      if (!user.googleId) {
        user.googleId = googleProfile.googleId
        needsSave = true
      }
      if (!user.photoUrl && googleProfile.picture) {
        user.photoUrl = googleProfile.picture
        needsSave = true
      }
      if (needsSave) {
        await user.save()
      }
    } else {
      // All new Google signups are created as standard candidate users.
      // Recruiter access requires formal application and admin verification.
      user = await User.create({
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        authProvider: 'google',
        role: 'student',
        recruiterStatus: 'NONE',
        photoUrl: googleProfile.picture || '',
      })
    }

    // 4. Generate standard application JWT
    const token = generateToken(user._id, user.role)

    // 5. Redirect back to frontend OAuth callback handler
    return res.redirect(
      `${clientUrl}/auth/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(
        user.role
      )}`
    )
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return res.redirect(
      `${clientUrl}/auth/callback?error=${encodeURIComponent(
        err.message || 'Google authentication failed.'
      )}`
    )
  }
})

// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Name, email, and password are required')
  }

  const existing = await User.findOne({ email })
  if (existing) {
    res.status(400)
    throw new Error('An account with this email already exists')
  }

  // Under the verification system, all new accounts are registered as standard
  // candidate accounts ('student'). Users who wish to recruit must submit an
  // application and be approved by the admin team.
  const user = await User.create({
    name,
    email,
    password,
    role: 'student',
    recruiterStatus: 'NONE',
  })

  res.status(201).json({
    token: generateToken(user._id, user.role),
    user: user.toSafeObject(),
  })
})

// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password) {
    res.status(400)
    throw new Error('Email and password are required')
  }

  // password has `select: false` on the schema, so it must be explicitly requested
  const user = await User.findOne({ email }).select('+password')

  if (!user || !(await user.comparePassword(password))) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  if (user.status === 'suspended') {
    res.status(403)
    throw new Error('This account has been suspended')
  }

  // Check role match and verification status
  if (role === 'recruiter' && user.role !== 'recruiter' && user.role !== 'admin') {
    if (user.recruiterStatus === 'REQUESTED' || user.recruiterStatus === 'UNDER_REVIEW') {
      res.status(403)
      throw new Error(
        'Your recruiter application is currently under review by our admin team. Please check back soon.'
      )
    } else if (user.recruiterStatus === 'REJECTED') {
      res.status(403)
      throw new Error(
        'Your recruiter application was not approved. Please log in as candidate to view details and reapply.'
      )
    } else {
      res.status(403)
      throw new Error(
        'You do not have approved recruiter access. Please log in as candidate and request recruiter onboarding.'
      )
    }
  } else if (role && user.role !== role && user.role !== 'admin') {
    res.status(403)
    throw new Error(`Please log in with the ${user.role} option.`)
  }

  res.json({
    token: generateToken(user._id, user.role),
    user: user.toSafeObject(),
  })
})

// @route   GET /api/auth/me
// @access  Private
// Used on app load / page refresh to verify the stored token is still valid
// and re-hydrate the logged-in user without asking them to log in again.
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() })
})

// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) {
    res.status(400)
    throw new Error('Please provide an email address')
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) {
    res.status(404)
    throw new Error('No account found with this email address. Please check your spelling or sign up for a new account.')
  }

  // Generate a 6-digit verification code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
  user.resetPasswordToken = resetCode
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  await user.save()

  // Dispatch real email via SMTP non-blockingly in background
  sendPasswordResetEmail(user.email, resetCode, user.name || 'User').catch((err) =>
    console.error('[EmailService] Failed to send password reset email:', err.message)
  )

  // Respond immediately so user sees step 2 in <50ms with zero lag
  res.json({
    success: true,
    message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox.`,
    email: user.email,
  })
})

// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetCode, newPassword } = req.body
  if (!email || !resetCode || !newPassword) {
    res.status(400)
    throw new Error('Email, verification code, and new password are required')
  }

  if (newPassword.length < 6) {
    res.status(400)
    throw new Error('New password must be at least 6 characters')
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: resetCode.trim(),
    resetPasswordExpire: { $gt: new Date() },
  })

  if (!user) {
    res.status(400)
    throw new Error('Invalid or expired verification reset code. Please request a new one.')
  }

  user.password = newPassword
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  res.json({
    success: true,
    message: 'Password successfully reset! You can now log in with your new password.',
  })
})

// @route   PUT /api/auth/update-account
// @access  Private
const updateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const { name, email, currentPassword, newPassword } = req.body

  if (name && name.trim()) {
    user.name = name.trim()
  }

  // If updating email
  if (email && email.toLowerCase().trim() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing && String(existing._id) !== String(user._id)) {
      res.status(400)
      throw new Error('An account with this email address already exists.')
    }
    user.email = email.toLowerCase().trim()
  }

  // If updating password
  if (newPassword) {
    if (newPassword.length < 6) {
      res.status(400)
      throw new Error('New password must be at least 6 characters')
    }

    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword)
      if (!isMatch) {
        res.status(400)
        throw new Error('Current password does not match.')
      }
    }
    user.password = newPassword
  }

  await user.save()

  const token = generateToken(user._id, user.role)
  res.json({
    success: true,
    message: 'Account credentials updated successfully!',
    token,
    user: user.toSafeObject(),
  })
})

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  updateAccount,
  googleAuth,
  googleCallback,
}
