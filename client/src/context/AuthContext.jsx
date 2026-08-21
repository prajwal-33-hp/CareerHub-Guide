import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ch_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ch_token')
    if (!token) {
      setInitializing(false)
      return
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user)
        localStorage.setItem('ch_user', JSON.stringify(data.user))
      })
      .catch(() => {
        localStorage.removeItem('ch_token')
        localStorage.removeItem('ch_user')
        setUser(null)
      })
      .finally(() => setInitializing(false))
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', credentials)
      localStorage.setItem('ch_token', data.token)
      localStorage.setItem('ch_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', payload)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('No authenticated user')
    setLoading(true)
    try {
      // No need to set Content-Type for FormData - axios handles it automatically
      const { data } = await api.put(`/users/${user._id}`, updates)
      localStorage.setItem('ch_user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [user])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('ch_token')
    if (!token) return null
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      localStorage.setItem('ch_user', JSON.stringify(data.user))
      return data.user
    } catch {
      return null
    }
  }, [])

  const setAuthSession = useCallback((token, userData) => {
    localStorage.setItem('ch_token', token)
    localStorage.setItem('ch_user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ch_token')
    localStorage.removeItem('ch_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initializing,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        setAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
