import client from './client'

export const importProducts = (storePk: string | number) =>
  client.post(`/stores/${storePk}/products/import_products/`)

export const listProducts = (storePk: string | number, page = 1) =>
  client.get(`/stores/${storePk}/products/`, { params: { page } })

export const listCollections = (storePk: string | number, page = 1) =>
  client.get(`/stores/${storePk}/products/collections/`, { params: { page } })

export const updateVariant = (
  storePk: string | number,
  variantPk: number,
  data: { distributor_price: string | null },
) => client.patch(`/stores/${storePk}/products/variants/${variantPk}/`, data)

export interface ProductStats {
  id: number
  external_id: string
  title: string
  total_sold: number
  net_gain: string
  net_gain_per_unit: string
  orders_containing: number
  occurrence_rate: string
}

export interface VariantStats {
  id: number
  external_id: string
  title: string
  product_title: string
  total_sold: number
  net_gain: string
  net_gain_per_unit: string
  orders_containing: number
  occurrence_rate: string
}

export interface StatsParams {
  name?: string
  collection?: number
}

export const getProductStats = (
  storePk: string | number,
  params?: StatsParams,
) =>
  client.get<ProductStats[]>(`/stores/${storePk}/stats/product-stats/`, {
    params,
  })

export const getVariantStats = (
  storePk: string | number,
  params?: StatsParams,
) =>
  client.get<VariantStats[]>(`/stores/${storePk}/stats/variant-stats/`, {
    params,
  })
