import { useState, useCallback, useEffect } from 'react'
import { login as apiLogin } from '../api/auth'
import { getProfile } from '../api/profile'
import i18n, { LANG_STORAGE_KEY } from '../i18n'
import AuthContext from './auth-context'

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem('access_token'),
  )

  useEffect(() => {
    if (!isAuthenticated) return
    getProfile()
      .then(({ data }) => {
        i18n.changeLanguage(data.lang)
        localStorage.setItem(LANG_STORAGE_KEY, data.lang)
      })
      .catch(() => {})
  }, [isAuthenticated])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    const { access, refresh } = response.data as {
      access: string
      refresh: string
    }
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    setIsAuthenticated(true)
    return response
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
