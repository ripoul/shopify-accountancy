import { describe, it, expect } from 'vitest'
import {
  toIntlLocale,
  formatCurrency,
  formatDate,
  formatPercent,
} from '../../i18n/format'

describe('toIntlLocale', () => {
  it('maps each supported language to its BCP-47 locale', () => {
    expect(toIntlLocale('fr_FR')).toBe('fr-FR')
    expect(toIntlLocale('en_US')).toBe('en-US')
    expect(toIntlLocale('en_GB')).toBe('en-GB')
  })
})

describe('formatCurrency', () => {
  it('formats fr_FR with comma decimal and thousands separator', () => {
    expect(formatCurrency(1234.56, 'fr_FR')).toBe('1 234,56 €')
  })

  it('formats en_US with period decimal', () => {
    expect(formatCurrency(1234.56, 'en_US')).toBe('€1,234.56')
  })

  it('accepts a string amount', () => {
    expect(formatCurrency('99.90', 'fr_FR')).toBe('99,90 €')
  })

  it('applies option overrides such as maximumFractionDigits', () => {
    expect(formatCurrency(99.9, 'fr_FR', { maximumFractionDigits: 0 })).toBe(
      '100 €',
    )
  })

  it('allows overriding the currency code', () => {
    expect(formatCurrency(10, 'en_US', { currency: 'USD' })).toBe('$10.00')
  })
})

describe('formatDate', () => {
  it('formats fr_FR as day/month/year', () => {
    expect(formatDate('2024-01-15', 'fr_FR')).toBe('15/01/2024')
  })

  it('formats en_US as month/day/year', () => {
    expect(formatDate('2024-01-15', 'en_US')).toBe('01/15/2024')
  })
})

describe('formatPercent', () => {
  it('formats fr_FR with a comma and a space before the sign', () => {
    expect(
      formatPercent(0.05, 'fr_FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe('5,00 %')
  })

  it('formats en_US with no space before the sign', () => {
    expect(
      formatPercent(0.05, 'en_US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe('5.00%')
  })

  it('supports signDisplay to add a + prefix for positive values', () => {
    expect(formatPercent(0.25, 'en_US', { signDisplay: 'exceptZero' })).toBe(
      '+25.0%',
    )
  })
})
