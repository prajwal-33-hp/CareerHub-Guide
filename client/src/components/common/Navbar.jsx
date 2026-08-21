import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, Briefcase, Bell, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'

const links = [
  { to: '/jobs', label: 'Jobs' },
  { to: '/internships', label: 'Internships' },
  { to: '/skills', label: 'Skills' },
  { to: '/companies', label: 'Companies' },
  { to: '/articles', label: 'Career Resources' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isConnected, unreadMessages, unreadNotifications } = useSocket()

  const dashboardPath =
    user?.role === 'recruiter'
      ? '/recruiter/dashboard'
      : user?.role === 'admin'
        ? '/admin/dashboard'
        : '/student/dashboard'

  const messagesPath =
    user?.role === 'recruiter' ? '/recruiter/dashboard/messages' : '/student/dashboard/messages'

  const notifsPath =
    user?.role === 'student' ? '/student/dashboard/notifications' : dashboardPath

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-800 text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-signal">
            <Briefcase size={18} />
          </span>
          CareerHub
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {/* Real-time Messages quick button */}
              <Link
                to={messagesPath}
                title="Messages & Chat"
                className="relative rounded-md p-2 text-ink-soft hover:bg-ink/5 hover:text-ink transition"
              >
                <MessageSquare size={18} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-ink ring-2 ring-white">
                    {unreadMessages}
                  </span>
                )}
              </Link>

              {/* Real-time Notifications */}
              <Link
                to={notifsPath}
                title="Notifications"
                className="relative rounded-md p-2 text-ink-soft hover:bg-ink/5 hover:text-ink transition"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-signal ring-2 ring-white" />
                )}
              </Link>

              {/* Dashboard Link */}
              <Link to={dashboardPath} className="btn-ghost">
                Dashboard
              </Link>
              <button onClick={logout} className="btn-secondary">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/10 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink/10 pt-3">
              {user ? (
                <>
                  <Link to={dashboardPath} className="btn-ghost flex-1">
                    Dashboard
                  </Link>
                  <button onClick={logout} className="btn-secondary flex-1">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost flex-1">
                    Log in
                  </Link>
                  <Link to="/register" className="btn-primary flex-1">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
