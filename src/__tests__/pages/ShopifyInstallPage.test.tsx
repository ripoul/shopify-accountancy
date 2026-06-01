import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api/stores', () => ({
  installStore: vi.fn(),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import ShopifyInstallPage from '../../pages/ShopifyInstallPage'
import { installStore } from '../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInstallStore = installStore as any

const WITH_PARAMS =
  '/shopify/install?shop=test.myshopify.com&hmac=abc&timestamp=123'

describe('ShopifyInstallPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows missing params warning when required query params are absent', () => {
    render(
      <MemoryRouter initialEntries={['/shopify/install']}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(/paramètres shopify manquants/i),
    ).toBeInTheDocument()
  })

  it('shows loading state when all required params are present', () => {
    mockInstallStore.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter initialEntries={[WITH_PARAMS]}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/connexion à shopify/i)).toBeInTheDocument()
  })

  it('redirects to authorization_url on successful install', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
    mockInstallStore.mockResolvedValue({
      data: { authorization_url: 'https://shopify.com/oauth' },
    })

    render(
      <MemoryRouter initialEntries={[WITH_PARAMS]}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(window.location.href).toBe('https://shopify.com/oauth')
    })
  })

  it('shows API error messages on installStore failure with response data', async () => {
    mockInstallStore.mockRejectedValue({
      response: { data: { shop: ['Domaine invalide.'] } },
    })
    render(
      <MemoryRouter initialEntries={[WITH_PARAMS]}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/domaine invalide/i)).toBeInTheDocument()
    })
  })

  it('shows generic error message when no response data', async () => {
    mockInstallStore.mockRejectedValue({})
    render(
      <MemoryRouter initialEntries={[WITH_PARAMS]}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(
        screen.getByText(/impossible d'initier l'installation/i),
      ).toBeInTheDocument()
    })
  })

  it('navigates home when back button is clicked on error state', async () => {
    mockInstallStore.mockRejectedValue({})
    render(
      <MemoryRouter initialEntries={[WITH_PARAMS]}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /retour/i }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('navigates home when back button is clicked on missing params state', () => {
    render(
      <MemoryRouter initialEntries={['/shopify/install']}>
        <ShopifyInstallPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
