import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'
import api from '../services/api.js'

const SavedJobsContext = createContext(null)
const STORAGE_KEY = 'ch_saved_jobs'

export function SavedJobsProvider({ children }) {
  const { user } = useAuth()
  const [savedJobs, setSavedJobs] = useState([])
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'student') {
      setSavedJobs([])
      return
    }

    let mounted = true
    setLoading(true)

    api.get('/bookmarks')
      .then(({ data }) => {
        if (!mounted) return
        const jobs = data.bookmarks.map((bookmark) => bookmark.job)
        setSavedJobs(jobs)
        setSavedIds(jobs.map((job) => job._id || job.id))
      })
      .catch(() => {
        if (mounted) {
          setSavedJobs([])
          setSavedIds([])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedIds))
  }, [savedIds])

  const toggleSave = useCallback(
    async (jobId) => {
      if (!user || user.role !== 'student') {
        setSavedIds((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]))
        return
      }

      if (savedIds.includes(jobId)) {
        await api.delete(`/jobs/${jobId}/bookmark`)
        setSavedJobs((prev) => prev.filter((job) => (job._id || job.id) !== jobId))
        setSavedIds((prev) => prev.filter((id) => id !== jobId))
        return
      }

      const { data } = await api.post(`/jobs/${jobId}/bookmark`)
      const job = data.bookmark?.job || data.bookmark
      if (job) {
        setSavedJobs((prev) => [...prev, job])
        setSavedIds((prev) => [...new Set([...prev, job._id || job.id || jobId])])
      }
    },
    [user, savedIds]
  )

  const isSaved = useCallback((jobId) => savedIds.includes(jobId), [savedIds])

  return (
    <SavedJobsContext.Provider value={{ savedJobs, savedIds, loading, toggleSave, isSaved }}>
      {children}
    </SavedJobsContext.Provider>
  )
}

export function useSavedJobs() {
  const ctx = useContext(SavedJobsContext)
  if (!ctx) throw new Error('useSavedJobs must be used within SavedJobsProvider')
  return ctx
}
