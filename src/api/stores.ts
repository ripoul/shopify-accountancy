import client from './client'

export interface QuarterStats {
  period: string
  start_date: string
  end_date: string
  revenue: string
  profit_before_tax: string
  profit_after_tax: string
  profit_after_tax_after_purchase: string
  order_count: number
  average_profit_per_order: string
  average_basket: string
}

export interface DashboardStats {
  current_quarter: QuarterStats
  previous_quarter: QuarterStats
}

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

export const getCurrentQuarterStats = (storeId: string) =>
  client.get<DashboardStats>(`/stores/${storeId}/stats/current-quarter/`)
