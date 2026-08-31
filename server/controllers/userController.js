const asyncHandler = require('../utils/asyncHandler')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { emitNotification } = require('../utils/socket')

// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  let user = await User.findById(req.params.id)
  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  // Increment unique profile views if viewed by another user (e.g. recruiter, candidate, or admin)
  if (req.user && String(req.user._id) !== String(user._id)) {
    try {
      const alreadyViewed = await User.findOne({
        _id: user._id,
        'viewedBy.user': req.user._id,
      })

      if (!alreadyViewed) {
        user = await User.findByIdAndUpdate(
          user._id,
          {
            $inc: { profileViews: 1 },
            $push: {
              viewedBy: {
                user: req.user._id,
                viewedAt: new Date(),
              },
            },
          },
          { new: true }
        )

        // Send real-time notification to the profile owner
        try {
          const viewerName = req.user.name || 'A recruiter'
          const viewerRole = req.user.role === 'recruiter' ? 'Recruiter' : 'User'
          const notif = await Notification.create({
            user: user._id,
            type: 'view',
            message: `👀 ${viewerRole} ${viewerName} viewed your profile.`,
          })
          emitNotification(user._id, notif)
        } catch (notifErr) {
          console.error('Notification error on profile view:', notifErr.message)
        }
      }
    } catch (viewErr) {
      console.error('Error tracking profile view:', viewErr.message)
    }
  }

  res.json({ user: user.toSafeObject() })
})

// @route   PUT /api/users/:id
// @access  Private (the user themself, or admin)
const updateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && String(req.user._id) !== req.params.id) {
    res.status(403)
    throw new Error('You can only update your own profile')
  }

  const { role, status, password, ...safeUpdates } = req.body

  // Parse JSON strings from FormData
  if (safeUpdates.skills && typeof safeUpdates.skills === 'string') {
    try {
      safeUpdates.skills = JSON.parse(safeUpdates.skills)
    } catch (e) {
      // If parsing fails, keep as is
    }
  }
  if (safeUpdates.education && typeof safeUpdates.education === 'string') {
    try {
      safeUpdates.education = JSON.parse(safeUpdates.education)
    } catch (e) {
      // If parsing fails, keep as is
    }
  }
  if (safeUpdates.projects && typeof safeUpdates.projects === 'string') {
    try {
      safeUpdates.projects = JSON.parse(safeUpdates.projects)
    } catch (e) {
      // If parsing fails, keep as is
    }
  }

  if (req.file) {
    const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    safeUpdates.photoUrl = photoUrl
  }

  const updates = req.user.role === 'admin' ? req.body : safeUpdates

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({ user: user.toSafeObject() })
})

// @route   GET /api/users (admin only -- powers the Admin > Users page)
// @access  Private (admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role } = req.query
  const query = role ? { role } : {}
  const users = await User.find(query).sort('-createdAt')
  res.json({ users: users.map((u) => u.toSafeObject()) })
})

// @route   PUT /api/users/:id/status (admin only -- suspend/reactivate)
// @access  Private (admin)
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!['active', 'suspended'].includes(status)) {
    res.status(400)
    throw new Error('Status must be "active" or "suspended"')
  }

  const targetUser = await User.findById(req.params.id)
  if (!targetUser) {
    res.status(404)
    throw new Error('User not found')
  }

  if (targetUser.role === 'admin' && status === 'suspended') {
    res.status(400)
    throw new Error('The Master Administrator account cannot be suspended.')
  }

  targetUser.status = status
  await targetUser.save()

  res.json({ user: targetUser.toSafeObject() })
})

module.exports = { getUserById, updateUser, getAllUsers, updateUserStatus }
