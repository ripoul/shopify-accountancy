import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import {
  listOrders,
  getOrder,
  importOrders,
  reimportOrder,
  createOrderExpense,
  updateOrderExpense,
  deleteOrderExpense,
  updateOrderLineItem,
} from '../../api/orders'
import client from '../../api/client'

describe('api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listOrders calls GET /stores/{id}/orders/ with page', () => {
    listOrders('42', 3)
    expect(client.get).toHaveBeenCalledWith('/stores/42/orders/', {
      params: { page: 3 },
    })
  })

  it('listOrders defaults to page 1', () => {
    listOrders('42')
    expect(client.get).toHaveBeenCalledWith('/stores/42/orders/', {
      params: { page: 1 },
    })
  })

  it('getOrder calls GET /stores/{id}/orders/{orderId}/', () => {
    getOrder('42', 7)
    expect(client.get).toHaveBeenCalledWith('/stores/42/orders/7/')
  })

  it('importOrders calls POST /stores/{id}/orders/import_orders/ with no body', () => {
    importOrders('42')
    expect(client.post).toHaveBeenCalledWith('/stores/42/orders/import_orders/')
  })

  it('reimportOrder calls POST with external_id in body', () => {
    reimportOrder('42', 'gid://shopify/Order/12345')
    expect(client.post).toHaveBeenCalledWith(
      '/stores/42/orders/import_orders/',
      { external_id: 'gid://shopify/Order/12345' },
    )
  })

  it('createOrderExpense calls POST /stores/{id}/orders/{orderId}/expenses/', () => {
    createOrderExpense('42', 7, {
      type: 'DELIVERY',
      amount: '5.90',
      label: 'Colissimo',
    })
    expect(client.post).toHaveBeenCalledWith('/stores/42/orders/7/expenses/', {
      type: 'DELIVERY',
      amount: '5.90',
      label: 'Colissimo',
    })
  })

  it('updateOrderExpense calls PATCH /stores/{id}/orders/{orderId}/expenses/{expId}/', () => {
    updateOrderExpense('42', 7, 99, { amount: '6.50' })
    expect(client.patch).toHaveBeenCalledWith(
      '/stores/42/orders/7/expenses/99/',
      { amount: '6.50' },
    )
  })

  it('deleteOrderExpense calls DELETE /stores/{id}/orders/{orderId}/expenses/{expId}/', () => {
    deleteOrderExpense('42', 7, 99)
    expect(client.delete).toHaveBeenCalledWith(
      '/stores/42/orders/7/expenses/99/',
    )
  })

  it('updateOrderLineItem calls PATCH /stores/{id}/orders/{orderId}/line-items/{lineItemId}/', () => {
    updateOrderLineItem('42', 7, 3, { distributor_price: '12.50' })
    expect(client.patch).toHaveBeenCalledWith(
      '/stores/42/orders/7/line-items/3/',
      { distributor_price: '12.50' },
    )
  })

  it('updateOrderLineItem accepts null distributor_price', () => {
    updateOrderLineItem('42', 7, 3, { distributor_price: null })
    expect(client.patch).toHaveBeenCalledWith(
      '/stores/42/orders/7/line-items/3/',
      { distributor_price: null },
    )
  })
})
