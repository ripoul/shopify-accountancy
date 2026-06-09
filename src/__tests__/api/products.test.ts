import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import {
  importProducts,
  listProducts,
  listCollections,
  updateVariant,
} from '../../api/products'
import client from '../../api/client'

describe('api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('importProducts', () => {
    it('calls POST /stores/{pk}/products/import_products/', () => {
      importProducts(1)
      expect(client.post).toHaveBeenCalledWith(
        '/stores/1/products/import_products/',
      )
    })

    it('accepts string storePk', () => {
      importProducts('42')
      expect(client.post).toHaveBeenCalledWith(
        '/stores/42/products/import_products/',
      )
    })
  })

  describe('listProducts', () => {
    it('calls GET /stores/{pk}/products/ with page 1 by default', () => {
      listProducts(1)
      expect(client.get).toHaveBeenCalledWith('/stores/1/products/', {
        params: { page: 1 },
      })
    })

    it('calls GET /stores/{pk}/products/ with specified page', () => {
      listProducts(1, 3)
      expect(client.get).toHaveBeenCalledWith('/stores/1/products/', {
        params: { page: 3 },
      })
    })

    it('accepts string storePk', () => {
      listProducts('5')
      expect(client.get).toHaveBeenCalledWith('/stores/5/products/', {
        params: { page: 1 },
      })
    })
  })

  describe('listCollections', () => {
    it('calls GET /stores/{pk}/products/collections/ with page 1 by default', () => {
      listCollections(1)
      expect(client.get).toHaveBeenCalledWith(
        '/stores/1/products/collections/',
        {
          params: { page: 1 },
        },
      )
    })

    it('calls GET /stores/{pk}/products/collections/ with specified page', () => {
      listCollections(1, 2)
      expect(client.get).toHaveBeenCalledWith(
        '/stores/1/products/collections/',
        {
          params: { page: 2 },
        },
      )
    })
  })

  describe('updateVariant', () => {
    it('calls PATCH /stores/{pk}/products/variants/{vpk}/ with data', () => {
      updateVariant(1, 42, { distributor_price: '15.00' })
      expect(client.patch).toHaveBeenCalledWith(
        '/stores/1/products/variants/42/',
        {
          distributor_price: '15.00',
        },
      )
    })

    it('accepts null distributor_price', () => {
      updateVariant(1, 42, { distributor_price: null })
      expect(client.patch).toHaveBeenCalledWith(
        '/stores/1/products/variants/42/',
        {
          distributor_price: null,
        },
      )
    })

    it('accepts string storePk', () => {
      updateVariant('3', 7, { distributor_price: '9.99' })
      expect(client.patch).toHaveBeenCalledWith(
        '/stores/3/products/variants/7/',
        {
          distributor_price: '9.99',
        },
      )
    })
  })
})
