const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

let io = null
const onlineUsers = new Map() // userId -> Set of socketIds

function initSocket(server, allowedOrigins) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        const originUrl = new URL(origin)
        const isLocalhost = ['localhost', '127.0.0.1'].includes(originUrl.hostname)
        const isDevPort = originUrl.port.startsWith('517')
        if (isLocalhost && isDevPort) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        callback(null, true) // permissive for web socket handshakes in dev
      },
      credentials: true,
    },
    pingTimeout: 60000,
  })

  // Authenticate socket connections using JWT
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token

    if (!token) {
      return next(new Error('Authentication error: Token not provided'))
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')

      if (!user) {
        return next(new Error('Authentication error: User not found'))
      }

      if (user.status === 'suspended') {
        return next(new Error('Authentication error: Account is suspended'))
      }

      socket.user = user
      next()
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = String(socket.user._id)
    const userRoom = `user_${userId}`

    socket.join(userRoom)

    // Track active user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    onlineUsers.get(userId).add(socket.id)

    // Broadcast user online list
    io.emit('online_users', Array.from(onlineUsers.keys()))

    // Join a specific conversation room
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`)
      }
    })

    // Leave a specific conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`)
      }
    })

    // Typing indicators
    socket.on('typing', ({ conversationId, recipientId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          name: socket.user.name,
        })
      }
      if (recipientId) {
        socket.to(`user_${recipientId}`).emit('user_typing', {
          conversationId,
          userId,
          name: socket.user.name,
        })
      }
    })

    socket.on('stop_typing', ({ conversationId, recipientId }) => {
      if (conversationId) {
        socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
          conversationId,
          userId,
        })
      }
      if (recipientId) {
        socket.to(`user_${recipientId}`).emit('user_stop_typing', {
          conversationId,
          userId,
        })
      }
    })

    // Mark messages read in conversation
    socket.on('mark_read', ({ conversationId, senderId }) => {
      if (senderId) {
        socket.to(`user_${senderId}`).emit('messages_read', {
          conversationId,
          readBy: userId,
        })
      }
    })

    // --- WebRTC 1-to-1 Live Video Interview Signaling ---
    socket.on('join_interview_room', ({ roomId }) => {
      if (!roomId) return
      const roomName = `interview_${roomId}`
      socket.join(roomName)

      // Notify others in the room that a peer joined
      socket.to(roomName).emit('user_joined_interview', {
        socketId: socket.id,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
          role: socket.user.role,
          photoUrl: socket.user.photoUrl,
        },
      })
    })

    socket.on('webrtc_offer', ({ to, offer }) => {
      if (to && offer) {
        io.to(to).emit('webrtc_offer', {
          from: socket.id,
          offer,
          user: {
            _id: socket.user._id,
            name: socket.user.name,
            role: socket.user.role,
            photoUrl: socket.user.photoUrl,
          },
        })
      }
    })

    socket.on('webrtc_answer', ({ to, answer }) => {
      if (to && answer) {
        io.to(to).emit('webrtc_answer', {
          from: socket.id,
          answer,
        })
      }
    })

    socket.on('webrtc_ice_candidate', ({ to, candidate }) => {
      if (to && candidate) {
        io.to(to).emit('webrtc_ice_candidate', {
          from: socket.id,
          candidate,
        })
      }
    })

    socket.on('interview_chat_message', ({ roomId, text, sender }) => {
      if (!roomId || !text) return
      const roomName = `interview_${roomId}`
      const rawRole = (sender?.role || socket.user?.role || '').toLowerCase()
      const role = rawRole === 'recruiter' || rawRole === 'admin' ? 'recruiter' : 'student'
      const senderName = sender?.name || socket.user?.name || (role === 'recruiter' ? 'Recruiter' : 'Student')
      const senderId = sender?._id || socket.user?._id || socket.id

      io.to(roomName).emit('interview_chat_message', {
        id: `icm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: text.trim(),
        sender: {
          _id: senderId,
          name: senderName,
          role,
        },
        time: new Date().toISOString(),
      })
    })

    socket.on('leave_interview_room', ({ roomId }) => {
      if (!roomId) return
      const roomName = `interview_${roomId}`
      socket.leave(roomName)
      socket.to(roomName).emit('user_left_interview', {
        socketId: socket.id,
        user: socket.user,
      })
    })

    socket.on('disconnect', () => {
      // Broadcast user left to any interview rooms they might have been in
      const rooms = Array.from(socket.rooms || [])
      rooms.forEach((room) => {
        if (room.startsWith('interview_')) {
          socket.to(room).emit('user_left_interview', {
            socketId: socket.id,
            user: socket.user,
          })
        }
      })

      const userSockets = onlineUsers.get(userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          onlineUsers.delete(userId)
          io.emit('online_users', Array.from(onlineUsers.keys()))
        }
      }
    })
  })

  return io
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized!')
  }
  return io
}

/**
 * Real-time event push helpers
 */
function emitNotification(userId, notification) {
  if (!io) return
  io.to(`user_${String(userId)}`).emit('new_notification', notification)
}

function emitMessage(recipientId, message) {
  if (!io) return
  io.to(`user_${String(recipientId)}`).emit('new_message', message)
  if (message.conversation) {
    io.to(`conv_${String(message.conversation)}`).emit('conversation_message', message)
  }
}

function emitApplicationStatus(applicantId, application) {
  if (!io) return
  io.to(`user_${String(applicantId)}`).emit('application_status_changed', application)
}

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitMessage,
  emitApplicationStatus,
}
