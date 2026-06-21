import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/products', () => ({
  getProductStats: vi.fn(),
  getVariantStats: vi.fn(),
  listCollections: vi.fn(),
}))

import StatsProductsPage from '../../../pages/store/StatsProductsPage'
import {
  getProductStats,
  getVariantStats,
  listCollections,
} from '../../../api/products'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetProductStats = getProductStats as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetVariantStats = getVariantStats as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListCollections = listCollections as any

const makeProduct = (overrides = {}) => ({
  id: 1,
  external_id: 'gid://shopify/Product/1',
  title: 'T-shirt bleu',
  total_sold: 42,
  net_gain: '420.00',
  net_gain_per_unit: '10.00',
  orders_containing: 38,
  occurrence_rate: '0.0500',
  ...overrides,
})

const makeVariant = (overrides = {}) => ({
  id: 10,
  external_id: 'gid://shopify/ProductVariant/10',
  title: 'M / Bleu',
  product_title: 'T-shirt bleu',
  total_sold: 20,
  net_gain: '200.00',
  net_gain_per_unit: '10.00',
  orders_containing: 18,
  occurrence_rate: '0.0250',
  ...overrides,
})

const makeCollection = (overrides = {}) => ({
  id: 1,
  external_id: 'col1',
  title: 'Vêtements',
  ...overrides,
})

