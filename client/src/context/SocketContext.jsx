import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const audioRef = useRef(null)

  // Determine socket server URL
  const serverUrl =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:5000')

  useEffect(() => {
    const token = localStorage.getItem('ch_token')
    if (!user || !token) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const socketInstance = io(serverUrl, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('online_users', (users) => {
      setOnlineUsers(users)
    })

    socketInstance.on('new_notification', (notification) => {
      setUnreadNotifications((prev) => prev + 1)
      showToast(`🔔 ${notification.message}`, 'info')
    })

    socketInstance.on('new_message', (message) => {
      setUnreadMessages((prev) => prev + 1)
      showToast(`💬 New message from ${message.sender?.name || 'Recruiter'}`, 'success')
    })

    socketInstance.on('application_status_changed', (application) => {
      showToast(`🚀 Your application status was updated to: ${application.status}`, 'success')
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [user, serverUrl])

  const clearUnreadMessages = useCallback(() => {
    setUnreadMessages(0)
  }, [])

  const clearUnreadNotifications = useCallback(() => {
    setUnreadNotifications(0)
  }, [])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        unreadMessages,
        unreadNotifications,
        clearUnreadMessages,
        clearUnreadNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
