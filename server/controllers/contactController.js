const asyncHandler = require('../utils/asyncHandler')
const ContactMessage = require('../models/ContactMessage')
const Notification = require('../models/Notification')
const User = require('../models/User')
const Company = require('../models/Company')

// @route   POST /api/contact
// @access  Public / Authenticated
const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message, recipientType, recipientCompany, recipientUser } = req.body

  if (!name || !email || !message) {
    res.status(400)
    throw new Error('Please provide name, email, and message.')
  }

  const senderId = req.user ? req.user._id : undefined

  const contactMessage = await ContactMessage.create({
    sender: senderId,
    name,
    email,
    subject: subject || 'Student / Applicant Inquiry',
    message,
    recipientType: recipientType || 'all_recruiters',
    recipientCompany: recipientCompany || undefined,
    recipientUser: recipientUser || undefined,
  })

  // Notify targeted recruiters or all recruiters
  try {
    const notifyUserIds = new Set()

    if (recipientUser) {
      notifyUserIds.add(recipientUser.toString())
    } else if (recipientCompany) {
      const company = await Company.findById(recipientCompany)
      if (company && company.owner) {
        notifyUserIds.add(company.owner.toString())
      }
      // Also notify any recruiters associated with this company
      const companyRecruiters = await User.find({ company: recipientCompany, role: 'recruiter' })
      companyRecruiters.forEach((recruiter) => notifyUserIds.add(recruiter._id.toString()))
    } else {
      // General or all recruiters: notify all active recruiters
      const recruiters = await User.find({ role: 'recruiter', status: 'active' }).select('_id')
      recruiters.forEach((recruiter) => notifyUserIds.add(recruiter._id.toString()))
    }

    const notificationSnippet = message.length > 80 ? `${message.slice(0, 80)}…` : message
    const notificationPromises = Array.from(notifyUserIds).map((userId) =>
      Notification.create({
        user: userId,
        type: 'message',
        message: `New message from ${name} (${email}): "${subject ? subject + ' - ' : ''}${notificationSnippet}"`,
      })
    )

    await Promise.all(notificationPromises)
  } catch (err) {
    console.error('Error dispatching contact notifications:', err)
  }

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully to the recruiter team.',
    contactMessage,
  })
})

// @route   GET /api/contact/recruiter
// @access  Private (Recruiter / Admin)
const getRecruiterMessages = asyncHandler(async (req, res) => {
  const user = req.user

  let query = {}

  if (user.role === 'admin') {
    // Admin sees all messages
    query = {}
  } else {
    // Recruiter sees:
    // 1) Messages directly to their user ID
    // 2) Messages to their company
    // 3) General / all_recruiters inquiries
    const company = await Company.findOne({ owner: user._id })
    const companyId = company ? company._id : user.company

    const conditions = [
      { recipientUser: user._id },
      { recipientType: 'all_recruiters' },
      { recipientType: 'general' },
    ]

    if (companyId) {
      conditions.push({ recipientCompany: companyId })
    }

    query = { $or: conditions }
  }

  const messages = await ContactMessage.find(query)
    .populate('recipientCompany', 'name slug')
    .populate('sender', 'name email role photoUrl')
    .sort('-createdAt')

  res.json({ success: true, messages })
})

// @route   PUT /api/contact/:id/read
// @access  Private (Recruiter / Admin)
const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id)
  if (!message) {
    res.status(404)
    throw new Error('Message not found')
  }

  if (!message.readBy.some((id) => id.toString() === req.user._id.toString())) {
    message.readBy.push(req.user._id)
    await message.save()
  }

  res.json({ success: true, message })
})

module.exports = {
  sendContactMessage,
  getRecruiterMessages,
  markMessageAsRead,
}
