import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let requestHandler: (config: any) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let responseSuccess: (response: any) => any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let responseError: (error: any) => Promise<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockClientInstance: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockAxiosPost: any

describe('api/client interceptors', () => {
  beforeEach(async () => {
    vi.resetModules()
    localStorage.clear()

    mockAxiosPost = vi.fn()
    mockClientInstance = Object.assign(vi.fn(), {
      interceptors: {
        request: {
          use: (fn: typeof requestHandler) => {
            requestHandler = fn
          },
        },
        response: {
          use: (fn: typeof responseSuccess, efn: typeof responseError) => {
            responseSuccess = fn
            responseError = efn
          },
        },
      },
      defaults: { headers: { common: {} } },
    })

    vi.doMock('axios', () => ({
      default: {
        create: () => mockClientInstance,
        post: (...args: unknown[]) => mockAxiosPost(...args),
      },
    }))

    await import('../../api/client')
  })

  afterEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('request interceptor', () => {
    it('adds Authorization header when access_token is in localStorage', () => {
      localStorage.setItem('access_token', 'tok123')
      const config = { headers: {} }
      expect(requestHandler(config).headers.Authorization).toBe('Bearer tok123')
    })

    it('does not add Authorization header when no token', () => {
      const config = { headers: {} }
      expect(requestHandler(config).headers.Authorization).toBeUndefined()
    })
  })

  describe('response interceptor', () => {
    it('passes through successful responses', () => {
      const resp = { data: 'ok' }
      expect(responseSuccess(resp)).toBe(resp)
    })

    it('rejects non-401 errors immediately', async () => {
      const err = { response: { status: 500 }, config: {} }
      await expect(responseError(err)).rejects.toBe(err)
    })

    it('rejects 401 when no refresh token in localStorage', async () => {
      const err = { response: { status: 401 }, config: { _retry: false } }
      await expect(responseError(err)).rejects.toBe(err)
    })

    it('rejects when request was already retried', async () => {
      const err = { response: { status: 401 }, config: { _retry: true } }
      await expect(responseError(err)).rejects.toBe(err)
    })

    it('refreshes token and retries the original request on 401', async () => {
      localStorage.setItem('refresh_token', 'ref-tok')
      mockAxiosPost.mockResolvedValueOnce({ data: { access: 'new-access' } })
      mockClientInstance.mockResolvedValueOnce({ data: 'retried' })

      const originalRequest = { _retry: false, headers: {} }
      const err = { response: { status: 401 }, config: originalRequest }

      const result = await responseError(err)
      expect(result).toEqual({ data: 'retried' })
      expect(localStorage.getItem('access_token')).toBe('new-access')
    })

    it('clears tokens and rejects on refresh failure', async () => {
      localStorage.setItem('refresh_token', 'ref-tok')
      localStorage.setItem('access_token', 'old-tok')

      const refreshErr = new Error('refresh failed')
      mockAxiosPost.mockRejectedValueOnce(refreshErr)

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      const originalRequest = { _retry: false, headers: {} }
      const err = { response: { status: 401 }, config: originalRequest }

      await expect(responseError(err)).rejects.toBe(refreshErr)
      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(window.location.href).toBe('/login')
    })

    it('queues a second 401 while refresh is in progress and resolves both', async () => {
      localStorage.setItem('refresh_token', 'ref-tok')

      let resolvePost!: (value: unknown) => void
      mockAxiosPost.mockReturnValueOnce(
        new Promise((res) => {
          resolvePost = res
        }),
      )
      mockClientInstance.mockResolvedValue({ data: 'retried' })

      const err1 = {
        response: { status: 401 },
        config: { _retry: false, headers: {} },
      }
      const err2 = {
        response: { status: 401 },
        config: { _retry: false, headers: {} },
      }

      const promise1 = responseError(err1)
      const promise2 = responseError(err2)

      resolvePost({ data: { access: 'new-access' } })

      const [r1, r2] = await Promise.all([promise1, promise2])
      expect(r1).toEqual({ data: 'retried' })
      expect(r2).toEqual({ data: 'retried' })
    })

    it('rejects queued requests when refresh fails', async () => {
      localStorage.setItem('refresh_token', 'ref-tok')

      let rejectPost!: (reason: unknown) => void
      mockAxiosPost.mockReturnValueOnce(
        new Promise((_, rej) => {
          rejectPost = rej
        }),
      )

      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      })

      const refreshErr = new Error('network fail')
      const err1 = {
        response: { status: 401 },
        config: { _retry: false, headers: {} },
      }
      const err2 = {
        response: { status: 401 },
        config: { _retry: false, headers: {} },
      }

      const promise1 = responseError(err1)
      const promise2 = responseError(err2)

      rejectPost(refreshErr)

      await expect(promise1).rejects.toBe(refreshErr)
      await expect(promise2).rejects.toBe(refreshErr)
    })
  })
})
