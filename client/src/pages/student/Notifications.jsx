import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Briefcase,
  Check,
  Bell,
  Eye,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { useSocket } from '../../context/SocketContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

const iconMap = {
  status: CheckCircle2,
  message: MessageSquare,
  job: Briefcase,
  view: Eye,
  info: Clock,
}

export default function Notifications() {
  const { socket, clearUnreadNotifications } = useSocket()
  const { showToast } = useToast()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [clearingAll, setClearingAll] = useState(false)

  function loadNotifications() {
    setLoading(true)
    api
      .get('/notifications')
      .then(({ data }) => {
        setNotifications(data.notifications || [])
      })
      .catch(() => {
        setNotifications([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // Listen for real-time notifications over socket
  useEffect(() => {
    if (!socket) return

    const handleRealtimeNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev])
    }

    socket.on('new_notification', handleRealtimeNotif)
    return () => {
      socket.off('new_notification', handleRealtimeNotif)
    }
  }, [socket])

  async function handleMarkAllAsRead() {
    setMarkingAll(true)
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      clearUnreadNotifications()
      showToast('All notifications marked as read.', 'success')
    } catch (err) {
      showToast(err.message || 'Could not mark all notifications as read.', 'danger')
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleMarkAsRead(id, e) {
    if (e) e.stopPropagation()
    setMarkingId(id)
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
    } catch (err) {
      showToast(err.message || 'Could not update notification.', 'danger')
    } finally {
      setMarkingId(null)
    }
  }

  async function handleDeleteNotification(id, e) {
    if (e) e.stopPropagation()
    setDeletingId(id)
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      showToast('Notification deleted.', 'info')
    } catch (err) {
      showToast(err.message || 'Could not delete notification.', 'danger')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleClearAllNotifications() {
    if (notifications.length === 0) return
    if (!window.confirm('Are you sure you want to delete all notifications?')) return

    setClearingAll(true)
    try {
      await api.delete('/notifications/clear-all')
      setNotifications([])
      clearUnreadNotifications()
      showToast('All notifications cleared.', 'success')
    } catch (err) {
      showToast(err.message || 'Could not clear notifications.', 'danger')
    } finally {
      setClearingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Notifications</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Live updates on your job applications, interview invites, and recruiter activity.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="text-xs font-semibold text-signal-dark hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                {markingAll ? 'Marking all…' : 'Mark all as read'}
              </button>
            )}

            <button
              onClick={handleClearAllNotifications}
              disabled={clearingAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              {clearingAll ? 'Clearing…' : 'Clear all'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-ink/10 bg-white p-12 text-center text-sm text-ink-soft">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
          <p className="mt-3">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-ink/20 bg-white py-16 text-center">
          <Bell size={32} className="mx-auto text-ink-soft/40 mb-2" />
          <p className="font-display font-medium text-ink">No notifications</p>
          <p className="mt-1 text-xs text-ink-soft max-w-sm mx-auto">
            Activity, status changes, and interview invitations will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {notifications.map((notification) => {
            const Icon = iconMap[notification.type] || Bell
            const timestamp = new Date(notification.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
            const isUnread = !notification.read
            const isDeleting = deletingId === notification._id

            return (
              <div
                key={notification._id}
                onClick={() => isUnread && handleMarkAsRead(notification._id)}
                className={`group relative flex items-start gap-3 rounded-xl border p-4 transition ${
                  isUnread
                    ? 'border-signal/30 bg-signal/5 hover:bg-signal/10 cursor-pointer shadow-2xs'
                    : 'border-ink/10 bg-white hover:border-ink/20'
                } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isUnread ? 'bg-signal/20 text-signal-dark' : 'bg-paper text-ink-soft'
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="flex-1 min-w-0 pr-16">
                  <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-ink' : 'text-ink'}`}>
                    {notification.message}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink-soft">{timestamp}</p>
                </div>

                {/* Right Action Icons: Mark Read & Delete */}
                <div className="absolute right-3 top-3.5 flex items-center gap-1.5">
                  {isUnread && (
                    <button
                      onClick={(e) => handleMarkAsRead(notification._id, e)}
                      disabled={markingId === notification._id}
                      title="Mark as read"
                      className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/10 hover:text-ink transition"
                    >
                      <Check size={14} />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDeleteNotification(notification._id, e)}
                    disabled={isDeleting}
                    title="Delete notification"
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>

                  {isUnread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-signal ml-1" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
