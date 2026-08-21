const express = require('express')
const { getMyBookmarks } = require('../controllers/bookmarkController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/', protect, authorize('student'), getMyBookmarks)

module.exports = router
