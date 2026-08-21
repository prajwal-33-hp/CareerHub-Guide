const express = require('express')
const { getUserById, updateUser, getAllUsers, updateUserStatus } = require('../controllers/userController')
const { protect, authorize } = require('../middleware/auth')
const upload = require('../middleware/upload')

const router = express.Router()

router.get('/', protect, authorize('admin'), getAllUsers)
router.get('/:id', protect, getUserById)
router.put('/:id', protect, upload.single('photo'), updateUser)
router.put('/:id/status', protect, authorize('admin'), updateUserStatus)

module.exports = router
