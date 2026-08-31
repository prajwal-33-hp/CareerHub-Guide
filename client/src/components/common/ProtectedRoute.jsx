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

  if (!user) {
    if (role === 'recruiter') {
      return <Navigate to="/register?role=recruiter" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    if (role === 'recruiter') {
      // If user is candidate or unverified recruiter trying to access recruiter dashboard,
      // redirect them directly to the onboarding / status wizard.
      return <Navigate to="/recruiter/onboarding" replace />
    }
    return <Navigate to="/" replace />
  }

  return children
}
