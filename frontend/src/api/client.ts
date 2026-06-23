import axios from 'axios'

// ✅ Now pointing to Railway backend
const API_BASE = 'https://stas-backend-production.up.railway.app'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stas_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear stored credentials and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('stas_token')
      localStorage.removeItem('stas_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)