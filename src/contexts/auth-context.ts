import { createContext } from 'react'
import type { AxiosResponse } from 'axios'

export interface AuthContextType {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AxiosResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)
export default AuthContext
