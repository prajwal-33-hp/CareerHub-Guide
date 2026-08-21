const asyncHandler = require('../utils/asyncHandler')
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { emitMessage, emitNotification } = require('../utils/socket')

// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id

  const conversations = await Conversation.find({
    participants: currentUserId,
  })
    .populate('participants', 'name email role photoUrl skills')
    .populate({
      path: 'job',
      select: 'title company location jobType',
      populate: { path: 'company', select: 'name logo' },
    })
    .populate('lastMessageSender', 'name')
    .sort('-lastMessageAt')

  // Deduplicate conversations so each participant only appears once in the message list
  const formatted = []
  const seenOtherUserIds = new Set()

  for (const conv of conversations) {
    const obj = conv.toObject()
    const otherParticipant = (conv.participants || []).find(
      (p) => String(p._id) !== String(currentUserId)
    )
    if (!otherParticipant) continue

    const otherId = String(otherParticipant._id)
    if (seenOtherUserIds.has(otherId)) {
      continue
    }
    seenOtherUserIds.add(otherId)

    const unread = (conv.unreadCount && conv.unreadCount.get(String(currentUserId))) || 0

    formatted.push({
      ...obj,
      otherParticipant,
      unread,
    })
  }

  res.json({ success: true, conversations: formatted })
})

// @route   POST /api/messages/conversations/find-or-create
// @access  Private
const findOrCreateConversation = asyncHandler(async (req, res) => {
  const { recipientId, jobId } = req.body
  const currentUserId = req.user._id

  if (!recipientId) {
    res.status(400)
    throw new Error('Recipient ID is required')
  }

  if (String(recipientId) === String(currentUserId)) {
    res.status(400)
    throw new Error('Cannot start a conversation with yourself')
  }

  const recipient = await User.findById(recipientId).select('name email role photoUrl')
  if (!recipient) {
    res.status(404)
    throw new Error('Recipient user not found')
  }

  // Always reuse any existing conversation between these two users
  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, recipientId] },
  })
    .populate('participants', 'name email role photoUrl skills')
    .populate({
      path: 'job',
      select: 'title company location jobType',
      populate: { path: 'company', select: 'name logo' },
    })
    .sort('-lastMessageAt')

  if (conversation && jobId && !conversation.job) {
    conversation.job = jobId
    await conversation.save()
  }

  if (!conversation) {
    const newConv = await Conversation.create({
      participants: [currentUserId, recipientId],
      job: jobId || null,
      lastMessageText: '',
      unreadCount: new Map([
        [String(currentUserId), 0],
        [String(recipientId), 0],
      ]),
    })

    conversation = await Conversation.findById(newConv._id)
      .populate('participants', 'name email role photoUrl skills')
      .populate({
        path: 'job',
        select: 'title company location jobType',
        populate: { path: 'company', select: 'name logo' },
      })
  }

  const otherParticipant = (conversation.participants || []).find(
    (p) => String(p._id) !== String(currentUserId)
  )

  res.json({
    success: true,
    conversation: {
      ...conversation.toObject(),
      otherParticipant,
      unread: (conversation.unreadCount && conversation.unreadCount.get(String(currentUserId))) || 0,
    },
  })
})

// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params
  const currentUserId = req.user._id

  const conversation = await Conversation.findById(conversationId)
  if (!conversation) {
    res.status(404)
    throw new Error('Conversation not found')
  }

  const isParticipant = conversation.participants.some(
    (p) => String(p) === String(currentUserId)
  )
  if (!isParticipant && req.user.role !== 'admin') {
    res.status(403)
    throw new Error('You do not have access to this conversation')
  }

  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'name photoUrl role')
    .sort('createdAt')

  // Mark all unread messages sent to current user as read
  await Message.updateMany(
    {
      conversation: conversationId,
      recipient: currentUserId,
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    }
  )

  // Reset unread count for current user
  if (conversation.unreadCount) {
    conversation.unreadCount.set(String(currentUserId), 0)
    await conversation.save()
  }

  res.json({ success: true, messages })
})

// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { recipientId, conversationId, text, jobId } = req.body
  const currentUserId = req.user._id

  if (!text || !text.trim()) {
    res.status(400)
    throw new Error('Message text cannot be empty')
  }

  let conversation

  if (conversationId) {
    conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      res.status(404)
      throw new Error('Conversation not found')
    }
  } else if (recipientId) {
    conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId] },
    }).sort('-lastMessageAt')

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, recipientId],
        job: jobId || null,
      })
    }
  } else {
    res.status(400)
    throw new Error('Recipient ID or Conversation ID is required')
  }

  const targetRecipientId = conversation.participants.find(
    (p) => String(p) !== String(currentUserId)
  )

  const message = await Message.create({
    conversation: conversation._id,
    sender: currentUserId,
    recipient: targetRecipientId,
    text: text.trim(),
  })

  // Update conversation last message state
  const currentUnread =
    (conversation.unreadCount && conversation.unreadCount.get(String(targetRecipientId))) || 0
  if (!conversation.unreadCount) {
    conversation.unreadCount = new Map()
  }
  conversation.unreadCount.set(String(targetRecipientId), currentUnread + 1)
  conversation.unreadCount.set(String(currentUserId), 0)
  conversation.lastMessage = message._id
  conversation.lastMessageText = text.trim()
  conversation.lastMessageSender = currentUserId
  conversation.lastMessageAt = new Date()
  await conversation.save()

  const populatedMessage = await Message.findById(message._id).populate(
    'sender',
    'name photoUrl role'
  )

  // Real-time Push via Socket.io
  emitMessage(targetRecipientId, populatedMessage)

  // Create notification for recipient
  try {
    const notif = await Notification.create({
      user: targetRecipientId,
      type: 'message',
      message: `${req.user.name}: ${text.length > 50 ? text.slice(0, 47) + '…' : text}`,
    })
    emitNotification(targetRecipientId, notif)
  } catch (notifErr) {
    console.error('Notification error on message send:', notifErr)
  }

  res.status(201).json({
    success: true,
    message: populatedMessage,
    conversationId: conversation._id,
  })
})

// @route   PUT /api/messages/conversation/:conversationId/read
// @access  Private
const markConversationAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params
  const currentUserId = req.user._id

  await Message.updateMany(
    {
      conversation: conversationId,
      recipient: currentUserId,
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    }
  )

  const conversation = await Conversation.findById(conversationId)
  if (conversation && conversation.unreadCount) {
    conversation.unreadCount.set(String(currentUserId), 0)
    await conversation.save()
  }

  res.json({ success: true, message: 'Conversation marked as read' })
})

module.exports = {
  getConversations,
  findOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationAsRead,
}
