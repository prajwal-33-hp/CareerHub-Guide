const express = require('express')
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require('../controllers/notificationController')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.get('/', protect, getMyNotifications)
router.put('/read-all', protect, markAllAsRead)
router.put('/:id/read', protect, markAsRead)
router.delete('/clear-all', protect, deleteAllNotifications)
router.delete('/:id', protect, deleteNotification)
router.delete('/', protect, deleteAllNotifications)

module.exports = router
