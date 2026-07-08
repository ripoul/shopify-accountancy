import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr_FR from './locales/fr_FR'
import en_US from './locales/en_US'
import en_GB from './locales/en_GB'

export type LangCode = 'fr_FR' | 'en_US' | 'en_GB'

export interface SupportedLanguage {
  code: LangCode
  label: string
  flag: string
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'fr_FR', label: 'Français', flag: '🇫🇷' },
  { code: 'en_US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en_GB', label: 'English (UK)', flag: '🇬🇧' },
]

export const LANG_STORAGE_KEY = 'lang'

const isLangCode = (value: string | null): value is LangCode =>
  SUPPORTED_LANGUAGES.some((lang) => lang.code === value)

const detectBrowserLanguage = (): LangCode => {
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('fr')) return 'fr_FR'
  if (browserLang === 'en-gb') return 'en_GB'
  if (browserLang.startsWith('en')) return 'en_US'
  return 'fr_FR'
}

export const detectInitialLanguage = (): LangCode => {
  if (import.meta.env.MODE === 'test') return 'fr_FR'
  const stored = localStorage.getItem(LANG_STORAGE_KEY)
  return isLangCode(stored) ? stored : detectBrowserLanguage()
}

i18n.use(initReactI18next).init({
  resources: {
    fr_FR: { translation: fr_FR },
    en_US: { translation: en_US },
    en_GB: { translation: en_GB },
  },
  lng: detectInitialLanguage(),
  fallbackLng: 'fr_FR',
  interpolation: { escapeValue: false },
})

export default i18n
