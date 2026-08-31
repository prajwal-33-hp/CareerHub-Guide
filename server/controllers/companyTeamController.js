const asyncHandler = require('../utils/asyncHandler')
const User = require('../models/User')
const Company = require('../models/Company')
const CompanyMember = require('../models/CompanyMember')
const CompanyInvite = require('../models/CompanyInvite')
const AuditLog = require('../models/AuditLog')
const Notification = require('../models/Notification')
const { emitNotification } = require('../utils/socket')
const { sendInviteEmail } = require('../services/emailService')

// @route   GET /api/companies/team/members
// @access  Private (approved recruiter of the company)
const getTeamMembers = asyncHandler(async (req, res) => {
  // Find recruiter's company membership
  const membership = await CompanyMember.findOne({
    user: req.user._id,
    status: 'active',
  })

  if (!membership && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('You are not associated with any active company')
  }

  const companyId = req.user.role === 'admin' && req.query.companyId ? req.query.companyId : membership?.company

  const [members, invites] = await Promise.all([
    CompanyMember.find({ company: companyId })
      .populate('user', 'name email photoUrl role recruiterStatus status')
      .populate('invitedBy', 'name email')
      .sort('-joinedAt'),
    CompanyInvite.find({ company: companyId, status: 'PENDING' })
      .populate('invitedBy', 'name email')
      .sort('-createdAt'),
  ])

  res.json({
    success: true,
    members,
    pendingInvites: invites,
    currentUserRole: membership ? membership.companyRole : 'ADMIN',
  })
})

// @route   POST /api/companies/team/invite
// @access  Private (approved recruiter with OWNER or ADMIN role)
const inviteMember = asyncHandler(async (req, res) => {
  const { recipientEmail, recipientName, companyRole = 'RECRUITER', designation, department } = req.body

  if (!recipientEmail) {
    res.status(400)
    throw new Error('Recipient email is required')
  }

  const cleanEmail = recipientEmail.toLowerCase().trim()

  const membership = await CompanyMember.findOne({
    user: req.user._id,
    status: 'active',
  })

  if (!membership && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('You are not an active member of any verified company')
  }

  if (membership && !['OWNER', 'ADMIN'].includes(membership.companyRole) && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('Only Company Owners or Admins can invite new recruiters')
  }

  const companyId = membership ? membership.company : req.body.companyId
  const company = await Company.findById(companyId)
  if (!company) {
    res.status(404)
    throw new Error('Company not found')
  }

  // Check if user is already an active member of this company
  const existingUser = await User.findOne({ email: cleanEmail })
  if (existingUser) {
    const isMember = await CompanyMember.findOne({ company: companyId, user: existingUser._id, status: 'active' })
    if (isMember) {
      res.status(400)
      throw new Error('User is already an active member of this company')
    }
  }

  // Check if there is an active pending invite for this email
  const existingInvite = await CompanyInvite.findOne({
    company: companyId,
    recipientEmail: cleanEmail,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  })

  if (existingInvite) {
    res.status(400)
    throw new Error('A pending invitation has already been sent to this email address')
  }

  const token = CompanyInvite.generateInviteToken()
  const invite = await CompanyInvite.create({
    company: companyId,
    invitedBy: req.user._id,
    recipientEmail: cleanEmail,
    recipientName: recipientName ? recipientName.trim() : '',
    companyRole,
    designation: designation ? designation.trim() : 'Recruiter',
    department: department ? department.trim() : 'Talent Acquisition',
    token,
  })

  // If the user already has an account, send them an in-app notification
  if (existingUser) {
    try {
      const notif = await Notification.create({
        user: existingUser._id,
        type: 'company_invite',
        message: `📩 You have been invited to join ${company.name} as ${companyRole} by ${req.user.name}.`,
      })
      emitNotification(existingUser._id, notif)
    } catch (e) {
      console.error('Notification error:', e.message)
    }
  }

  // Enterprise Audit Log
  await AuditLog.log({
    action: 'RECRUITER_INVITED_TO_COMPANY',
    performedBy: req.user._id,
    targetCompany: companyId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: {
      recipientEmail: cleanEmail,
      companyRole,
      companyName: company.name,
      token,
    },
  })

  const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5174'}/invite/accept?token=${token}`

  // Dispatch real invitation email
  sendInviteEmail({
    toEmail: cleanEmail,
    recipientName: recipientName || 'Recruiter',
    companyName: company.name,
    inviterName: req.user.name,
    companyRole,
    inviteUrl,
  }).catch((err) => console.error('[EmailService] Failed to send invite email:', err.message))

  res.status(201).json({
    success: true,
    message: `Invitation generated and sent to ${cleanEmail}.`,
    invite,
    inviteUrl,
  })
})

// @route   DELETE /api/companies/team/invites/:inviteId
// @access  Private (OWNER or ADMIN)
const cancelInvite = asyncHandler(async (req, res) => {
  const invite = await CompanyInvite.findById(req.params.inviteId)
  if (!invite) {
    res.status(404)
    throw new Error('Invite not found')
  }

  invite.status = 'CANCELLED'
  await invite.save()

  res.json({ success: true, message: 'Invitation cancelled successfully' })
})

