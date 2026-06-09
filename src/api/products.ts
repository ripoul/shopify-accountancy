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
