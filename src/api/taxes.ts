import client from './client'

export type TaxUpdatePayload = {
  payment_date: string | null
  amount?: string
}

export const listTaxes = (storeId: string, page = 1) =>
  client.get(`/stores/${storeId}/taxes/`, { params: { page } })

export const updateTax = (
  storeId: string,
  taxId: number,
  data: TaxUpdatePayload,
) => client.patch(`/stores/${storeId}/taxes/${taxId}/`, data)
