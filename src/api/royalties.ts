import client from './client'

export type RoyaltyUpdatePayload = {
  payment_date: string | null
  amount?: string
}

export const listRoyalties = (storeId: string, page = 1) =>
  client.get(`/stores/${storeId}/royalties/`, { params: { page } })

export const updateRoyalty = (
  storeId: string,
  royaltyId: number,
  data: RoyaltyUpdatePayload,
) => client.patch(`/stores/${storeId}/royalties/${royaltyId}/`, data)