// @route   PUT /api/companies/team/members/:memberId/role
// @access  Private (OWNER or ADMIN)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { companyRole } = req.body
  if (!['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER'].includes(companyRole)) {
    res.status(400)
    throw new Error('Invalid company role')
  }

  const member = await CompanyMember.findById(req.params.memberId)
  if (!member) {
    res.status(404)
    throw new Error('Team member not found')
  }

  member.companyRole = companyRole
  await member.save()

  // Update user model as well
  await User.findByIdAndUpdate(member.user, { companyRole })

  res.json({ success: true, message: 'Role updated successfully', member })
})

// @route   DELETE /api/companies/team/members/:memberId
// @access  Private (OWNER or ADMIN)
const removeMember = asyncHandler(async (req, res) => {
  const member = await CompanyMember.findById(req.params.memberId)
  if (!member) {
    res.status(404)
    throw new Error('Team member not found')
  }

  if (member.companyRole === 'OWNER') {
    const ownerCount = await CompanyMember.countDocuments({ company: member.company, companyRole: 'OWNER', status: 'active' })
    if (ownerCount <= 1) {
      res.status(400)
      throw new Error('Cannot remove the primary/only owner of the company')
    }
  }

  member.status = 'revoked'
  await member.save()

  // Reset user's recruiter role & company link
  await User.findByIdAndUpdate(member.user, {
    role: 'student',
    recruiterStatus: 'REVOKED',
    company: null,
    companyRole: null,
  })

  res.json({ success: true, message: 'Member removed from company' })
})

// @route   GET /api/companies/team/invites/validate/:token
// @access  Public
const validateInviteToken = asyncHandler(async (req, res) => {
  const { token } = req.params

  const invite = await CompanyInvite.findOne({
    token,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  })
    .populate('company', 'name slug logo location website verified industry domain')
    .populate('invitedBy', 'name email')

  if (!invite) {
    res.status(400)
    throw new Error('This invitation link is invalid or has expired. Please ask the company administrator for a new invite.')
  }

  res.json({
    success: true,
    invite: {
      _id: invite._id,
      company: invite.company,
      invitedBy: invite.invitedBy,
      recipientEmail: invite.recipientEmail,
      recipientName: invite.recipientName,
      companyRole: invite.companyRole,
      designation: invite.designation,
      department: invite.department,
      expiresAt: invite.expiresAt,
    },
  })
})

// @route   POST /api/companies/team/invites/accept
// @access  Private (authenticated user matching email or accepting invite)
const acceptInvite = asyncHandler(async (req, res) => {
  const { token, designation, department, mobileNumber } = req.body

  if (!token) {
    res.status(400)
    throw new Error('Invitation token is required')
  }

  const invite = await CompanyInvite.findOne({
    token,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  }).populate('company')

  if (!invite) {
    res.status(400)
    throw new Error('Invalid or expired invitation token')
  }

  const user = req.user

  // Ensure user's email matches recipientEmail
  if (user.email.toLowerCase().trim() !== invite.recipientEmail.toLowerCase().trim()) {
    res.status(400)
    throw new Error(`This invitation was issued for ${invite.recipientEmail}. You are logged in as ${user.email}.`)
  }

  // Check if company is verified
  if (!invite.company || !invite.company.verified) {
    res.status(400)
    throw new Error('The company associated with this invitation is not currently verified')
  }

  // 1. Create or activate CompanyMember
  const member = await CompanyMember.findOneAndUpdate(
    { company: invite.company._id, user: user._id },
    {
      company: invite.company._id,
      user: user._id,
      companyRole: invite.companyRole,
      designation: designation || invite.designation || 'Recruiter',
      department: department || invite.department || 'Talent Acquisition',
      workEmail: user.email,
      workPhone: mobileNumber || user.workPhone || '',
      status: 'active',
      invitedBy: invite.invitedBy,
      joinedAt: new Date(),
    },
    { upsert: true, new: true }
  )

  // 2. Upgrade user to role: recruiter and recruiterStatus: APPROVED
  await User.findByIdAndUpdate(user._id, {
    role: 'recruiter',
    recruiterStatus: 'APPROVED',
    status: 'active',
    company: invite.company._id,
    companyRole: invite.companyRole,
    workEmail: user.email,
    workPhone: mobileNumber || user.workPhone || '',
    designation: designation || invite.designation,
    department: department || invite.department,
    isEmailVerified: true,
    isPhoneVerified: Boolean(mobileNumber || user.isPhoneVerified),
  })

  // 3. Mark invite as ACCEPTED
  invite.status = 'ACCEPTED'
  invite.acceptedBy = user._id
  invite.acceptedAt = new Date()
  await invite.save()

  // Audit Log
  await AuditLog.log({
    action: 'RECRUITER_INVITE_ACCEPTED',
    performedBy: user._id,
    targetUser: user._id,
    targetCompany: invite.company._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    details: {
      companyName: invite.company.name,
      companyRole: invite.companyRole,
    },
  })

  res.json({
    success: true,
    message: `You have successfully joined ${invite.company.name} as ${invite.companyRole}!`,
    company: invite.company,
    membership: member,
  })
})

module.exports = {
  getTeamMembers,
  inviteMember,
  cancelInvite,
  updateMemberRole,
  removeMember,
  validateInviteToken,
  acceptInvite,
}
