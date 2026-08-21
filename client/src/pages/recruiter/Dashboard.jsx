import { NavLink, Outlet } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LayoutDashboard, Building2, PlusCircle, Briefcase, Users, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const navItems = [
  { to: '/recruiter/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/recruiter/dashboard/company', label: 'Company Profile', icon: Building2 },
  { to: '/recruiter/dashboard/jobs/new', label: 'Post a Job', icon: PlusCircle },
  { to: '/recruiter/dashboard/jobs', label: 'My Jobs', icon: Briefcase },
  { to: '/recruiter/dashboard/applicants', label: 'Applicants', icon: Users },
  { to: '/recruiter/dashboard/messages', label: 'Messages', icon: MessageSquare },
]

export default function RecruiterDashboard() {
  const { user } = useAuth()
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet><title>Recruiter Dashboard | CareerHub</title></Helmet>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="mb-3 border-b border-ink/10 pb-3">
            <p className="font-display font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-ink-soft">Recruiter</p>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
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
            ))}
          </nav>
        </aside>
        <div><Outlet /></div>
      </div>
    </div>
  )
}
