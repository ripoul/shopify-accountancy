import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}))

import { listTaxes, updateTax } from '../../api/taxes'
import client from '../../api/client'

describe('api/taxes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTaxes', () => {
    it('calls GET /stores/{id}/taxes/ with page', () => {
      listTaxes('7', 2)
      expect(client.get).toHaveBeenCalledWith('/stores/7/taxes/', {
        params: { page: 2 },
      })
    })

    it('defaults to page 1', () => {
      listTaxes('7')
      expect(client.get).toHaveBeenCalledWith('/stores/7/taxes/', {
        params: { page: 1 },
      })
    })
  })

  describe('updateTax', () => {
    it('calls PATCH /stores/{id}/taxes/{taxId}/ with payment_date', () => {
      updateTax('3', 42, { payment_date: '2024-06-30' })
      expect(client.patch).toHaveBeenCalledWith('/stores/3/taxes/42/', {
        payment_date: '2024-06-30',
      })
    })

    it('calls PATCH with null payment_date to clear it', () => {
      updateTax('3', 42, { payment_date: null })
      expect(client.patch).toHaveBeenCalledWith('/stores/3/taxes/42/', {
        payment_date: null,
      })
    })

    it('calls PATCH with amount override', () => {
      updateTax('5', 10, { payment_date: '2024-09-30', amount: '199.99' })
      expect(client.patch).toHaveBeenCalledWith('/stores/5/taxes/10/', {
        payment_date: '2024-09-30',
        amount: '199.99',
      })
    })
  })
})
