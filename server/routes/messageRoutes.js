const express = require('express')
const {
  getConversations,
  findOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
} = require('../controllers/messageController')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.use(protect)

router.get('/conversations', getConversations)
router.post('/conversations/find-or-create', findOrCreateConversation)
router.get('/conversation/:conversationId', getMessages)
router.post('/', sendMessage)
router.put('/conversation/:conversationId/read', markConversationAsRead)

module.exports = router
