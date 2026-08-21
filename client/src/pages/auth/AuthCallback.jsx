import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setAuthSession } = useAuth()
  const { showToast } = useToast()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      showToast(decodeURIComponent(error), 'error')
      navigate('/login', { replace: true })
      return
    }

    if (!token) {
      showToast('Authentication failed: No token received.', 'error')
      navigate('/login', { replace: true })
      return
    }

    // Set token immediately so axios request interceptor attaches Bearer token
    localStorage.setItem('ch_token', token)

    // Fetch user profile from /auth/me to verify and hydrate session
    api
      .get('/auth/me')
      .then(({ data }) => {
        setAuthSession(token, data.user)
        showToast('Signed in successfully with Google!', 'success')

        if (data.user.role === 'recruiter') {
          navigate('/recruiter/dashboard', { replace: true })
        } else if (data.user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          navigate('/student/dashboard', { replace: true })
        }
      })
      .catch((err) => {
        localStorage.removeItem('ch_token')
        localStorage.removeItem('ch_user')
        showToast(err.message || 'Failed to authenticate session with server.', 'error')
        navigate('/login', { replace: true })
      })
  }, [searchParams, navigate, setAuthSession, showToast])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Helmet>
        <title>Authenticating with Google | CareerHub</title>
      </Helmet>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-signal/20 border-t-signal" />
          <svg className="absolute h-6 w-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </div>

        <div>
          <h2 className="font-display text-lg font-bold text-ink">Completing Authentication</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Securely verifying your Google account with CareerHub...
          </p>
        </div>
      </div>
    </div>
  )
}
