import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import {
  listPurchases,
  createPurchase,
  updatePurchase,
} from '../../api/purchases'
import client from '../../api/client'

const basePayload = {
  supplier: 5,
  order_number: 'CMD-1',
  order_date: '2024-01-15',
  price: '99.90',
  is_raw_material: false,
}

describe('api/purchases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPurchases', () => {
    it('calls GET /stores/{pk}/purchases/ with page 1 by default', () => {
      listPurchases(1)
      expect(client.get).toHaveBeenCalledWith('/stores/1/purchases/', {
        params: { page: 1 },
      })
    })

    it('calls GET /stores/{pk}/purchases/ with specified page', () => {
      listPurchases(1, 2)
      expect(client.get).toHaveBeenCalledWith('/stores/1/purchases/', {
        params: { page: 2 },
      })
    })

    it('accepts string storePk', () => {
      listPurchases('9')
      expect(client.get).toHaveBeenCalledWith('/stores/9/purchases/', {
        params: { page: 1 },
      })
    })
  })

  describe('createPurchase', () => {
    it('calls POST /stores/{pk}/purchases/ with payload', () => {
      createPurchase(1, basePayload)
      expect(client.post).toHaveBeenCalledWith(
        '/stores/1/purchases/',
        basePayload,
      )
    })
  })

  describe('updatePurchase', () => {
    it('calls PATCH /stores/{pk}/purchases/{ppk}/ with data', () => {
      updatePurchase(1, 42, { price: '120.00' })
      expect(client.patch).toHaveBeenCalledWith('/stores/1/purchases/42/', {
        price: '120.00',
      })
    })

    it('accepts string storePk', () => {
      updatePurchase('3', 7, { reception_checked: true })
      expect(client.patch).toHaveBeenCalledWith('/stores/3/purchases/7/', {
        reception_checked: true,
      })
    })
  })
})
