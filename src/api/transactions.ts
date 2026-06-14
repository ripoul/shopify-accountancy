import client from './client'

export type CashTransactionCreatePayload = {
  source: 'WITHDRAW_MONEY' | 'OTHER'
  title: string
  date: string
  amount: string
}

export type BankTransactionCreatePayload = {
  source: 'FILL_CASHBOX' | 'OTHER'
  title: string
  date: string
  amount: string
}

export type TransactionUpdatePayload = {
  title: string
  date: string
  amount: string
}

export const listBankTransactions = (storeId: string, page = 1) =>
  client.get(`/stores/${storeId}/bank-transactions/`, { params: { page } })

export const listCashTransactions = (storeId: string, page = 1) =>
  client.get(`/stores/${storeId}/cash-transactions/`, { params: { page } })

export const createCashTransaction = (
  storeId: string,
  data: CashTransactionCreatePayload,
) => client.post(`/stores/${storeId}/cash-transactions/`, data)

export const updateCashTransaction = (
  storeId: string,
  txId: number,
  data: TransactionUpdatePayload,
) => client.patch(`/stores/${storeId}/cash-transactions/${txId}/`, data)

export const createBankTransaction = (
  storeId: string,
  data: BankTransactionCreatePayload,
) => client.post(`/stores/${storeId}/bank-transactions/`, data)

export const updateBankTransaction = (
  storeId: string,
  txId: number,
  data: TransactionUpdatePayload,
) => client.patch(`/stores/${storeId}/bank-transactions/${txId}/`, data)
