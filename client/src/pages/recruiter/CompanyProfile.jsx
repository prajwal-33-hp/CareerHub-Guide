import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function CompanyProfile() {
  const { showToast } = useToast()
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      industry: '',
      location: '',
      website: '',
      employees: '201-500',
      description: '',
      logo: '',
    },
  })

  useEffect(() => {
    let mounted = true
    api.get('/companies/me')
      .then(({ data }) => {
        if (!mounted) return
        setCompany(data.company)
        reset({
          name: data.company.name,
          industry: data.company.industry,
          location: data.company.location,
          website: data.company.website,
          employees: data.company.employees || '201-500',
          description: data.company.description,
          logo: data.company.logo,
        })
      })
      .catch(() => {
        if (mounted) {
          setCompany(null)
          reset({
            name: '',
            industry: '',
            location: '',
            website: '',
            employees: '201-500',
            description: '',
            logo: '',
          })
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [reset])

  async function onSubmit(values) {
    setSaving(true)
    setError('')

    try {
      if (company) {
        await api.put(`/companies/${company._id}`, values)
        showToast('Company profile updated.', 'success')
      } else {
        await api.post('/companies', values)
        showToast('Company profile created.', 'success')
      }
    } catch (err) {
      setError(err.message || 'Unable to save company profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Company Profile</h2>
      <p className="mt-1 text-sm text-ink-soft">This is what candidates see on your company page.</p>

      {error && <div className="mt-4 rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 rounded-lg border border-ink/10 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <input {...register('name', { required: 'Company name is required' })} placeholder="Company name" className="input-field" />
          <input {...register('industry')} placeholder="Industry" className="input-field" />
          <input {...register('location')} placeholder="Headquarters location" className="input-field" />
          <input {...register('website')} placeholder="Website URL" className="input-field" />
          <input {...register('logo')} placeholder="Logo URL" className="input-field" />
          <select {...register('employees')} className="input-field">
            {['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
        <textarea {...register('description')} rows={4} placeholder="Company description" className="input-field" />
        <button type="submit" disabled={saving} className="btn-primary">{company ? 'Save Changes' : 'Create Company Profile'}</button>
      </form>
    </div>
  )
}
