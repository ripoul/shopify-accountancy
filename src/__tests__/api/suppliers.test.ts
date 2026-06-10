import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import { listSuppliers, createSupplier } from '../../api/suppliers'
import client from '../../api/client'

describe('api/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSuppliers', () => {
    it('calls GET /stores/{pk}/suppliers/ with page 1 by default', () => {
      listSuppliers(1)
      expect(client.get).toHaveBeenCalledWith('/stores/1/suppliers/', {
        params: { page: 1 },
      })
    })

    it('calls GET /stores/{pk}/suppliers/ with specified page', () => {
      listSuppliers(1, 4)
      expect(client.get).toHaveBeenCalledWith('/stores/1/suppliers/', {
        params: { page: 4 },
      })
    })

    it('accepts string storePk', () => {
      listSuppliers('7')
      expect(client.get).toHaveBeenCalledWith('/stores/7/suppliers/', {
        params: { page: 1 },
      })
    })
  })

  describe('createSupplier', () => {
    it('calls POST /stores/{pk}/suppliers/ with name', () => {
      createSupplier(1, { name: 'Acme' })
      expect(client.post).toHaveBeenCalledWith('/stores/1/suppliers/', {
        name: 'Acme',
      })
    })

    it('accepts string storePk', () => {
      createSupplier('3', { name: 'Globex' })
      expect(client.post).toHaveBeenCalledWith('/stores/3/suppliers/', {
        name: 'Globex',
      })
    })
  })
})
