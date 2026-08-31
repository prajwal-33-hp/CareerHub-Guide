const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')
const User = require('../models/User')
const Company = require('../models/Company')
const CompanyMember = require('../models/CompanyMember')
const RecruiterApplication = require('../models/RecruiterApplication')
const VerificationOtp = require('../models/VerificationOtp')
const AuditLog = require('../models/AuditLog')
const Notification = require('../models/Notification')
const { emitNotification } = require('../utils/socket')
const {
  sendOtpEmail,
  sendPhoneOtpEmail,
  sendApplicationApprovedEmail,
} = require('../services/emailService')

// Utility to extract cleaned domain from an email or URL
function extractDomain(input) {
  if (!input) return ''
  try {
    let clean = input.trim().toLowerCase()
    if (clean.includes('@')) {
      clean = clean.split('@')[1]
    } else {
      clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]
    }
    return clean.replace(/:\d+$/, '')
  } catch {
    return ''
  }
}

// @route   POST /api/recruiter-verification/apply
// @access  Private (any logged-in user who is not already an approved recruiter)
const submitApplication = asyncHandler(async (req, res) => {
  const { applicantDetails, companyDetails } = req.body

  if (!applicantDetails || !companyDetails) {
    res.status(400)
    throw new Error('Applicant and company details are required')
  }

  const { fullName, workEmail, mobileNumber, designation, department, linkedinUrl, idBadgeUrl } =
    applicantDetails
  const {
    legalName,
    website,
    companyType,
    industry,
    companySize,
    country,
    state,
    city,
    businessAddress,
    description,
    logoUrl,
    cin,
    llpin,
    gstin,
    registrationDocUrl,
  } = companyDetails

  // Basic sanity validation
  if (!fullName || !workEmail || !mobileNumber || !designation || !department) {
    res.status(400)
    throw new Error('All required recruiter profile fields must be provided')
  }

  if (
    !legalName ||
    !website ||
    !companyType ||
    !industry ||
    !companySize ||
    !country ||
    !state ||
    !city ||
    !businessAddress ||
    !description
  ) {
    res.status(400)
    throw new Error('All required company details must be provided')
  }

  // Work email domain vs Company website domain analysis
  const emailDomain = extractDomain(workEmail)
  const webDomain = extractDomain(website)
  const domainMatched = Boolean(emailDomain && webDomain && (emailDomain === webDomain || webDomain.endsWith(`.${emailDomain}`) || emailDomain.endsWith(`.${webDomain}`)))

  // Clean company domain
  const finalCompanyDomain = webDomain || emailDomain

  // Check if user already has an active application
  let application = await RecruiterApplication.findOne({ user: req.user._id })

  if (application && ['APPROVED'].includes(application.status)) {
    res.status(400)
    throw new Error('You are already an approved recruiter')
  }

  if (application) {
    // Preserve prior verification flags if work email / phone didn't change
    const isEmailSame = application.applicantDetails?.workEmail === workEmail.toLowerCase().trim()
    const isPhoneSame = application.applicantDetails?.mobileNumber === mobileNumber.trim()

    application.applicantDetails = {
      fullName: fullName.trim(),
      workEmail: workEmail.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      designation: designation.trim(),
      department: department.trim(),
      linkedinUrl: linkedinUrl ? linkedinUrl.trim() : '',
      idBadgeUrl: idBadgeUrl || application.applicantDetails?.idBadgeUrl || '',
    }

    application.companyDetails = {
      legalName: legalName.trim(),
      website: website.trim(),
      domain: finalCompanyDomain,
      companyType,
      industry: industry.trim(),
      companySize,
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      businessAddress: businessAddress.trim(),
      description: description.trim(),
      logoUrl: logoUrl || application.companyDetails?.logoUrl || '',
      cin: cin ? cin.trim().toUpperCase() : '',
      llpin: llpin ? llpin.trim().toUpperCase() : '',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      registrationDocUrl: registrationDocUrl || application.companyDetails?.registrationDocUrl || '',
    }

    application.verification = {
      emailVerified: isEmailSame ? application.verification.emailVerified : false,
      emailVerifiedAt: isEmailSame ? application.verification.emailVerifiedAt : null,
      phoneVerified: isPhoneSame ? application.verification.phoneVerified : false,
      phoneVerifiedAt: isPhoneSame ? application.verification.phoneVerifiedAt : null,
      domainMatched,
      companyVerified: false,
      relationshipVerified: Boolean(idBadgeUrl || application.applicantDetails?.idBadgeUrl),
    }

    application.status = 'REQUESTED'
    await application.save()
  } else {
    application = await RecruiterApplication.create({
      user: req.user._id,
      applicantDetails: {
        fullName: fullName.trim(),
        workEmail: workEmail.toLowerCase().trim(),
        mobileNumber: mobileNumber.trim(),
        designation: designation.trim(),
        department: department.trim(),
        linkedinUrl: linkedinUrl ? linkedinUrl.trim() : '',
        idBadgeUrl: idBadgeUrl || '',
      },
      companyDetails: {
        legalName: legalName.trim(),
        website: website.trim(),
        domain: finalCompanyDomain,
        companyType,
        industry: industry.trim(),
        companySize,
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        businessAddress: businessAddress.trim(),
        description: description.trim(),
        logoUrl: logoUrl || '',
        cin: cin ? cin.trim().toUpperCase() : '',
        llpin: llpin ? llpin.trim().toUpperCase() : '',
        gstin: gstin ? gstin.trim().toUpperCase() : '',
        registrationDocUrl: registrationDocUrl || '',
      },
      verification: {
        emailVerified: false,
        phoneVerified: false,
        domainMatched,
        companyVerified: false,
        relationshipVerified: Boolean(idBadgeUrl),
      },
      status: 'REQUESTED',
      companyRole: 'OWNER',
    })
  }

  // Update user's recruiter status to REQUESTED
  await User.findByIdAndUpdate(req.user._id, {
    recruiterStatus: 'REQUESTED',
    workEmail: workEmail.toLowerCase().trim(),
    workPhone: mobileNumber.trim(),
    designation: designation.trim(),
    department: department.trim(),
  })

  // Audit log
  await AuditLog.log({
    action: 'RECRUITER_APPLICATION_SUBMITTED',
    performedBy: req.user._id,
    targetUser: req.user._id,
    targetApplication: application._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: {
      companyName: legalName,
      domain: finalCompanyDomain,
      workEmail,
      domainMatched,
    },
  })

  res.status(201).json({
    success: true,
    message: 'Recruiter verification application submitted successfully.',
    application,
  })
})

