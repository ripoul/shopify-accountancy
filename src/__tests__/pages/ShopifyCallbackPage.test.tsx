import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api/stores', () => ({
  connectStore: vi.fn(),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import ShopifyCallbackPage from '../../pages/ShopifyCallbackPage'
import { connectStore } from '../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockConnectStore = connectStore as any

const FULL_PARAMS =
  '/shopify/callback?shop=test.myshopify.com&code=mycode&hmac=myhmac&host=myhost&state=mystate&timestamp=123'

describe('ShopifyCallbackPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows missing params warning when required query params are absent', () => {
    render(
      <MemoryRouter initialEntries={['/shopify/callback']}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    expect(
      screen.getByText(/paramètres shopify manquants/i),
    ).toBeInTheDocument()
  })

  it('shows loading state when all required params are present', () => {
    mockConnectStore.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/connexion de votre boutique/i)).toBeInTheDocument()
  })

  it('navigates to / with replace on successful connection', async () => {
    mockConnectStore.mockResolvedValue({})
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows API error messages on connectStore failure with response data', async () => {
    mockConnectStore.mockRejectedValue({
      response: { data: { hmac: ['HMAC invalide.'] } },
    })
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/hmac invalide/i)).toBeInTheDocument()
    })
  })

  it('shows generic error message when no response data', async () => {
    mockConnectStore.mockRejectedValue({})
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de connecter la boutique/i),
      ).toBeInTheDocument()
    })
  })

  it('navigates home when back button is clicked on error state', async () => {
    mockConnectStore.mockRejectedValue({})
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
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

  it('shows fallback message when response data has no messages', async () => {
    mockConnectStore.mockRejectedValue({
      response: { data: { errors: [] } },
    })
    render(
      <MemoryRouter initialEntries={[FULL_PARAMS]}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument()
    })
  })

  it('navigates home when back button is clicked on missing params state', () => {
    render(
      <MemoryRouter initialEntries={['/shopify/callback']}>
        <ShopifyCallbackPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /retour/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
