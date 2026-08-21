import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Upload, Linkedin, Github, Globe, Sparkles, FileText, CheckCircle2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import api from '../../services/api.js'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const { register, handleSubmit, reset, getValues } = useForm({
    defaultValues: {
      name: '',
      email: '',
      about: '',
      linkedin: '',
      github: '',
      portfolio: '',
    },
  })
  const [skills, setSkills] = useState([])
  const [skillInput, setSkillInput] = useState('')
  const [education, setEducation] = useState([])
  const [projects, setProjects] = useState([])
  const [photoPreview, setPhotoPreview] = useState('')
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null)
  const [parsingResume, setParsingResume] = useState(false)
  const photoInputRef = useRef(null)
  const resumeParserInputRef = useRef(null)

  useEffect(() => {
    if (!user) return

    reset({
      name: user.name || '',
      email: user.email || '',
      about: user.about || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      portfolio: user.portfolio || '',
    })

    setSkills(user.skills || [])
    setEducation(user.education?.length ? user.education : [{ id: Date.now(), degree: '', institute: '', year: '' }])
    setProjects(user.projects?.length ? user.projects : [{ id: Date.now(), title: '', description: '' }])
    setPhotoPreview(user.photoUrl || '')
  }, [user, reset])

  function addSkill() {
    const value = skillInput.trim()
    if (value && !skills.includes(value)) {
      setSkills((prev) => [...prev, value])
      setSkillInput('')
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setPhotoPreview(reader.result)
      setSelectedPhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  async function handleAutoFillResume(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setParsingResume(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)

      const { data } = await api.post('/ai/parse-resume-to-profile', formData)
      const parsed = data.profileData

      if (parsed) {
        reset({
          name: parsed.name || getValues('name') || user?.name || '',
          email: user?.email || '',
          about: parsed.about || getValues('about') || user?.about || '',
          linkedin: parsed.linkedin || getValues('linkedin') || user?.linkedin || '',
          github: parsed.github || getValues('github') || user?.github || '',
          portfolio: parsed.portfolio || getValues('portfolio') || user?.portfolio || '',
        })

        if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          setSkills((prev) => Array.from(new Set([...prev, ...parsed.skills])))
        }

        if (Array.isArray(parsed.education) && parsed.education.length > 0) {
          setEducation(
            parsed.education.map((ed, idx) => ({
              id: Date.now() + idx,
              degree: ed.degree || '',
              institute: ed.institute || '',
              year: ed.year || '',
            }))
          )
        }

        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          setProjects(
            parsed.projects.map((p, idx) => ({
              id: Date.now() + idx + 100,
              title: p.title || '',
              description: p.description || '',
            }))
          )
        }

        showToast('Profile successfully auto-filled from resume! Click "Save Profile" to save changes.', 'success')
      }
    } catch (err) {
      showToast(err.message || 'Failed to auto-fill profile from resume.', 'danger')
    } finally {
      setParsingResume(false)
      if (resumeParserInputRef.current) resumeParserInputRef.current.value = ''
    }
  }

  async function onSubmit(values) {
    const profileData = {
      ...values,
      skills: JSON.stringify(skills),
      education: JSON.stringify(education.map((ed) => ({ degree: ed.degree || '', institute: ed.institute || '', year: ed.year || '' }))),
      projects: JSON.stringify(projects.map((project) => ({ title: project.title || '', description: project.description || '' }))),
    }

    const payload = selectedPhotoFile
      ? (() => {
        const formData = new FormData()
        Object.entries(profileData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value)
          }
        })
        formData.append('photo', selectedPhotoFile)
        return formData
      })()
      : profileData

    try {
      const updatedUser = await updateProfile(payload)
      showToast('Profile updated successfully.', 'success')
      setSelectedPhotoFile(null)
      if (updatedUser?.photoUrl) {
        setPhotoPreview(updatedUser.photoUrl)
      }
    } catch (err) {
      showToast(err.message || 'Unable to update profile.', 'danger')
    }
  }

  if (!user) {
    return <div className="rounded-lg border border-ink/10 bg-white p-6 text-center text-sm text-ink-soft">Loading your profile…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">My Profile</h2>
          <p className="text-xs text-ink-soft">Keep this updated — recruiters see it when you apply.</p>
        </div>

        {/* AI Auto-Fill Action */}
        <div>
          <button
            type="button"
            disabled={parsingResume}
            onClick={() => resumeParserInputRef.current?.click()}
            className="btn-primary text-xs flex items-center gap-2"
          >
            <Sparkles size={15} />
            {parsingResume ? 'Auto-filling profile…' : '⚡ Auto-fill from Resume (PDF)'}
          </button>
          <input
            type="file"
            accept=".pdf,.txt,.docx,.doc"
            ref={resumeParserInputRef}
            onChange={handleAutoFillResume}
            className="hidden"
          />
        </div>
      </div>

      {parsingResume && (
        <div className="rounded-xl border border-signal/40 bg-signal/10 p-4 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-signal border-t-transparent shrink-0" />
          <p className="text-xs text-ink">
            <strong>Gemini AI is parsing your resume…</strong> Extracting full name, skills, bio, education, projects, and links.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-ink text-white">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-signal">
                  {user.name?.split(' ').map((namePart) => namePart[0]).join('') || 'U'}
                </div>
              )}
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => photoInputRef.current?.click()}>
              <Upload size={14} /> Upload photo
            </button>
            <input type="file" accept="image/*" className="hidden" ref={photoInputRef} onChange={handlePhotoChange} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Full Name</label>
              <input {...register('name')} placeholder="Full name" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Email Address</label>
              <input {...register('email')} placeholder="Email" className="input-field" disabled />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">About / Bio</label>
            <textarea {...register('about')} rows={3} placeholder="Professional summary or bio about yourself..." className="input-field" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">LinkedIn</label>
              <div className="flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2">
                <Linkedin size={15} className="text-ink-soft" />
                <input {...register('linkedin')} placeholder="LinkedIn URL" className="w-full text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">GitHub</label>
              <div className="flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2">
                <Github size={15} className="text-ink-soft" />
                <input {...register('github')} placeholder="GitHub URL" className="w-full text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Portfolio</label>
              <div className="flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2">
                <Globe size={15} className="text-ink-soft" />
                <input {...register('portfolio')} placeholder="Portfolio URL" className="w-full text-sm outline-none" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <h3 className="font-display font-semibold text-ink">Skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="badge bg-paper text-ink-soft">
                {s}
                <button type="button" onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} className="ml-1.5 text-ink-soft/60 hover:text-danger">×</button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Add a skill and press Enter"
              className="input-field"
            />
            <button type="button" onClick={addSkill} className="btn-secondary shrink-0"><Plus size={16} /></button>
          </div>
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-ink">Education</h3>
            <button type="button" onClick={() => setEducation((prev) => [...prev, { id: Date.now(), degree: '', institute: '', year: '' }])} className="btn-ghost text-xs"><Plus size={14} /> Add</button>
          </div>
          {education.map((ed) => (
            <div key={ed.id} className="mt-3 grid gap-3 border-t border-ink/10 pt-3 sm:grid-cols-[1fr_1fr_100px_36px]">
              <input value={ed.degree} onChange={(e) => setEducation((prev) => prev.map((x) => (x.id === ed.id ? { ...x, degree: e.target.value } : x)))} placeholder="Degree (e.g. B.Tech Computer Science)" className="input-field" />
              <input value={ed.institute} onChange={(e) => setEducation((prev) => prev.map((x) => (x.id === ed.id ? { ...x, institute: e.target.value } : x)))} placeholder="Institute / University" className="input-field" />
              <input value={ed.year} onChange={(e) => setEducation((prev) => prev.map((x) => (x.id === ed.id ? { ...x, year: e.target.value } : x)))} placeholder="Year (e.g. 2024)" className="input-field" />
              <button type="button" onClick={() => setEducation((prev) => prev.filter((x) => x.id !== ed.id))} className="flex items-center justify-center text-ink-soft hover:text-danger"><Trash2 size={16} /></button>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-ink">Projects</h3>
            <button type="button" onClick={() => setProjects((prev) => [...prev, { id: Date.now(), title: '', description: '' }])} className="btn-ghost text-xs"><Plus size={14} /> Add</button>
          </div>
          {projects.map((project) => (
            <div key={project.id} className="mt-3 space-y-2 border-t border-ink/10 pt-3">
              <div className="flex gap-2">
                <input value={project.title} onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === project.id ? { ...x, title: e.target.value } : x)))} placeholder="Project title (e.g. E-Commerce Microservices)" className="input-field" />
                <button type="button" onClick={() => setProjects((prev) => prev.filter((x) => x.id !== project.id))} className="flex shrink-0 items-center justify-center text-ink-soft hover:text-danger"><Trash2 size={16} /></button>
              </div>
              <textarea value={project.description} onChange={(e) => setProjects((prev) => prev.map((x) => (x.id === project.id ? { ...x, description: e.target.value } : x)))} rows={2} placeholder="Brief project description and tech stack used" className="input-field" />
            </div>
          ))}
        </section>

        <button type="submit" className="btn-primary">Save Profile</button>
      </form>
    </div>
  )
}