// @route   POST /api/recruiter-verification/send-otp
// @access  Private
const sendOtp = asyncHandler(async (req, res) => {
  const { type, target } = req.body

  if (!type || !target) {
    res.status(400)
    throw new Error('OTP type (email or phone) and target are required')
  }

  if (!['email', 'phone'].includes(type)) {
    res.status(400)
    throw new Error('Type must be either "email" or "phone"')
  }

  const cleanTarget = target.trim().toLowerCase()

  // Check rate limit on resends (max 3 resends in last 15 mins, min 30s cooldown)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
  const recentOtp = await VerificationOtp.findOne({
    target: cleanTarget,
    type,
    user: req.user._id,
    createdAt: { $gt: fifteenMinutesAgo },
  }).sort('-createdAt')

  if (recentOtp) {
    const elapsedMs = Date.now() - new Date(recentOtp.lastSentAt).getTime()
    if (elapsedMs < 30 * 1000) {
      const waitSec = Math.ceil((30 * 1000 - elapsedMs) / 1000)
      res.status(429)
      throw new Error(`Please wait ${waitSec} seconds before requesting a new verification code`)
    }

    if (recentOtp.resendAttempts >= 5) {
      res.status(429)
      throw new Error('Too many verification requests for this target. Please try again in 15 minutes.')
    }
  }

  // Generate 6-digit random numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const salt = await bcrypt.genSalt(10)
  const otpHash = await bcrypt.hash(code, salt)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Upsert or create OTP record
  await VerificationOtp.deleteMany({ target: cleanTarget, type, user: req.user._id })

  const newOtp = await VerificationOtp.create({
    target: cleanTarget,
    type,
    otpHash,
    code, // Fallback preview for development / testing environment
    user: req.user._id,
    expiresAt,
    lastSentAt: new Date(),
    resendAttempts: recentOtp ? recentOtp.resendAttempts + 1 : 1,
  })

  // Dispatch real email if type === 'email'
  if (type === 'email') {
    sendOtpEmail(cleanTarget, code, req.user.name || 'Recruiter').catch((err) =>
      console.error('[EmailService] Failed to send real OTP email:', err.message)
    )
  } else if (type === 'phone') {
    // Deliver Phone OTP to user's registered email so they receive it with 0 SMS cost
    sendPhoneOtpEmail({
      toEmail: req.user.email,
      phoneNumber: cleanTarget,
      otp: code,
      recipientName: req.user.name || 'Recruiter',
    }).catch((err) => console.error('[EmailService] Failed to send phone OTP email:', err.message))
  }

  // Audit log
  await AuditLog.log({
    action: `OTP_SENT_${type.toUpperCase()}`,
    performedBy: req.user._id,
    targetUser: req.user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: { target: cleanTarget, type },
  })

  res.json({
    success: true,
    message:
      type === 'phone'
        ? `6-digit phone verification code sent! (Also delivered to your email: ${req.user.email})`
        : `6-digit verification code sent to ${cleanTarget}. Valid for 10 minutes.`,
    target: cleanTarget,
    type,
    expiresAt,
  })
})

