import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://careerhub-guide.onrender.com/api',
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
