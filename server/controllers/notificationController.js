const asyncHandler = require('../utils/asyncHandler')
const Notification = require('../models/Notification')

// @route   GET /api/notifications
// @access  Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt')
  res.json({ notifications })
})

// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id })
  if (!notification) {
    res.status(404)
    throw new Error('Notification not found')
  }
  notification.read = true
  await notification.save()
  res.json({ notification })
})

// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } })
  res.json({ success: true, message: 'All notifications marked as read' })
})

// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  })
  if (!notification) {
    res.status(404)
    throw new Error('Notification not found')
  }
  res.json({ success: true, message: 'Notification deleted successfully' })
})

// @route   DELETE /api/notifications
// @access  Private
const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id })
  res.json({ success: true, message: 'All notifications deleted successfully' })
})

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
}