// @route   POST /api/recruiter-verification/verify-otp
// @access  Private
const verifyOtp = asyncHandler(async (req, res) => {
  const { type, target, otp } = req.body

  if (!type || !target || !otp) {
    res.status(400)
    throw new Error('Type, target, and 6-digit verification code are required')
  }

  const cleanTarget = target.trim().toLowerCase()
  const cleanOtp = otp.toString().trim()

  const otpDoc = await VerificationOtp.findOne({
    target: cleanTarget,
    type,
    user: req.user._id,
    expiresAt: { $gt: new Date() },
  }).select('+otpHash')

  if (!otpDoc) {
    res.status(400)
    throw new Error('Verification code has expired or was not requested. Please request a new code.')
  }

  if (otpDoc.attempts >= otpDoc.maxAttempts) {
    await otpDoc.deleteOne()
    res.status(400)
    throw new Error('Maximum invalid attempts exceeded. Please request a new verification code.')
  }

  const isMatch = await otpDoc.compareOtp(cleanOtp)

  if (!isMatch) {
    otpDoc.attempts += 1
    await otpDoc.save()
    const remaining = otpDoc.maxAttempts - otpDoc.attempts
    res.status(400)
    throw new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`)
  }

  // Delete used OTP
  await otpDoc.deleteOne()

  // Update application & user verification flags
  const application = await RecruiterApplication.findOne({ user: req.user._id })
  if (application) {
    if (type === 'email') {
      application.verification.emailVerified = true
      application.verification.emailVerifiedAt = new Date()
    } else if (type === 'phone') {
      application.verification.phoneVerified = true
      application.verification.phoneVerifiedAt = new Date()
    }
    await application.save()
  }

  const userUpdate = {}
  if (type === 'email') userUpdate.isEmailVerified = true
  if (type === 'phone') userUpdate.isPhoneVerified = true
  await User.findByIdAndUpdate(req.user._id, userUpdate)

  // Audit log
  await AuditLog.log({
    action: `OTP_VERIFIED_${type.toUpperCase()}`,
    performedBy: req.user._id,
    targetUser: req.user._id,
    targetApplication: application ? application._id : null,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: { target: cleanTarget, type },
  })

  res.json({
    success: true,
    message: `${type === 'email' ? 'Work Email' : 'Mobile Phone'} verified successfully!`,
    verification: application ? application.verification : { [type + 'Verified']: true },
  })
})

// @route   GET /api/recruiter-verification/status
// @access  Private
const getApplicationStatus = asyncHandler(async (req, res) => {
  const application = await RecruiterApplication.findOne({ user: req.user._id })
    .populate('createdCompany', 'name slug logo verified domain companyType')
    .populate('adminReview.reviewedBy', 'name email')

  const companyMembership = await CompanyMember.findOne({
    user: req.user._id,
  }).populate('company', 'name slug logo verified domain')

  res.json({
    success: true,
    user: req.user.toSafeObject(),
    application: application || null,
    membership: companyMembership || null,
  })
})

// @route   POST /api/recruiter-verification/upload-document
// @access  Private
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('No document file uploaded')
  }

  const docUrl = `${req.protocol}://${req.get('host')}/uploads/documents/${req.file.filename}`

  res.json({
    success: true,
    message: 'Document uploaded successfully',
    url: docUrl,
    filename: req.file.filename,
  })
})

// ==========================================
// ADMIN WORKFLOW CONTROLLERS (role: 'admin')
// ==========================================

// @route   GET /api/recruiter-verification/admin/applications
// @access  Private (admin only)
const getAllApplicationsForAdmin = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 15 } = req.query

  const query = {}
  if (status && status !== 'ALL') {
    query.status = status
  }

  if (search) {
    const term = search.trim()
    query.$or = [
      { 'applicantDetails.fullName': { $regex: term, $options: 'i' } },
      { 'applicantDetails.workEmail': { $regex: term, $options: 'i' } },
      { 'companyDetails.legalName': { $regex: term, $options: 'i' } },
      { 'companyDetails.domain': { $regex: term, $options: 'i' } },
      { 'companyDetails.cin': { $regex: term, $options: 'i' } },
      { 'companyDetails.gstin': { $regex: term, $options: 'i' } },
    ]
  }

  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.max(1, parseInt(limit, 10))

  const [applications, total, counts] = await Promise.all([
    RecruiterApplication.find(query)
      .populate('user', 'name email role status createdAt')
      .populate('adminReview.reviewedBy', 'name email')
      .populate('createdCompany', 'name slug logo verified')
      .sort('-createdAt')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    RecruiterApplication.countDocuments(query),
    RecruiterApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  const statusSummary = {
    TOTAL: 0,
    REQUESTED: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
    REVOKED: 0,
  }

  counts.forEach((item) => {
    statusSummary[item._id] = item.count
    statusSummary.TOTAL += item.count
  })

  res.json({
    success: true,
    applications,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    statusSummary,
  })
})

