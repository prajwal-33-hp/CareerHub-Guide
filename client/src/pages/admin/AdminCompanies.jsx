import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function AdminCompanies() {
  const { showToast } = useToast()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/companies')
      .then(({ data }) => {
        if (!mounted) return
        setCompanies(data.companies || [])
      })
      .catch(() => {
        if (mounted) setCompanies([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  async function remove(id) {
    const company = companies.find((x) => x._id === id)
    if (!company) return

    try {
      await api.delete(`/companies/${id}`)
      setCompanies((prev) => prev.filter((x) => x._id !== id))
      showToast(`${company.name} removed from the platform.`, 'success')
    } catch (error) {
      showToast('Unable to remove company. Please try again.', 'error')
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Manage Companies</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {companies.map((c) => (
              <tr key={c._id}>
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3 text-ink-soft">{c.industry}</td>
                <td className="px-4 py-3 text-ink-soft">{c.location}</td>
                <td className="px-4 py-3"><span className="badge bg-success/15 text-success"><CheckCircle2 size={12} className="mr-1" />Verified</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(c._id)} className="flex items-center gap-1 justify-end text-xs font-medium text-danger ml-auto">
                    <XCircle size={14} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
