import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/useAuth'
import { updateProfile } from '../api/profile'
import { LANG_STORAGE_KEY, type LangCode } from './index'

export const useLanguage = () => {
  const { i18n } = useTranslation()
  const { isAuthenticated } = useAuth()

  const changeLanguage = useCallback(
    async (lang: LangCode) => {
      await i18n.changeLanguage(lang)
      localStorage.setItem(LANG_STORAGE_KEY, lang)
      if (isAuthenticated) {
        updateProfile(lang).catch(() => {})
      }
    },
    [i18n, isAuthenticated],
  )

  return { language: i18n.language as LangCode, changeLanguage }
}
