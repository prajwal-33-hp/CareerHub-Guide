import { NavLink, Outlet } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { User, FileText, Bookmark, Bell, LayoutDashboard, Sparkles, Target, Map, Briefcase, FileEdit, MessageSquareCode, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'

const navItems = [
  { to: '/student/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/student/dashboard/profile', label: 'My Profile', icon: User },
  { to: '/student/dashboard/applications', label: 'My Applications', icon: FileText },
  { to: '/student/dashboard/messages', label: 'Messages & Chat', icon: MessageSquare },
  { to: '/student/dashboard/saved', label: 'Saved Jobs', icon: Bookmark },
  { to: '/student/dashboard/notifications', label: 'Notifications', icon: Bell },
  { heading: 'AI CAREER TOOLS' },
  { to: '/student/dashboard/resume-analyzer', label: 'Resume & ATS Score', icon: FileText },
  { to: '/student/dashboard/cover-letter', label: 'Cover Letter Generator', icon: FileEdit },
  { to: '/student/dashboard/mock-interview', label: 'Mock Interview Simulator', icon: MessageSquareCode },
  { to: '/student/dashboard/career-recommendations', label: 'Career Recommendations', icon: Briefcase },
  { to: '/student/dashboard/skill-gap', label: 'Skill Gap Analysis', icon: Target },
  { to: '/student/dashboard/learning-roadmap', label: 'Learning Roadmap', icon: Map },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet><title>Student Dashboard | CareerHub</title></Helmet>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="mb-3 border-b border-ink/10 pb-3 flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink text-white">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-signal">
                  {user?.name?.split(' ').map((n) => n[0]).join('') || 'U'}
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-display font-semibold text-ink text-sm truncate">{user?.name}</p>
              <p className="text-xs text-ink-soft truncate">{user?.email}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.heading) {
                return (
                  <p key={item.heading} className="px-3 py-2 text-xs font-semibold text-ink-soft uppercase tracking-wider mt-4">
                    {item.heading}
                  </p>
                )
              }
              const { to, label, icon: Icon, end } = item
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-signal/15 text-signal-dark' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                    }`
                  }
                >
                  <Icon size={16} /> {label}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
