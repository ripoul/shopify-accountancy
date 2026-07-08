import { useTranslation } from 'react-i18next'
import type { LangCode } from './index'
import { formatCurrency, formatDate, formatPercent } from './format'

export const useFormatters = () => {
  const { i18n } = useTranslation()
  const lang = i18n.language as LangCode

  return {
    currency: (value: number | string, options?: Intl.NumberFormatOptions) =>
      formatCurrency(value, lang, options),
    date: (iso: string) => formatDate(iso, lang),
    percent: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercent(value, lang, options),
  }
}
