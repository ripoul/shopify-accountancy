import axios, {
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token as string)
    }
  })
  failedQueue = []
}

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: {
    response?: { status: number }
    config: RetryableRequestConfig
  }) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
      )
      const { access } = response.data as { access: string }
      localStorage.setItem('access_token', access)
      client.defaults.headers.common.Authorization = `Bearer ${access}`
      processQueue(null, access)
      originalRequest.headers.Authorization = `Bearer ${access}`
      return client(originalRequest)
    } catch (err) {
      processQueue(err, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

export default client
