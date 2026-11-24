
import axios from 'axios'

export const SESSION_EXPIRED_EVENT =
  'fofuxos:session-expired'

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:3001/api',

  timeout: 15000,

  withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    if (
      status === 401 &&
      !url.endsWith('/auth/login') &&
      !url.endsWith('/auth/me')
    ) {
      window.dispatchEvent(
        new Event(SESSION_EXPIRED_EVENT)
      )
    }

    return Promise.reject(error)
  }
)

export default api
