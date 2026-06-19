import client from './client'

interface InstallParams {
  shop: string | null
  hmac: string | null
  host: string | null
  timestamp: string | null
  session: string | null
}

interface ConnectParams {
  shop: string | null
  code: string | null
  hmac: string | null
  host: string | null
  state: string | null
  timestamp: string | null
}

export const installStore = (params: InstallParams) =>
  client.get('/stores/install/', {
    params: {
      shop: params.shop,
      hmac: params.hmac,
      host: params.host,
      timestamp: params.timestamp,
      session: params.session,
    },
  })

export const connectStore = (params: ConnectParams) =>
  client.post('/stores/', {
    shop: params.shop,
    code: params.code,
    hmac: params.hmac,
    host: params.host,
    state: params.state,
    timestamp: params.timestamp,
  })

export const listStores = (page = 1) =>
  client.get('/stores/', { params: { page } })

export const getStore = (storeId: string) => client.get(`/stores/${storeId}/`)

export const updateStore = (storeId: string, data: { royalty_rate: string }) =>
  client.patch(`/stores/${storeId}/`, data)
