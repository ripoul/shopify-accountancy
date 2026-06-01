import { useContext } from 'react'
import AuthContext from './auth-context'
import type { AuthContextType } from './auth-context'

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