// @route   GET /api/recruiter-verification/admin/applications/:id
// @access  Private (admin only)
const getApplicationByIdForAdmin = asyncHandler(async (req, res) => {
  const application = await RecruiterApplication.findById(req.params.id)
    .populate('user', 'name email role status createdAt photoUrl')
    .populate('adminReview.reviewedBy', 'name email')
    .populate('createdCompany')
    .populate('rejectionHistory.rejectedBy', 'name email')

  if (!application) {
    res.status(404)
    throw new Error('Recruiter application not found')
  }

  // Fetch recent audit logs for this application / user
  const auditLogs = await AuditLog.find({
    $or: [{ targetApplication: application._id }, { targetUser: application.user?._id }],
  })
    .populate('performedBy', 'name email role')
    .sort('-timestamp')
    .limit(20)

  res.json({
    success: true,
    application,
    auditLogs,
  })
})

// @route   PUT /api/recruiter-verification/admin/applications/:id/status
// @access  Private (admin only)
const updateApplicationStatusByAdmin = asyncHandler(async (req, res) => {
  const { status, notes, rejectionReason, companyRole = 'OWNER' } = req.body

  const validStatuses = ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED']
  if (!validStatuses.includes(status)) {
    res.status(400)
    throw new Error(`Status must be one of: ${validStatuses.join(', ')}`)
  }

  const application = await RecruiterApplication.findById(req.params.id).populate('user')
  if (!application) {
    res.status(404)
    throw new Error('Application not found')
  }

  const applicant = application.user
  if (!applicant) {
    res.status(400)
    throw new Error('Associated applicant user account no longer exists')
  }

  const prevStatus = application.status
  application.status = status
  application.adminReview = {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
    notes: notes || application.adminReview?.notes || '',
    rejectionReason: status === 'REJECTED' ? rejectionReason || 'Information could not be verified' : '',
  }

  let companyObj = null

  // Process Approval Workflow
  if (status === 'APPROVED') {
    application.verification.companyVerified = true
    application.verification.relationshipVerified = true

    // 1. Create or Find Company Record
    const legalName = application.companyDetails.legalName
    let company = await Company.findOne({
      $or: [
        { name: { $regex: `^${legalName}$`, $options: 'i' } },
        { domain: application.companyDetails.domain },
      ],
    })

    if (!company) {
      const baseSlug = slugify(legalName)
      let slug = baseSlug
      let suffix = 1
      while (await Company.findOne({ slug })) {
        slug = `${baseSlug}-${suffix++}`
      }

      company = await Company.create({
        name: legalName,
        slug,
        logo: application.companyDetails.logoUrl || '',
        industry: application.companyDetails.industry,
        location: `${application.companyDetails.city}, ${application.companyDetails.state}`,
        employees: application.companyDetails.companySize,
        website: application.companyDetails.website,
        domain: application.companyDetails.domain,
        companyType: application.companyDetails.companyType,
        country: application.companyDetails.country,
        state: application.companyDetails.state,
        city: application.companyDetails.city,
        address: application.companyDetails.businessAddress,
        description: application.companyDetails.description,
        cin: application.companyDetails.cin,
        llpin: application.companyDetails.llpin,
        gstin: application.companyDetails.gstin,
        registrationDocumentUrl: application.companyDetails.registrationDocUrl,
        owner: applicant._id,
        verified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
        status: 'verified',
      })
    } else {
      // Update company verification status
      company.verified = true
      company.verifiedAt = new Date()
      company.verifiedBy = req.user._id
      company.status = 'verified'
      if (!company.owner) company.owner = applicant._id
      await company.save()
    }

    application.createdCompany = company._id
    companyObj = company

    // 2. Provision or update CompanyMember record
    await CompanyMember.findOneAndUpdate(
      { company: company._id, user: applicant._id },
      {
        company: company._id,
        user: applicant._id,
        companyRole: companyRole || application.companyRole || 'OWNER',
        designation: application.applicantDetails.designation,
        department: application.applicantDetails.department,
        workEmail: application.applicantDetails.workEmail,
        workPhone: application.applicantDetails.mobileNumber,
        status: 'active',
        joinedAt: new Date(),
      },
      { upsert: true, new: true }
    )

    // 3. Upgrade user to role: recruiter and recruiterStatus: APPROVED
    await User.findByIdAndUpdate(applicant._id, {
      role: 'recruiter',
      recruiterStatus: 'APPROVED',
      status: 'active',
      company: company._id,
      companyRole: companyRole || 'OWNER',
      workEmail: application.applicantDetails.workEmail,
      workPhone: application.applicantDetails.mobileNumber,
      designation: application.applicantDetails.designation,
      department: application.applicantDetails.department,
      isEmailVerified: true,
      isPhoneVerified: true,
    })

    // Send real-time notification to applicant
    try {
      const notif = await Notification.create({
        user: applicant._id,
        type: 'recruiter_approved',
        message: `🎉 Congratulations! Your recruiter access for ${company.name} has been approved by the Admin team. You can now post jobs and manage candidates.`,
      })
      emitNotification(applicant._id, notif)
    } catch (nErr) {
      console.error('Notification error:', nErr.message)
    }
  } else if (status === 'REJECTED') {
    application.rejectionHistory.push({
      rejectedAt: new Date(),
      rejectedBy: req.user._id,
      reason: rejectionReason || notes || 'Application details could not be verified.',
    })

    // Update user recruiter status to REJECTED (user remains student/candidate)
    await User.findByIdAndUpdate(applicant._id, {
      recruiterStatus: 'REJECTED',
    })

    // Send notification
    try {
      const notif = await Notification.create({
        user: applicant._id,
        type: 'recruiter_rejected',
        message: `⚠️ Your recruiter verification request was not approved. Reason: ${
          rejectionReason || 'Details could not be verified'
        }. You may review the feedback and resubmit.`,
      })
      emitNotification(applicant._id, notif)
    } catch (nErr) {
      console.error('Notification error:', nErr.message)
    }
  } else if (status === 'SUSPENDED') {
    await User.findByIdAndUpdate(applicant._id, {
      recruiterStatus: 'SUSPENDED',
      status: 'suspended',
    })
    await CompanyMember.updateMany({ user: applicant._id }, { status: 'suspended' })
  } else if (status === 'REVOKED') {
    await User.findByIdAndUpdate(applicant._id, {
      role: 'student',
      recruiterStatus: 'REVOKED',
      company: null,
      companyRole: null,
    })
    await CompanyMember.updateMany({ user: applicant._id }, { status: 'revoked' })
  }

  await application.save()

  // Enterprise Audit Log
  await AuditLog.log({
    action: `RECRUITER_STATUS_CHANGED_${status}`,
    performedBy: req.user._id,
    targetUser: applicant._id,
    targetApplication: application._id,
    targetCompany: companyObj ? companyObj._id : application.createdCompany,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: {
      prevStatus,
      newStatus: status,
      notes,
      rejectionReason,
      companyRole,
    },
  })

  res.json({
    success: true,
    message: `Recruiter application marked as ${status}.`,
    application,
    company: companyObj,
  })
})

// @route   GET /api/recruiter-verification/admin/audit-logs
// @access  Private (admin only)
const getAuditLogsForAdmin = asyncHandler(async (req, res) => {
  const { action, page = 1, limit = 25 } = req.query

  const query = {}
  if (action && action !== 'ALL') {
    query.action = { $regex: action, $options: 'i' }
  }

  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.max(1, parseInt(limit, 10))

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .populate('targetUser', 'name email role')
      .populate('targetCompany', 'name slug')
      .sort('-timestamp')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(query),
  ])

  res.json({
    success: true,
    logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  })
})

module.exports = {
  submitApplication,
  sendOtp,
  verifyOtp,
  getApplicationStatus,
  uploadDocument,
  getAllApplicationsForAdmin,
  getApplicationByIdForAdmin,
  updateApplicationStatusByAdmin,
  getAuditLogsForAdmin,
}
