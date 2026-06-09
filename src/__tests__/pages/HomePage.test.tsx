import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api/stores', () => ({
  listStores: vi.fn(),
}))

import HomePage from '../../pages/HomePage'
import { listStores } from '../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListStores = listStores as any

describe('HomePage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    mockListStores.mockReturnValue(new Promise(() => {}))
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error message when API call fails', async () => {
    mockListStores.mockRejectedValue(new Error('network error'))
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les boutiques/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state message when no stores', async () => {
    mockListStores.mockResolvedValue({ data: { results: [] } })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/aucune boutique connectée/i)).toBeInTheDocument()
    })
  })

  it('renders store cards when stores are returned', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            name: 'My Store',
            shop_domain: 'mystore.myshopify.com',
            scopes: 'read_orders,write_products',
          },
        ],
      },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('My Store')).toBeInTheDocument()
      expect(screen.getByText('mystore.myshopify.com')).toBeInTheDocument()
      expect(screen.getByText('read_orders')).toBeInTheDocument()
      expect(screen.getByText('write_products')).toBeInTheDocument()
    })
  })

  it('renders store card without scopes section when scopes are absent', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [
          {
            id: 2,
            name: 'Store No Scopes',
            shop_domain: 'noscopes.myshopify.com',
          },
        ],
      },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Store No Scopes')).toBeInTheDocument()
    })
  })

  it('store card links to /store/:id', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [
          { id: 42, name: 'My Store', shop_domain: 'mystore.myshopify.com' },
        ],
      },
    })
    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => screen.getByText('My Store'))
    expect(container.querySelector('a[href="/store/42"]')).toBeInTheDocument()
  })

  it('renders multiple store cards', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            name: 'Store A',
            shop_domain: 'a.myshopify.com',
            scopes: 'read_orders',
          },
          { id: 2, name: 'Store B', shop_domain: 'b.myshopify.com' },
        ],
      },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Store A')).toBeInTheDocument()
      expect(screen.getByText('Store B')).toBeInTheDocument()
    })
  })
})
