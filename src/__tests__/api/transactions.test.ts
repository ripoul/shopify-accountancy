import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import {
  listBankTransactions,
  listCashTransactions,
  createCashTransaction,
  updateCashTransaction,
  createBankTransaction,
  updateBankTransaction,
} from '../../api/transactions'
import client from '../../api/client'

describe('api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listBankTransactions', () => {
    it('calls GET /stores/{id}/bank-transactions/ with page', () => {
      listBankTransactions('7', 2)
      expect(client.get).toHaveBeenCalledWith('/stores/7/bank-transactions/', {
        params: { page: 2 },
      })
    })

    it('defaults to page 1', () => {
      listBankTransactions('7')
      expect(client.get).toHaveBeenCalledWith('/stores/7/bank-transactions/', {
        params: { page: 1 },
      })
    })
  })

  describe('listCashTransactions', () => {
    it('calls GET /stores/{id}/cash-transactions/ with page', () => {
      listCashTransactions('7', 4)
      expect(client.get).toHaveBeenCalledWith('/stores/7/cash-transactions/', {
        params: { page: 4 },
      })
    })

    it('defaults to page 1', () => {
      listCashTransactions('7')
      expect(client.get).toHaveBeenCalledWith('/stores/7/cash-transactions/', {
        params: { page: 1 },
      })
    })
  })

  describe('createCashTransaction', () => {
    it('calls POST /stores/{id}/cash-transactions/ with payload', () => {
      const payload = {
        source: 'WITHDRAW_MONEY' as const,
        title: 'Retrait',
        date: '2024-06-01',
        amount: '-50.00',
      }
      createCashTransaction('3', payload)
      expect(client.post).toHaveBeenCalledWith(
        '/stores/3/cash-transactions/',
        payload,
      )
    })
  })

  describe('updateCashTransaction', () => {
    it('calls PATCH /stores/{id}/cash-transactions/{txId}/ with payload', () => {
      const payload = { title: 'Modifié', date: '2024-06-02', amount: '10.00' }
      updateCashTransaction('3', 42, payload)
      expect(client.patch).toHaveBeenCalledWith(
        '/stores/3/cash-transactions/42/',
        payload,
      )
    })
  })

  describe('createBankTransaction', () => {
    it('calls POST /stores/{id}/bank-transactions/ with payload', () => {
      const payload = {
        source: 'FILL_CASHBOX' as const,
        title: 'Alimentation',
        date: '2024-06-03',
        amount: '200.00',
      }
      createBankTransaction('5', payload)
      expect(client.post).toHaveBeenCalledWith(
        '/stores/5/bank-transactions/',
        payload,
      )
    })
  })

  describe('updateBankTransaction', () => {
    it('calls PATCH /stores/{id}/bank-transactions/{txId}/ with payload', () => {
      const payload = {
        title: 'Mis à jour',
        date: '2024-06-04',
        amount: '300.00',
      }
      updateBankTransaction('5', 99, payload)
      expect(client.patch).toHaveBeenCalledWith(
        '/stores/5/bank-transactions/99/',
        payload,
      )
    })
  })
})
