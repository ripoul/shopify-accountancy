import type { LangCode } from './index'

const INTL_LOCALE: Record<LangCode, string> = {
  fr_FR: 'fr-FR',
  en_US: 'en-US',
  en_GB: 'en-GB',
}

export const toIntlLocale = (lang: LangCode): string => INTL_LOCALE[lang]

export const formatCurrency = (
  value: number | string,
  lang: LangCode,
  options?: Intl.NumberFormatOptions,
): string =>
  new Intl.NumberFormat(toIntlLocale(lang), {
    style: 'currency',
    currency: 'EUR',
    ...options,
  }).format(typeof value === 'string' ? parseFloat(value) : value)

export const formatDate = (iso: string, lang: LangCode): string =>
  new Intl.DateTimeFormat(toIntlLocale(lang), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))

export const formatPercent = (
  value: number,
  lang: LangCode,
  options?: Intl.NumberFormatOptions,
): string =>
  new Intl.NumberFormat(toIntlLocale(lang), {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value)
