import axios from 'axios'

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.port === '5173' ||
    window.location.port === '5174')

const getBaseUrl = () => {
  if (isLocalhost) return 'http://localhost:5000/api'
  return import.meta.env.VITE_API_URL || 'https://careerhub-guide.onrender.com/api'
}

const api = axios.create({
  baseURL: getBaseUrl(),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ch_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Don't set Content-Type for FormData - let axios handle it
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ch_token')
    }
    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
    return Promise.reject({ ...error, message })
  }
)

export default api
