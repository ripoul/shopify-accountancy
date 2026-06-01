import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { post: vi.fn() },
}))

import { register, login, refreshToken } from '../../api/auth'
import client from '../../api/client'

describe('api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('register maps camelCase fields to snake_case and calls POST /users/', () => {
    const data = {
      email: 'a@b.com',
      firstName: 'Alice',
      lastName: 'Smith',
      password: 'secret',
    }
    register(data)
    expect(client.post).toHaveBeenCalledWith('/users/', {
      email: 'a@b.com',
      first_name: 'Alice',
      last_name: 'Smith',
      password: 'secret',
    })
  })

  it('login calls POST /auth/token/ with username and password', () => {
    login('a@b.com', 'secret')
    expect(client.post).toHaveBeenCalledWith('/auth/token/', {
      username: 'a@b.com',
      password: 'secret',
    })
  })

  it('refreshToken calls POST /auth/token/refresh/ with refresh token', () => {
    refreshToken('my-refresh-token')
    expect(client.post).toHaveBeenCalledWith('/auth/token/refresh/', {
      refresh: 'my-refresh-token',
    })
  })
})
