import client from './client'

export const listSuppliers = (storePk: string | number, page = 1) =>
  client.get(`/stores/${storePk}/suppliers/`, { params: { page } })

export const createSupplier = (
  storePk: string | number,
  data: { name: string },
) => client.post(`/stores/${storePk}/suppliers/`, data)
