import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

import { getProfile, updateProfile } from '../../api/profile'
import client from '../../api/client'

describe('api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getProfile calls GET /users/me/profile/', () => {
    getProfile()
    expect(client.get).toHaveBeenCalledWith('/users/me/profile/')
  })

  it('updateProfile calls PATCH /users/me/profile/ with the lang', () => {
    updateProfile('en_GB')
    expect(client.patch).toHaveBeenCalledWith('/users/me/profile/', {
      lang: 'en_GB',
    })
  })
})
