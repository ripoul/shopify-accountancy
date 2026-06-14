import client from './client'

export const listOrders = (storeId: string, page = 1) =>
  client.get(`/stores/${storeId}/orders/`, { params: { page } })

export const getOrder = (storeId: string, orderId: number) =>
  client.get(`/stores/${storeId}/orders/${orderId}/`)

export const importOrders = (storeId: string) =>
  client.post(`/stores/${storeId}/orders/import_orders/`)

export const reimportOrder = (storeId: string, externalId: string) =>
  client.post(`/stores/${storeId}/orders/import_orders/`, {
    external_id: externalId,
  })

export const createOrderExpense = (
  storeId: string,
  orderId: number,
  data: { type: string; amount: string; label: string },
) => client.post(`/stores/${storeId}/orders/${orderId}/expenses/`, data)

export const updateOrderExpense = (
  storeId: string,
  orderId: number,
  expenseId: number,
  data: { type?: string; amount?: string; label?: string },
) =>
  client.patch(
    `/stores/${storeId}/orders/${orderId}/expenses/${expenseId}/`,
    data,
  )

export const deleteOrderExpense = (
  storeId: string,
  orderId: number,
  expenseId: number,
) =>
  client.delete(`/stores/${storeId}/orders/${orderId}/expenses/${expenseId}/`)

export const updateOrderLineItem = (
  storeId: string,
  orderId: number,
  lineItemId: number,
  data: { distributor_price: string | null },
) =>
  client.patch(
    `/stores/${storeId}/orders/${orderId}/line-items/${lineItemId}/`,
    data,
  )
