import client from './client'

export interface PurchasePayload {
  supplier: number
  order_number?: string
  order_date: string
  price: string
  is_raw_material?: boolean
  reception_date?: string | null
  reception_checked?: boolean
  has_supporting_documents?: boolean
  claim_text?: string | null
  claim_date?: string | null
  supplier_return_text?: string | null
  claim_closed_at?: string | null
}

export const listPurchases = (storePk: string | number, page = 1) =>
  client.get(`/stores/${storePk}/purchases/`, { params: { page } })

export const createPurchase = (
  storePk: string | number,
  data: PurchasePayload,
) => client.post(`/stores/${storePk}/purchases/`, data)

export const updatePurchase = (
  storePk: string | number,
  purchasePk: number,
  data: Partial<PurchasePayload>,
) => client.patch(`/stores/${storePk}/purchases/${purchasePk}/`, data)
