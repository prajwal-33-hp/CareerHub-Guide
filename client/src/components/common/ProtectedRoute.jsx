import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ProtectedRoute({ children, role }) {
  const { user, initializing } = useAuth()

  // While AuthContext is verifying a stored token against /auth/me on page
  // load, avoid redirecting to /login prematurely -- that would bounce a
  // legitimately logged-in user who just refreshed the page.
  if (initializing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-signal" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />

  return children
}
