import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import LoginPage from '../../pages/LoginPage'
import { useAuth } from '../../contexts/useAuth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAuth = useAuth as any

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields with a submit button', () => {
    mockUseAuth.mockReturnValue({ login: vi.fn() })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /se connecter/i }),
    ).toBeInTheDocument()
  })

  it('shows success alert when location state has registered=true', () => {
    mockUseAuth.mockReturnValue({ login: vi.fn() })
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { registered: true } }]}
      >
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/compte créé avec succès/i)).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    mockUseAuth.mockReturnValue({ login: vi.fn().mockResolvedValue({}) })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('redirects to pending Shopify path after successful login', async () => {
    sessionStorage.setItem(
      'shopify_pending_params',
      '/shopify/callback?shop=test',
    )
    mockUseAuth.mockReturnValue({ login: vi.fn().mockResolvedValue({}) })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/shopify/callback?shop=test', {
        replace: true,
      })
      expect(sessionStorage.getItem('shopify_pending_params')).toBeNull()
    })
  })

  it('shows error from API detail on login failure', async () => {
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockRejectedValue({
        response: { data: { detail: 'Identifiants invalides' } },
      }),
    })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(screen.getByText('Identifiants invalides')).toBeInTheDocument()
    })
  })

  it('shows generic error message when API returns no detail', async () => {
    mockUseAuth.mockReturnValue({ login: vi.fn().mockRejectedValue({}) })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/email ou mot de passe incorrect/i),
      ).toBeInTheDocument()
    })
  })

  it('disables the submit button while loading', async () => {
    let resolveLogin: (value: unknown) => void
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve
    })
    mockUseAuth.mockReturnValue({
      login: vi.fn().mockReturnValue(loginPromise),
    })
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(screen.getByRole('button', { name: /connexion/i })).toBeDisabled()
    resolveLogin!({})
  })
})
