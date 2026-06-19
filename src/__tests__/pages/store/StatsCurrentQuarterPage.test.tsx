import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/stores', () => ({
  getCurrentQuarterStats: vi.fn(),
}))

import StatsCurrentQuarterPage from '../../../pages/store/StatsCurrentQuarterPage'
import { getCurrentQuarterStats } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetStats = getCurrentQuarterStats as any

const makeStats = (currentOverrides = {}, previousOverrides = {}) => ({
  data: {
    current_quarter: {
      period: '2026/02',
      start_date: '2026-04-01',
      end_date: '2026-06-19',
      revenue: '10000.00',
      profit_before_tax: '3000.00',
      profit_after_tax: '2660.00',
      profit_after_tax_after_purchase: '2000.00',
      order_count: 100,
      average_profit_per_order: '26.60',
      average_basket: '100.00',
      ...currentOverrides,
    },
    previous_quarter: {
      period: '2026/01',
      start_date: '2026-01-01',
      end_date: '2026-03-19',
      revenue: '8000.00',
      profit_before_tax: '2400.00',
      profit_after_tax: '2128.00',
      profit_after_tax_after_purchase: '1600.00',
      order_count: 80,
      average_profit_per_order: '26.60',
      average_basket: '100.00',
      ...previousOverrides,
    },
  },
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/stats/trimestre-actuel']}>
      <Routes>
        <Route
          path="/store/:id/stats/trimestre-actuel"
          element={<StatsCurrentQuarterPage />}
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('StatsCurrentQuarterPage', () => {
  it('shows loading spinner initially', () => {
    mockGetStats.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error alert when API fails', async () => {
    mockGetStats.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les statistiques/i),
      ).toBeInTheDocument()
    })
  })

  it('calls getCurrentQuarterStats with the store id', async () => {
    mockGetStats.mockResolvedValue(makeStats())
    renderPage()
    await waitFor(() => expect(mockGetStats).toHaveBeenCalledWith('1'))
  })

  it('renders period info after load', async () => {
    mockGetStats.mockResolvedValue(makeStats())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/2026\/02/)).toBeInTheDocument()
    })
  })

  it('renders all 7 stat card labels', async () => {
    mockGetStats.mockResolvedValue(makeStats())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument()
      expect(screen.getByText('Marge avant impôts')).toBeInTheDocument()
      expect(screen.getByText('Résultat après impôts')).toBeInTheDocument()
      expect(
        screen.getByText('Résultat après impôts et achats'),
      ).toBeInTheDocument()
      expect(screen.getByText('Nombre de commandes')).toBeInTheDocument()
      expect(screen.getByText('Bénéfice moyen / commande')).toBeInTheDocument()
      expect(screen.getByText('Panier moyen')).toBeInTheDocument()
    })
  })

  it('renders order_count as plain number', async () => {
    mockGetStats.mockResolvedValue(makeStats({ order_count: 42 }))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  it('shows positive diff with + prefix', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ order_count: 100 }, { order_count: 80 }),
    )
    renderPage()
    await waitFor(() => {
      const diffs = screen.getAllByText('+25.0%')
      expect(diffs.length).toBeGreaterThan(0)
    })
  })

  it('shows negative diff without + prefix', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ order_count: 60 }, { order_count: 80 }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('-25.0%').length).toBeGreaterThan(0)
    })
  })

  it('shows no diff when all previous values are zero', async () => {
    mockGetStats.mockResolvedValue(
      makeStats(
        { order_count: 10 },
        {
          revenue: '0.00',
          profit_before_tax: '0.00',
          profit_after_tax: '0.00',
          profit_after_tax_after_purchase: '0.00',
          order_count: 0,
          average_profit_per_order: '0.00',
          average_basket: '0.00',
        },
      ),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })
})
