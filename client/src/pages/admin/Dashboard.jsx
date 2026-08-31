import { NavLink, Outlet } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { LayoutDashboard, Users, Building2, Briefcase, Flag, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

const navItems = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/dashboard/recruiter-requests', label: 'Recruiter Requests', icon: ShieldCheck },
  { to: '/admin/dashboard/users', label: 'Users', icon: Users },
  { to: '/admin/dashboard/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/dashboard/reports', label: 'Reports', icon: Flag },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Helmet><title>Admin Dashboard | CareerHub</title></Helmet>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="mb-3 border-b border-ink/10 pb-3">
            <p className="font-display font-semibold text-ink">{user?.name || 'Admin'}</p>
            <p className="text-xs text-ink-soft">Administrator</p>
          </div>
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-signal/15 text-signal-dark' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
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
