import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Send,
  Search,
  MessageSquare,
  User,
  Check,
  CheckCheck,
  Building2,
  Briefcase,
  RefreshCw,
  Video,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function StudentMessages() {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()

  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [isRecipientTyping, setIsRecipientTyping] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const targetUserId = searchParams.get('user')
  const targetJobId = searchParams.get('job')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isRecipientTyping])

  async function loadConversations() {
    setLoadingConversations(true)
    try {
      const { data } = await api.get('/messages/conversations')
      const convs = data.conversations || []
      setConversations(convs)

      if (targetUserId) {
        handleFindOrCreateThread(targetUserId, targetJobId, convs)
      } else if (convs.length > 0 && !activeConversation) {
        selectConversation(convs[0])
      }
    } catch (err) {
      showToast(err.message || 'Failed to load conversations', 'danger')
    } finally {
      setLoadingConversations(false)
    }
  }

  async function handleFindOrCreateThread(recipientId, jobId, existingConvs = []) {
    try {
      const { data } = await api.post('/messages/conversations/find-or-create', {
        recipientId,
        jobId,
      })
      if (data.conversation) {
        setConversations((prev) => {
          const list = prev.length > 0 ? prev : existingConvs
          const found = list.find((c) => String(c._id) === String(data.conversation._id))
          if (found) {
            return list.map((c) =>
              String(c._id) === String(data.conversation._id) ? data.conversation : c
            )
          }
          return [data.conversation, ...list]
        })
        selectConversation(data.conversation)
      }
    } catch (err) {
      showToast(err.message || 'Could not open conversation', 'danger')
    }
  }

  useEffect(() => {
    loadConversations()
  }, [targetUserId, targetJobId])

  async function selectConversation(conv) {
    setActiveConversation(conv)
    setLoadingMessages(true)
    setIsRecipientTyping(false)

    try {
      const { data } = await api.get(`/messages/conversation/${conv._id}`)
      setMessages(data.messages || [])

      setConversations((prev) =>
        prev.map((c) => (c._id === conv._id ? { ...c, unread: 0 } : c))
      )

      if (socket) {
        socket.emit('join_conversation', conv._id)
        socket.emit('mark_read', {
          conversationId: conv._id,
          senderId: conv.otherParticipant?._id,
        })
      }
    } catch (err) {
      showToast(err.message || 'Failed to load messages', 'danger')
    } finally {
      setLoadingMessages(false)
    }
  }

  // Socket real-time events
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (msg) => {
      const convId = typeof msg.conversation === 'string' ? msg.conversation : msg.conversation?._id

      if (activeConversation && String(convId) === String(activeConversation._id)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev
          return [...prev, msg]
        })
        api.put(`/messages/conversation/${activeConversation._id}/read`).catch(() => { })
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => String(c._id) === String(convId))
        if (index !== -1) {
          const updated = {
            ...prev[index],
            lastMessageText: msg.text,
            lastMessageAt: msg.createdAt,
            unread:
              activeConversation && String(activeConversation._id) === String(convId)
                ? 0
                : (prev[index].unread || 0) + 1,
          }
          const next = [...prev]
          next.splice(index, 1)
          return [updated, ...next]
        } else {
          loadConversations()
          return prev
        }
      })
    }

    const handleTyping = ({ conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setIsRecipientTyping(true)
      }
    }

    const handleStopTyping = ({ conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setIsRecipientTyping(false)
      }
    }

    const handleMessagesRead = ({ conversationId }) => {
      if (activeConversation && conversationId === activeConversation._id) {
        setMessages((prev) => prev.map((m) => ({ ...m, read: true })))
      }
    }

    socket.on('new_message', handleNewMessage)
    socket.on('conversation_message', handleNewMessage)
    socket.on('user_typing', handleTyping)
    socket.on('user_stop_typing', handleStopTyping)
    socket.on('messages_read', handleMessagesRead)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('conversation_message', handleNewMessage)
      socket.off('user_typing', handleTyping)
      socket.off('user_stop_typing', handleStopTyping)
      socket.off('messages_read', handleMessagesRead)
    }
  }, [socket, activeConversation])

  function handleInputChange(e) {
    setNewMessage(e.target.value)

    if (!socket || !activeConversation) return

    socket.emit('typing', {
      conversationId: activeConversation._id,
      recipientId: activeConversation.otherParticipant?._id,
    })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        conversationId: activeConversation._id,
        recipientId: activeConversation.otherParticipant?._id,
      })
    }, 1500)
  }

  async function handleSendMessage(e) {
    if (e) e.preventDefault()
    if (!newMessage.trim() || !activeConversation || sending) return

    const textToSend = newMessage.trim()
    setNewMessage('')
    setSending(true)

    if (socket && activeConversation) {
      socket.emit('stop_typing', {
        conversationId: activeConversation._id,
        recipientId: activeConversation.otherParticipant?._id,
      })
    }

    try {
      const { data } = await api.post('/messages', {
        conversationId: activeConversation._id,
        recipientId: activeConversation.otherParticipant?._id,
        text: textToSend,
      })

      if (data.message) {
        setMessages((prev) => [...prev, data.message])
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConversation._id
              ? {
                ...c,
                lastMessageText: textToSend,
                lastMessageAt: new Date().toISOString(),
              }
              : c
          )
        )
      }
    } catch (err) {
      showToast(err.message || 'Failed to send message.', 'danger')
      setNewMessage(textToSend)
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = conversations
    .filter((c, idx, arr) => arr.findIndex((x) => String(x._id) === String(c._id)) === idx)
    .filter((c) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      const nameMatch = c.otherParticipant?.name?.toLowerCase().includes(q)
      const emailMatch = c.otherParticipant?.email?.toLowerCase().includes(q)
      const jobMatch = c.job?.title?.toLowerCase().includes(q)
      return nameMatch || emailMatch || jobMatch
    })

  function renderMessageContent(text, isMine) {
    // Check if message is a video interview invitation
    const interviewMatch = text.match(/\/interview\/(int_[a-zA-Z0-9_\-]+[^\s]*)/)
    if (interviewMatch) {
      const interviewPath = `/interview/${interviewMatch[1]}`
      return (
        <div className="space-y-2.5">
          <p className="whitespace-pre-wrap">{text.split('http')[0].trim() || '🎥 Live Video Interview Invitation'}</p>
          <div className={`rounded-xl border p-3.5 ${isMine ? 'border-white/20 bg-white/10 text-white' : 'border-emerald-500/30 bg-emerald-50 text-emerald-950'
            }`}>
            <div className="flex items-center gap-2 font-bold text-xs">
              <Video size={16} className={isMine ? 'text-signal' : 'text-emerald-600'} />
              <span>Live Video Interview Room</span>
            </div>
            <p className={`mt-1 text-[11px] leading-tight ${isMine ? 'text-slate-300' : 'text-emerald-700'}`}>
              Click below to enter the live encrypted 1-on-1 video call studio.
            </p>
            <a
              href={interviewPath}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold shadow-xs transition ${isMine
                ? 'bg-signal text-ink hover:bg-signal/90'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
            >
              <Video size={14} /> Enter Live Video Call
            </a>
          </div>
        </div>
      )
    }

    // Check for other URLs and make them clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g
    if (urlRegex.test(text)) {
      const parts = text.split(urlRegex)
      return (
        <p className="whitespace-pre-wrap">
          {parts.map((part, i) =>
            urlRegex.test(part) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline ${isMine ? 'text-signal hover:text-white' : 'text-signal-dark hover:text-signal'}`}
              >
                {part}
              </a>
            ) : (
              part
            )
          )}
        </p>
      )
    }

    return <p className="whitespace-pre-wrap">{text}</p>
  }

  return (
    <div>
      <Helmet>
        <title>Messages & Chat | Student Dashboard</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Recruiter Messaging & Chat</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Chat directly in real-time with hiring managers and interviewers.
          </p>
        </div>

        <button
          onClick={loadConversations}
          title="Refresh messages"
          className="btn-secondary text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loadingConversations ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Main Dual-Pane Messenger */}
      <div className="mt-6 grid h-[680px] grid-cols-1 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-xs md:grid-cols-[320px_1fr]">
        {/* Left Pane: Conversation Threads List */}
        <div className="flex flex-col border-r border-ink/10 bg-paper/30">
          <div className="border-b border-ink/10 p-3 bg-white">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <input
                type="text"
                placeholder="Search recruiters…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-8.5 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-ink/5">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-ink-soft">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
                <p className="mt-2">Loading messages…</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-soft">
                <MessageSquare size={28} className="mx-auto text-ink-soft/40 mb-2" />
                No conversation threads yet. When recruiters reach out regarding your applications,
                their messages will appear here.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?._id === conv._id
                const other = conv.otherParticipant
                const hasUnread = conv.unread > 0

                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition ${isSelected
                      ? 'bg-signal/15 border-l-3 border-signal'
                      : 'hover:bg-white bg-transparent'
                      }`}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xs font-bold text-signal">
                      {other?.photoUrl ? (
                        <img
                          src={other.photoUrl}
                          alt={other.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        other?.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || <User size={16} />
                      )}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal px-1 font-mono text-[9px] font-bold text-ink ring-2 ring-white">
                          {conv.unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`font-display text-xs truncate ${hasUnread ? 'font-bold text-ink' : 'font-semibold text-ink'
                            }`}
                        >
                          {other?.name || 'Recruiter'}
                        </p>
                        {conv.lastMessageAt && (
                          <span className="font-mono text-[10px] text-ink-soft shrink-0">
                            {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {other?.email && (
                        <p className="text-[10px] text-ink-soft/80 truncate font-mono">
                          {other.email}
                        </p>
                      )}

                      {conv.job?.title && (
                        <p className="flex items-center gap-1 text-[11px] font-medium text-signal-dark truncate">
                          <Briefcase size={10} /> {conv.job.title}
                        </p>
                      )}

                      <p
                        className={`mt-0.5 text-xs truncate ${hasUnread ? 'font-medium text-ink' : 'text-ink-soft'
                          }`}
                      >
                        {conv.lastMessageText || 'Conversation started'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        {activeConversation ? (
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between border-b border-ink/10 p-3.5 px-5 bg-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-signal">
                  {activeConversation.otherParticipant?.photoUrl ? (
                    <img
                      src={activeConversation.otherParticipant.photoUrl}
                      alt={activeConversation.otherParticipant.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    activeConversation.otherParticipant?.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('') || <User size={16} />
                  )}
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">
                    {activeConversation.otherParticipant?.name}
                  </h3>
                  <p className="text-[11px] text-ink-soft">
                    {activeConversation.job?.title
                      ? `Recruiter for ${activeConversation.job.title}`
                      : 'Hiring Team'}
                  </p>
                </div>
              </div>

              {/* Join or Start Video Interview */}
              <button
                onClick={() => {
                  const roomId = `int_${activeConversation._id.slice(-6)}`
                  const url = `/interview/${roomId}?candidate=${encodeURIComponent(
                    user?.name || 'Student'
                  )}&recruiter=${encodeURIComponent(
                    activeConversation.otherParticipant?.name || 'Recruiter'
                  )}&job=${encodeURIComponent(
                    activeConversation.job?.title || 'Job Interview'
                  )}&role=student`
                  window.open(url, '_blank')
                }}
                className="btn-secondary text-xs inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
              >
                <Video size={14} className="text-emerald-600" /> Video Room
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-paper/20">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center text-xs text-ink-soft">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal mr-2" />
                  Loading message history…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-ink-soft">
                  <MessageSquare size={32} className="text-ink-soft/40 mb-2" />
                  <p className="font-medium text-ink">No messages yet</p>
                  <p className="mt-1">
                    Send a message to reply to this recruiter or ask questions about the role.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = String(msg.sender?._id || msg.sender) === String(user?._id)
                  const time = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs leading-relaxed ${isMine
                          ? 'bg-ink text-white rounded-br-xs'
                          : 'bg-white text-ink border border-ink/10 rounded-bl-xs'
                          }`}
                      >
                        {renderMessageContent(msg.text, isMine)}
                      </div>

                      <div className="mt-1 flex items-center gap-1 px-1 font-mono text-[10px] text-ink-soft">
                        <span>{time}</span>
                        {isMine && (
                          <span>
                            {msg.read ? (
                              <CheckCheck size={12} className="text-signal-dark inline" />
                            ) : (
                              <Check size={12} className="inline text-ink-soft" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {isRecipientTyping && (
                <div className="flex items-center gap-2 text-xs text-ink-soft italic">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-signal [animation-delay:0.4s]" />
                  </div>
                  <span>{activeConversation.otherParticipant?.name} is typing…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Send Form */}
            <form onSubmit={handleSendMessage} className="border-t border-ink/10 p-3 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message to recruiter…"
                  value={newMessage}
                  onChange={handleInputChange}
                  className="input-field text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary inline-flex items-center justify-center px-4 py-2 shrink-0 shadow-xs"
                >
                  <Send size={15} className={sending ? 'animate-spin' : ''} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-ink-soft bg-paper/20">
            <MessageSquare size={36} className="text-ink-soft/40 mb-3" />
            <p className="font-display font-semibold text-ink text-base">Select a conversation</p>
            <p className="mt-1 text-xs max-w-sm">
              Choose a recruiter thread from the left pane to view messages and replies.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
