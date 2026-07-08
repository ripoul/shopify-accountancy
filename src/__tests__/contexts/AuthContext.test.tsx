import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
}))
vi.mock('../../api/profile', () => ({
  getProfile: vi.fn(),
}))

import { AuthProvider } from '../../contexts/AuthContext'
import { useAuth } from '../../contexts/useAuth'
import * as authApi from '../../api/auth'
import * as profileApi from '../../api/profile'
import i18n from '../../i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLogin = authApi.login as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetProfile = profileApi.getProfile as any

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    mockGetProfile.mockRejectedValue(new Error('not mocked'))
  })
  afterEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('fr_FR')
  })

  it('starts unauthenticated when no token in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('starts authenticated when access_token exists in localStorage', () => {
    localStorage.setItem('access_token', 'existing-token')
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('login stores tokens and sets isAuthenticated to true', async () => {
    mockLogin.mockResolvedValue({
      data: { access: 'acc-tok', refresh: 'ref-tok' },
    })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await result.current.login('user@example.com', 'password')
    })

    expect(localStorage.getItem('access_token')).toBe('acc-tok')
    expect(localStorage.getItem('refresh_token')).toBe('ref-tok')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('logout removes tokens and sets isAuthenticated to false', () => {
    localStorage.setItem('access_token', 'tok')
    localStorage.setItem('refresh_token', 'ref')
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    act(() => {
      result.current.logout()
    })

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('syncs the language from the profile when already authenticated', async () => {
    mockGetProfile.mockResolvedValue({ data: { id: 1, lang: 'en_US' } })
    localStorage.setItem('access_token', 'existing-token')
    renderHook(() => useAuth(), { wrapper: AuthProvider })

    await waitFor(() => expect(i18n.language).toBe('en_US'))
    expect(localStorage.getItem('lang')).toBe('en_US')
  })

  it('syncs the language from the profile right after login', async () => {
    mockLogin.mockResolvedValue({
      data: { access: 'acc-tok', refresh: 'ref-tok' },
    })
    mockGetProfile.mockResolvedValue({ data: { id: 1, lang: 'en_GB' } })
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(async () => {
      await result.current.login('user@example.com', 'password')
    })

    await waitFor(() => expect(i18n.language).toBe('en_GB'))
    expect(localStorage.getItem('lang')).toBe('en_GB')
  })

  it('does not fetch the profile when not authenticated', () => {
    renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(mockGetProfile).not.toHaveBeenCalled()
  })

  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside AuthProvider',
    )
    spy.mockRestore()
  })
})
