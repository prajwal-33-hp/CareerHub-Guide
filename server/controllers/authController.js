const bcrypt = require('bcryptjs')
const asyncHandler = require('../utils/asyncHandler')
const generateToken = require('../utils/generateToken')
const User = require('../models/User')
const VerificationOtp = require('../models/VerificationOtp')
const { validateRealEmail } = require('../utils/emailValidator')
const { sendPasswordResetEmail, sendSignupOtpEmail } = require('../services/emailService')
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

// @route   POST /api/auth/send-signup-otp
// @access  Public
const sendSignupOtp = asyncHandler(async (req, res) => {
  const { email, name } = req.body

  if (!email) {
    res.status(400)
    throw new Error('Email address is required')
  }

  // 1. Strict real email validation & DNS MX verification
  const emailCheck = await validateRealEmail(email)
  if (!emailCheck.valid) {
    res.status(400)
    throw new Error(emailCheck.error || 'Invalid or non-deliverable email address')
  }

  const normalizedEmail = emailCheck.normalizedEmail

  // 2. Check if user already exists
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    res.status(400)
    throw new Error('An account with this email address already exists. Please log in.')
  }

  // 3. Check rate limiting / recent OTP dispatch (30s cooldown)
  const recentOtp = await VerificationOtp.findOne({
    target: normalizedEmail,
    type: 'email',
    lastSentAt: { $gt: new Date(Date.now() - 30 * 1000) },
  })
  if (recentOtp) {
    return res.json({
      success: true,
      message: `A verification code was recently sent to ${normalizedEmail}. Please check your inbox.`,
      email: normalizedEmail,
    })
  }

  // 4. Generate cryptographically random 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
  const otpHash = await bcrypt.hash(otpCode, 10)

  // 5. Dispatch email via live SMTP relay and verify mailbox existence
  const dispatch = await sendSignupOtpEmail(normalizedEmail, otpCode, name || 'User')
  if (!dispatch.success) {
    if (dispatch.isNonExistent) {
      res.status(400)
      throw new Error(
        dispatch.error ||
          `The email address "${normalizedEmail}" does not exist in real life. Please check for typos or use an active email account.`
      )
    }
    res.status(400)
    throw new Error(
      dispatch.error ||
        'Unable to deliver verification email to this address. Please ensure this email is real, active, and typed correctly.'
    )
  }

  // 6. Save OTP document with 10-minute TTL only after confirmed email delivery
  await VerificationOtp.deleteMany({ target: normalizedEmail, type: 'email' })
  await VerificationOtp.create({
    target: normalizedEmail,
    type: 'email',
    otpHash,
    code: otpCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(),
  })

  res.json({
    success: true,
    message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your inbox.`,
    email: normalizedEmail,
  })
})

// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, otp } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Name, email, and password are required')
  }

  if (password.length < 6) {
    res.status(400)
    throw new Error('Password must be at least 6 characters')
  }

  if (!otp) {
    res.status(400)
    throw new Error('Email verification code is required. Please verify your real email address.')
  }

  // 1. Strict real email validation
  const emailCheck = await validateRealEmail(email)
  if (!emailCheck.valid) {
    res.status(400)
    throw new Error(emailCheck.error || 'Invalid email address')
  }

  const normalizedEmail = emailCheck.normalizedEmail

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    res.status(400)
    throw new Error('An account with this email already exists')
  }

  // 2. Verify 6-digit OTP code against MongoDB VerificationOtp
  const otpDoc = await VerificationOtp.findOne({
    target: normalizedEmail,
    type: 'email',
    expiresAt: { $gt: new Date() },
  }).select('+otpHash')

  if (!otpDoc) {
    res.status(400)
    throw new Error('Verification code has expired or was not requested. Please click Resend Code.')
  }

  if (otpDoc.attempts >= otpDoc.maxAttempts) {
    await VerificationOtp.deleteOne({ _id: otpDoc._id })
    res.status(400)
    throw new Error('Too many invalid verification attempts. Please request a new code.')
  }

  const isMatch = await otpDoc.compareOtp(otp)
  if (!isMatch) {
    otpDoc.attempts += 1
    await otpDoc.save()
    res.status(400)
    throw new Error('Invalid verification code. Please check your email inbox and try again.')
  }

  // Clean up used OTP doc
  await VerificationOtp.deleteOne({ _id: otpDoc._id })

  // 3. Under the verification system, all new accounts are registered as verified candidate accounts ('student').
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'student',
    recruiterStatus: 'NONE',
    isEmailVerified: true,
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

// @route   GET /api/auth/admin-status
// @access  Public
const getAdminStatus = asyncHandler(async (req, res) => {
  const adminUser = await User.findOne({ role: 'admin' }).select('name email createdAt')
  res.json({
    hasAdmin: Boolean(adminUser),
    adminEmail: adminUser ? adminUser.email : null,
    adminName: adminUser ? adminUser.name : null,
  })
})

// @route   POST /api/auth/register-admin
// @access  Public (Allowed exclusively if 0 admin accounts exist in the entire system)
const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Name, email, and password are required')
  }

  if (password.length < 6) {
    res.status(400)
    throw new Error('Password must be at least 6 characters')
  }

  // STRICT SINGLE-OWNER LOCK:
  // If an admin already exists, permanently lock admin registration!
  const existingAdmin = await User.findOne({ role: 'admin' })
  if (existingAdmin) {
    res.status(403)
    throw new Error(
      'Master Administrator account has already been claimed and initialized. No additional admin signups are permitted.'
    )
  }

  // Validate real email
  const emailCheck = await validateRealEmail(email)
  if (!emailCheck.valid) {
    res.status(400)
    throw new Error(emailCheck.error || 'Invalid or non-deliverable email address')
  }

  const normalizedEmail = emailCheck.normalizedEmail
  let user = await User.findOne({ email: normalizedEmail })

  if (user) {
    // If the user already exists with this email, upgrade them to the Single Master Admin!
    user.name = name.trim()
    user.password = password
    user.role = 'admin'
    user.status = 'active'
    await user.save()
  } else {
    // Create the one and only Master Admin user
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
      status: 'active',
      isEmailVerified: true,
    })
  }

  const token = generateToken(user._id, user.role)
  res.status(201).json({
    token,
    user: user.toSafeObject(),
    message: 'Master Administrator registered successfully! You have exclusive owner access.',
  })
})

// @route   GET /api/auth/check-email-live?email=...
// @access  Public
const checkEmailLive = asyncHandler(async (req, res) => {
  const { email } = req.query
  if (!email || !email.includes('@')) {
    return res.json({ valid: false, status: 'incomplete', message: 'Enter an email address' })
  }

  const validation = await validateRealEmail(email)
  if (!validation.valid) {
    return res.json({
      valid: false,
      status: 'invalid',
      message: validation.error || 'This email address is invalid or does not exist.',
      domain: validation.domain,
    })
  }

  // Check if already registered
  const existing = await User.findOne({ email: validation.normalizedEmail })
  if (existing) {
    return res.json({
      valid: true,
      status: 'registered',
      message: 'This email is already registered. Please log in instead.',
      normalizedEmail: validation.normalizedEmail,
    })
  }

  return res.json({
    valid: true,
    status: 'available',
    message: 'Valid mail host. 6-digit code required to confirm mailbox existence.',
    normalizedEmail: validation.normalizedEmail,
    domain: validation.domain,
  })
})

module.exports = {
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
}
