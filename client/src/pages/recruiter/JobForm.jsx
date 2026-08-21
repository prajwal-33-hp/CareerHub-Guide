import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import api from '../../services/api.js'

export default function JobForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      title: '',
      location: '',
      jobType: 'Full Time',
      workMode: 'Remote',
      experience: '',
      salary: '',
      description: '',
      skills: '',
      benefits: '',
      responsibilities: [{ value: '' }],
      requirements: [{ value: '' }],
      deadline: '',
    },
  })

  const resp = useFieldArray({ control, name: 'responsibilities' })
  const reqs = useFieldArray({ control, name: 'requirements' })

  useEffect(() => {
    if (!isEdit) return

    let mounted = true
    setLoading(true)

    api.get(`/jobs/${id}`)
      .then(({ data }) => {
        if (!mounted) return
        const job = data.job
        reset({
          title: job.title,
          location: job.location,
          jobType: job.jobType,
          workMode: job.workMode,
          experience: job.experience,
          salary: job.salary,
          description: job.description,
          skills: (job.skills || []).join(', '),
          benefits: (job.benefits || []).join(', '),
          responsibilities: (job.responsibilities || []).map((value) => ({ value })),
          requirements: (job.requirements || []).map((value) => ({ value })),
          deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : '',
        })
      })
      .catch(() => {
        if (mounted) setError('Unable to load job details.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id, isEdit, reset])

  async function onSubmit(formValues) {
    setError('')

    try {
      const payload = {
        title: formValues.title,
        location: formValues.location,
        jobType: formValues.jobType,
        workMode: formValues.workMode,
        experience: formValues.experience,
        salary: formValues.salary,
        description: formValues.description,
        skills: formValues.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        benefits: formValues.benefits
          .split(',')
          .map((benefit) => benefit.trim())
          .filter(Boolean),
        deadline: formValues.deadline,
        responsibilities: formValues.responsibilities.map((item) => item.value).filter(Boolean),
        requirements: formValues.requirements.map((item) => item.value).filter(Boolean),
      }

      if (isEdit) {
        await api.put(`/jobs/${id}`, payload)
        showToast('Job updated successfully.', 'success')
      } else {
        await api.post('/jobs', payload)
        showToast('Job posted successfully.', 'success')
      }
      navigate('/recruiter/dashboard/jobs')
    } catch (err) {
      setError(err.message || 'Unable to save the job posting.')
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">{isEdit ? 'Edit Job' : 'Post a New Job'}</h2>
      <p className="mt-1 text-sm text-ink-soft">Fill in the details candidates will see.</p>

      {error && <div className="mt-4 rounded-md border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5 rounded-lg border border-ink/10 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <input {...register('title', { required: true })} placeholder="Job title" className="input-field" />
          <input {...register('location', { required: true })} placeholder="Location" className="input-field" />
          <select {...register('jobType')} className="input-field">
            {['Full Time', 'Part Time', 'Internship', 'Contract'].map((t) => <option key={t}>{t}</option>)}
          </select>
          <select {...register('workMode')} className="input-field">
            {['Remote', 'Hybrid', 'On-site'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <input {...register('experience')} placeholder="Experience (e.g. 1-3 yrs)" className="input-field" />
          <input {...register('salary')} placeholder="Salary (e.g. ₹8L - ₹14L)" className="input-field" />
          <input {...register('skills')} placeholder="Skills (comma separated)" className="input-field" />
          <input {...register('deadline')} type="date" className="input-field" />
        </div>

        <textarea {...register('benefits')} rows={2} placeholder="Benefits (comma separated)" className="input-field" />
        <textarea {...register('description', { required: true })} rows={4} placeholder="Job description" className="input-field" />

        <div>
          <label className="text-sm font-semibold text-ink">Responsibilities</label>
          {resp.fields.map((f, i) => (
            <div key={f.id} className="mt-2 flex gap-2">
              <input {...register(`responsibilities.${i}.value`)} className="input-field" placeholder={`Responsibility ${i + 1}`} />
              <button type="button" onClick={() => resp.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => resp.append({ value: '' })} className="btn-ghost mt-2 text-xs"><Plus size={14} /> Add responsibility</button>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink">Requirements</label>
          {reqs.fields.map((f, i) => (
            <div key={f.id} className="mt-2 flex gap-2">
              <input {...register(`requirements.${i}.value`)} className="input-field" placeholder={`Requirement ${i + 1}`} />
              <button type="button" onClick={() => reqs.remove(i)} className="text-ink-soft hover:text-danger"><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => reqs.append({ value: '' })} className="btn-ghost mt-2 text-xs"><Plus size={14} /> Add requirement</button>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary">{isEdit ? 'Save Changes' : 'Post Job'}</button>
          <button type="button" onClick={() => navigate('/recruiter/dashboard/jobs')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
