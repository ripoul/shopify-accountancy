import client from './client'

export const installStore = (params) =>
  client.get('/stores/install/', {
    params: {
      shop: params.shop,
      hmac: params.hmac,
      host: params.host,
      timestamp: params.timestamp,
      session: params.session,
    },
  })

export const connectStore = (params) =>
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