const noCollections = { data: { results: [], next: null } }

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/stats/products']}>
      <Routes>
        <Route
          path="/store/:id/stats/products"
          element={<StatsProductsPage />}
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  mockGetVariantStats.mockReturnValue(new Promise(() => {}))
  mockListCollections.mockResolvedValue(noCollections)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('StatsProductsPage', () => {
  describe('loading / error / empty states', () => {
    it('shows loading spinner initially', () => {
      mockGetProductStats.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows error alert when product API fails', async () => {
      mockGetProductStats.mockRejectedValue(new Error('network'))
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/impossible de charger les statistiques produits/i),
        ).toBeInTheDocument()
      })
    })

    it('shows empty state when API returns empty array', async () => {
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/aucune donnée disponible/i),
        ).toBeInTheDocument()
      })
    })
  })

  describe('initial API call', () => {
    it('calls getProductStats with store id and no filters on mount', async () => {
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() =>
        expect(mockGetProductStats).toHaveBeenCalledWith('1', {}),
      )
    })

    it('does not include name or collection params when filters are empty', async () => {
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() => expect(mockGetProductStats).toHaveBeenCalledOnce())
      const [, params] = mockGetProductStats.mock.calls[0]
      expect(params).not.toHaveProperty('name')
      expect(params).not.toHaveProperty('collection')
    })
  })

  describe('product mode rendering', () => {
    it('renders product rows', async () => {
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() =>
        expect(screen.getByText('T-shirt bleu')).toBeInTheDocument(),
      )
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('all columns are sortable', async () => {
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() => screen.getByText('T-shirt bleu'))
      expect(screen.getByRole('button', { name: /nom/i })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /qté vendue/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /gain net/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /gain \/ unité/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /nb commandes/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /taux/i })).toBeInTheDocument()
    })

    it('formats occurrence_rate as percentage', async () => {
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('5.00 %')).toBeInTheDocument()
      })
    })
  })

  describe('variant mode rendering', () => {
    it('calls getVariantStats with no filters after switching mode', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({ data: [] })
      mockGetVariantStats.mockResolvedValue({ data: [makeVariant()] })
      renderPage()
      await waitFor(() => screen.getByText(/aucune donnée disponible/i))

      await user.click(screen.getByRole('button', { name: /variante/i }))
      await waitFor(() =>
        expect(mockGetVariantStats).toHaveBeenCalledWith('1', {}),
      )
    })

    it('renders Produit column in variant mode', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({ data: [] })
      mockGetVariantStats.mockResolvedValue({ data: [makeVariant()] })
      renderPage()
      await waitFor(() => screen.getByText(/aucune donnée disponible/i))

      await user.click(screen.getByRole('button', { name: /variante/i }))
      await waitFor(() => screen.getByText('M / Bleu'))

      const headers = screen
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
      expect(headers.some((h) => h?.includes('Produit'))).toBe(true)
      expect(headers.some((h) => h?.includes('Variante'))).toBe(true)

      const dataRows = screen.getAllByRole('row').slice(1)
      expect(within(dataRows[0]).getByText('T-shirt bleu')).toBeInTheDocument()
      expect(within(dataRows[0]).getByText('M / Bleu')).toBeInTheDocument()
    })
  })

  describe('collection chips', () => {
    it('renders chips for each loaded collection', async () => {
      mockListCollections.mockResolvedValue({
        data: {
          results: [
            makeCollection({ id: 1, title: 'Vêtements' }),
            makeCollection({ id: 2, title: 'Nouveautés' }),
          ],
          next: null,
        },
      })
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Vêtements' }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Nouveautés' }),
        ).toBeInTheDocument()
      })
    })

    it('does not render chips when collections list is empty', async () => {
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => screen.getByText(/aucune donnée disponible/i))
      expect(
        screen.queryAllByRole('button', { name: /vêtements/i }),
      ).toHaveLength(0)
    })

    it('calls API with collection id when a chip is clicked', async () => {
      const user = userEvent.setup()
      mockListCollections.mockResolvedValue({
        data: {
          results: [makeCollection({ id: 5, title: 'Soldés' })],
          next: null,
        },
      })
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: 'Soldés' }))

      mockGetProductStats.mockClear()
      await user.click(screen.getByRole('button', { name: 'Soldés' }))
      await waitFor(() =>
        expect(mockGetProductStats).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ collection: 5 }),
        ),
      )
    })

    it('deselects collection (removes param) on second chip click', async () => {
      const user = userEvent.setup()
      mockListCollections.mockResolvedValue({
        data: {
          results: [makeCollection({ id: 5, title: 'Soldés' })],
          next: null,
        },
      })
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: 'Soldés' }))

      const chip = screen.getByRole('button', { name: 'Soldés' })
      await user.click(chip)
      await waitFor(() =>
        expect(mockGetProductStats).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ collection: 5 }),
        ),
      )

      mockGetProductStats.mockClear()
      await user.click(chip)
      await waitFor(() =>
        expect(mockGetProductStats).toHaveBeenCalledWith('1', {}),
      )
    })

    it('resets selected collection when switching mode', async () => {
      const user = userEvent.setup()
      mockListCollections.mockResolvedValue({
        data: {
          results: [makeCollection({ id: 5, title: 'Soldés' })],
          next: null,
        },
      })
      mockGetProductStats.mockResolvedValue({ data: [] })
      mockGetVariantStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: 'Soldés' }))

      await user.click(screen.getByRole('button', { name: 'Soldés' }))
      await waitFor(() =>
        expect(mockGetProductStats).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({ collection: 5 }),
        ),
      )

      mockGetVariantStats.mockClear()
      await user.click(screen.getByRole('button', { name: /variante/i }))
      await waitFor(() =>
        expect(mockGetVariantStats).toHaveBeenCalledWith('1', {}),
      )
    })

    it('loads multiple pages of collections', async () => {
      mockListCollections
        .mockResolvedValueOnce({
          data: {
            results: [makeCollection({ id: 1, title: 'Vêtements' })],
            next: '/page2',
          },
        })
        .mockResolvedValueOnce({
          data: {
            results: [makeCollection({ id: 2, title: 'Nouveautés' })],
            next: null,
          },
        })
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Vêtements' }),
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Nouveautés' }),
        ).toBeInTheDocument()
      })
    })
  })

  describe('server-side name search (debounce)', () => {
    it('calls API with name param after debounce', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => expect(mockGetProductStats).toHaveBeenCalledOnce())

      mockGetProductStats.mockClear()
      await user.type(
        screen.getByPlaceholderText(/rechercher par nom/i),
        'shirt',
      )

      await waitFor(
        () =>
          expect(mockGetProductStats).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({ name: 'shirt' }),
          ),
        { timeout: 1000 },
      )
    })

    it('resets search and refetches when switching mode', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({ data: [] })
      mockGetVariantStats.mockResolvedValue({ data: [] })
      renderPage()
      await waitFor(() => expect(mockGetProductStats).toHaveBeenCalledOnce())

      await user.type(
        screen.getByPlaceholderText(/rechercher par nom/i),
        'shirt',
      )
      await waitFor(
        () =>
          expect(mockGetProductStats).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({ name: 'shirt' }),
          ),
        { timeout: 1000 },
      )

      mockGetVariantStats.mockClear()
      await user.click(screen.getByRole('button', { name: /variante/i }))
      await waitFor(() =>
        expect(mockGetVariantStats).toHaveBeenCalledWith('1', {}),
      )
      expect(screen.getByPlaceholderText(/rechercher par nom/i)).toHaveValue('')
    })
  })

  describe('client-side sort', () => {
    it('sorts alphabetically ascending by default', async () => {
      mockGetProductStats.mockResolvedValue({
        data: [
          makeProduct({ id: 2, title: 'Zèbre' }),
          makeProduct({ id: 1, title: 'Alpha' }),
        ],
      })
      renderPage()
      await waitFor(() => screen.getByText('Alpha'))
      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('Alpha')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Zèbre')).toBeInTheDocument()
    })

    it('sorts by total_sold descending on two clicks', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({
        data: [
          makeProduct({ id: 1, title: 'A', total_sold: 10 }),
          makeProduct({ id: 2, title: 'B', total_sold: 50 }),
          makeProduct({ id: 3, title: 'C', total_sold: 30 }),
        ],
      })
      renderPage()
      await waitFor(() => screen.getByText('A'))

      const sortBtn = screen.getByRole('button', { name: /qté vendue/i })
      await user.click(sortBtn) // asc
      await user.click(sortBtn) // desc

      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('B')).toBeInTheDocument()
      expect(within(rows[1]).getByText('C')).toBeInTheDocument()
      expect(within(rows[2]).getByText('A')).toBeInTheDocument()
    })

    it('sorts by net_gain ascending', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({
        data: [
          makeProduct({ id: 1, title: 'A', net_gain: '300.00' }),
          makeProduct({ id: 2, title: 'B', net_gain: '100.00' }),
        ],
      })
      renderPage()
      await waitFor(() => screen.getByText('A'))

      await user.click(screen.getByRole('button', { name: /gain net/i }))

      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('B')).toBeInTheDocument()
      expect(within(rows[1]).getByText('A')).toBeInTheDocument()
    })

    it('does not trigger an API call when clicking a sort column', async () => {
      const user = userEvent.setup()
      mockGetProductStats.mockResolvedValue({ data: [makeProduct()] })
      renderPage()
      await waitFor(() => screen.getByText('T-shirt bleu'))

      mockGetProductStats.mockClear()
      await user.click(screen.getByRole('button', { name: /qté vendue/i }))

      // Small wait to confirm no API call is made
      await new Promise((r) => setTimeout(r, 100))
      expect(mockGetProductStats).not.toHaveBeenCalled()
    })
  })
})
