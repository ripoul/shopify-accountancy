import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectInitialLanguage,
  LANG_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from '../../i18n'

const setBrowserLanguage = (lang: string) => {
  Object.defineProperty(window.navigator, 'language', {
    value: lang,
    configurable: true,
  })
}

describe('SUPPORTED_LANGUAGES', () => {
  it('lists the 3 backend-supported language codes', () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual([
      'fr_FR',
      'en_US',
      'en_GB',
    ])
  })
})

describe('detectInitialLanguage', () => {
  const originalLanguage = window.navigator.language

  beforeEach(() => {
    vi.stubEnv('MODE', 'development')
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    setBrowserLanguage(originalLanguage)
  })

  it('returns fr_FR in test mode regardless of other signals', () => {
    vi.stubEnv('MODE', 'test')
    localStorage.setItem(LANG_STORAGE_KEY, 'en_US')
    setBrowserLanguage('en-US')
    expect(detectInitialLanguage()).toBe('fr_FR')
  })

  it('returns the stored language when valid', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en_GB')
    expect(detectInitialLanguage()).toBe('en_GB')
  })

  it('ignores an invalid stored value and falls back to browser detection', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'de_DE')
    setBrowserLanguage('fr-FR')
    expect(detectInitialLanguage()).toBe('fr_FR')
  })

  it('detects French from the browser', () => {
    setBrowserLanguage('fr-BE')
    expect(detectInitialLanguage()).toBe('fr_FR')
  })

  it('detects British English from the browser', () => {
    setBrowserLanguage('en-GB')
    expect(detectInitialLanguage()).toBe('en_GB')
  })

  it('detects other English variants as en_US', () => {
    setBrowserLanguage('en-US')
    expect(detectInitialLanguage()).toBe('en_US')
  })

  it('falls back to fr_FR for unsupported languages', () => {
    setBrowserLanguage('de-DE')
    expect(detectInitialLanguage()).toBe('fr_FR')
  })
})
