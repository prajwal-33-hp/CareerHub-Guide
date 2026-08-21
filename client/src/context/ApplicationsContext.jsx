import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'
import { useAuth } from './AuthContext.jsx'

const ApplicationsContext = createContext(null)

export function ApplicationsProvider({ children }) {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'student') {
      setApplications([])
      return
    }

    let mounted = true
    setLoading(true)

    api
      .get('/applications')
      .then(({ data }) => {
        if (!mounted) return
        setApplications(
          data.applications.map((application) => ({
            ...application,
            id: application._id,
            jobId: application.job?._id || application.job,
            appliedOn: application.createdAt ? new Date(application.createdAt).toISOString().slice(0, 10) : '',
          }))
        )
      })
      .catch(() => {
        if (mounted) setApplications([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [user])

  const applyToJob = useCallback(async (jobId) => {
    const { data } = await api.post(`/jobs/${jobId}/apply`)
    const application = data.application
    setApplications((prev) => [
      {
        ...application,
        id: application._id,
        jobId: application.job?._id || application.job,
        appliedOn: application.createdAt ? new Date(application.createdAt).toISOString().slice(0, 10) : '',
      },
      ...prev,
    ])
  }, [])

  const refreshApplications = useCallback(async () => {
    if (!user || user.role !== 'student') return
    const { data } = await api.get('/applications')
    setApplications(
      data.applications.map((application) => ({
        ...application,
        id: application._id,
        jobId: application.job?._id || application.job,
        appliedOn: application.createdAt ? new Date(application.createdAt).toISOString().slice(0, 10) : '',
      }))
    )
  }, [user])

  const hasApplied = useCallback((jobId) => applications.some((a) => a.jobId === jobId), [applications])

  return (
    <ApplicationsContext.Provider value={{ applications, loading, applyToJob, hasApplied, refreshApplications }}>
      {children}
    </ApplicationsContext.Provider>
  )
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext)
  if (!ctx) throw new Error('useApplications must be used within ApplicationsProvider')
  return ctx
}
