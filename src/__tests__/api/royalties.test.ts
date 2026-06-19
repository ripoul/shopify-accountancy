import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

import { listRoyalties, updateRoyalty } from '../../api/royalties'
import client from '../../api/client'

describe('api/royalties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listRoyalties', () => {
    it('calls GET /stores/{id}/royalties/ with page', () => {
      listRoyalties('7', 2)
      expect(client.get).toHaveBeenCalledWith('/stores/7/royalties/', {
        params: { page: 2 },
      })
    })

    it('defaults to page 1', () => {
      listRoyalties('7')
      expect(client.get).toHaveBeenCalledWith('/stores/7/royalties/', {
        params: { page: 1 },
      })
    })
  })

  describe('updateRoyalty', () => {
    it('calls PATCH /stores/{id}/royalties/{royaltyId}/ with payment_date', () => {
      updateRoyalty('3', 42, { payment_date: '2024-06-30' })
      expect(client.patch).toHaveBeenCalledWith('/stores/3/royalties/42/', {
        payment_date: '2024-06-30',
      })
    })

    it('calls PATCH with null payment_date to clear it', () => {
      updateRoyalty('3', 42, { payment_date: null })
      expect(client.patch).toHaveBeenCalledWith('/stores/3/royalties/42/', {
        payment_date: null,
      })
    })

    it('calls PATCH with amount override', () => {
      updateRoyalty('5', 10, { payment_date: '2024-09-30', amount: '199.99' })
      expect(client.patch).toHaveBeenCalledWith('/stores/5/royalties/10/', {
        payment_date: '2024-09-30',
        amount: '199.99',
      })
    })
  })
})
