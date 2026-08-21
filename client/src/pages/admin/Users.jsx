import { useEffect, useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function Users() {
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    api.get('/users', { params: roleFilter === 'all' ? {} : { role: roleFilter } })
      .then(({ data }) => {
        if (!mounted) return
        setUsers(data.users)
      })
      .catch(() => {
        if (mounted) setUsers([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [roleFilter])

  async function toggleStatus(user) {
    const next = user.status === 'active' ? 'suspended' : 'active'
    try {
      await api.put(`/users/${user._id}/status`, { status: next })
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, status: next } : u)))
      showToast(`${user.name} ${next === 'suspended' ? 'suspended' : 'reactivated'}.`, next === 'suspended' ? 'error' : 'success')
    } catch (error) {
      showToast('Unable to update user status. Please try again.', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">Manage Users</h2>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="recruiter">Recruiters</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-sm text-ink-soft">Loading users…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-sm text-ink-soft">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3 capitalize text-ink-soft">{u.role}</td>
                  <td className="px-4 py-3 text-ink-soft">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.status === 'active' ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleStatus(u)}
                      className="flex items-center gap-1 justify-end text-xs font-medium text-ink-soft hover:text-ink ml-auto"
                    >
                      {u.status === 'active' ? <><Ban size={14} /> Suspend</> : <><CheckCircle2 size={14} /> Reactivate</>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
