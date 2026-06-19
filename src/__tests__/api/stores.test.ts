import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import {
  installStore,
  connectStore,
  listStores,
  getStore,
  updateStore,
  getCurrentQuarterStats,
} from '../../api/stores'
import client from '../../api/client'

describe('api/stores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('installStore calls GET /stores/install/ with all params', () => {
    const params = {
      shop: 'test.myshopify.com',
      hmac: 'abc',
      host: 'host',
      timestamp: '123',
      session: null,
    }
    installStore(params)
    expect(client.get).toHaveBeenCalledWith('/stores/install/', { params })
  })

  it('connectStore calls POST /stores/ with all params', () => {
    const params = {
      shop: 'test',
      code: 'code',
      hmac: 'hmac',
      host: 'host',
      state: 'state',
      timestamp: 'ts',
    }
    connectStore(params)
    expect(client.post).toHaveBeenCalledWith('/stores/', params)
  })

  it('listStores calls GET /stores/ with page 1 by default', () => {
    listStores()
    expect(client.get).toHaveBeenCalledWith('/stores/', { params: { page: 1 } })
  })

  it('listStores calls GET /stores/ with specified page', () => {
    listStores(3)
    expect(client.get).toHaveBeenCalledWith('/stores/', { params: { page: 3 } })
  })

  it('getStore calls GET /stores/{id}/', () => {
    getStore('5')
    expect(client.get).toHaveBeenCalledWith('/stores/5/')
  })

  it('updateStore calls PATCH /stores/{id}/ with royalty_rate', () => {
    updateStore('5', { royalty_rate: '7.50' })
    expect(client.patch).toHaveBeenCalledWith('/stores/5/', {
      royalty_rate: '7.50',
    })
  })

  it('getCurrentQuarterStats calls GET /stores/{id}/stats/current-quarter/', () => {
    getCurrentQuarterStats('42')
    expect(client.get).toHaveBeenCalledWith('/stores/42/stats/current-quarter/')
  })
})
