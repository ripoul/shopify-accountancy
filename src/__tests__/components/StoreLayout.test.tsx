import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import StoreLayout from '../../components/StoreLayout'
import { useAuth } from '../../contexts/useAuth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAuth = useAuth as any

const renderLayout = (path = '/store/1/stats/trimestre-actuel') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/store/:id/*" element={<StoreLayout />}>
          <Route path="*" element={<div>page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('StoreLayout', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ logout: vi.fn() })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders brand title', () => {
    renderLayout()
    expect(screen.getByText('Shopify Accountancy')).toBeInTheDocument()
  })

  it('renders "Mes boutiques" link back to /', () => {
    renderLayout()
    expect(
      screen.getByRole('link', { name: /mes boutiques/i }),
    ).toHaveAttribute('href', '/')
  })

  it('calls logout and navigates to /login when logout is clicked', () => {
    const mockLogout = vi.fn()
    mockUseAuth.mockReturnValue({ logout: mockLogout })
    renderLayout()
    fireEvent.click(screen.getByRole('button', { name: /se déconnecter/i }))
    expect(mockLogout).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('renders outlet content', () => {
    renderLayout()
    expect(screen.getByText('page content')).toBeInTheDocument()
  })

  it('shows Statistiques section in sidebar', () => {
    renderLayout()
    expect(screen.getByText('Statistiques')).toBeInTheDocument()
  })

  it('shows Config section in sidebar', () => {
    renderLayout()
    expect(screen.getByText('Config')).toBeInTheDocument()
  })

  it('Statistiques sub-items are visible by default', () => {
    renderLayout()
    expect(
      screen.getByRole('link', { name: 'Trimestre actuel' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Évolution par trimestre' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument()
  })

  it('Statistiques sub-items link to correct store paths', () => {
    renderLayout()
    expect(
      screen.getByRole('link', { name: 'Trimestre actuel' }),
    ).toHaveAttribute('href', '/store/1/stats/trimestre-actuel')
    expect(
      screen.getByRole('link', { name: 'Évolution par trimestre' }),
    ).toHaveAttribute('href', '/store/1/stats/all-time')
  })

  it('Config sub-items are hidden by default', () => {
    renderLayout()
    expect(
      screen.queryByRole('link', { name: 'Achat' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Caisse' }),
    ).not.toBeInTheDocument()
  })

  it('clicking Config expands its sub-items', () => {
    renderLayout()
    fireEvent.click(screen.getByText('Config'))
    expect(screen.getByRole('link', { name: 'Achat' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Commandes' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Bank Transactions' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Caisse' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Redevance' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Mouvements divers' }),
    ).not.toBeInTheDocument()
  })

  it('Config sub-items link to correct store paths', () => {
    renderLayout()
    fireEvent.click(screen.getByText('Config'))
    expect(screen.getByRole('link', { name: 'Achat' })).toHaveAttribute(
      'href',
      '/store/1/config/achat',
    )
    expect(screen.getByRole('link', { name: 'Redevance' })).toHaveAttribute(
      'href',
      '/store/1/config/redevance',
    )
  })

  it('clicking Statistiques collapses its sub-items', async () => {
    renderLayout()
    fireEvent.click(screen.getByText('Statistiques'))
    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'Trimestre actuel' }),
      ).not.toBeInTheDocument()
    })
  })

  it('clicking the menu icon toggles sidebar collapse', () => {
    renderLayout()
    // Sidebar is open by default — sub-item labels visible
    expect(screen.getByText('Statistiques')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    // After collapse, section label text is no longer rendered
    expect(screen.queryByText('Statistiques')).not.toBeInTheDocument()
  })
})
