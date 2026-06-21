import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/stores', () => ({
  getQuartersHistory: vi.fn(),
}))

vi.mock('@mui/x-charts/LineChart', () => ({
  LineChart: ({
    dataset,
    series,
  }: {
    dataset: unknown[]
    series: { label: string }[]
  }) => (
    <div
      data-testid="line-chart"
      data-points={dataset?.length}
      data-series={series?.map((s) => s.label).join(',')}
    />
  ),
}))

import StatsAllTimePage from '../../../pages/store/StatsAllTimePage'
import { getQuartersHistory } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetHistory = getQuartersHistory as any

const makeItem = (overrides = {}) => ({
  period: '2026/02',
  start_date: '2026-04-01',
  end_date: '2026-06-21',
  revenue: '10000.00',
  cash_variation: '1500.00',
  profit_before_tax: '3000.00',
  profit_after_tax: '2660.00',
  profit_after_tax_after_purchase: '2000.00',
  order_count: 100,
  average_profit_per_order: '26.60',
  average_basket: '100.00',
  is_current: true,
  ...overrides,
})

const makeHistory = (n = 3) => ({
  data: Array.from({ length: n }, (_, i) =>
    makeItem({
      period: `2025/${String(i + 1).padStart(2, '0')}`,
      is_current: i === n - 1,
    }),
  ),
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/stats/all-time']}>
      <Routes>
        <Route
          path="/store/:id/stats/all-time"
          element={<StatsAllTimePage />}
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

describe('StatsAllTimePage', () => {
  it('shows loading spinner initially', () => {
    mockGetHistory.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error alert when API fails', async () => {
    mockGetHistory.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger l'historique/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when API returns empty array', async () => {
    mockGetHistory.mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/aucune donnée disponible/i)).toBeInTheDocument()
    })
  })

  it('calls getQuartersHistory with the store id', async () => {
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledWith('1'))
  })

  it('renders the chart after load', async () => {
    mockGetHistory.mockResolvedValue(makeHistory(3))
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '3')
  })

  it('renders all 8 metric chips', async () => {
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('CA')).toBeInTheDocument()
    })
    expect(screen.getByText('Trésorerie')).toBeInTheDocument()
    expect(screen.getByText('Marge avant impôts')).toBeInTheDocument()
    expect(screen.getByText('Résultat net')).toBeInTheDocument()
    expect(screen.getByText('Résultat net (post-achats)')).toBeInTheDocument()
    expect(screen.getByText('Commandes')).toBeInTheDocument()
    expect(screen.getByText('Bénéfice / commande')).toBeInTheDocument()
    expect(screen.getByText('Panier moyen')).toBeInTheDocument()
  })

  it('default visible series are CA, Résultat net and Commandes', async () => {
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => {
      const chart = screen.getByTestId('line-chart')
      const series = chart.getAttribute('data-series') ?? ''
      expect(series).toContain('CA')
      expect(series).toContain('Résultat net')
      expect(series).toContain('Commandes')
    })
  })

  it('toggling a chip removes the series from the chart', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => screen.getByTestId('line-chart'))

    await user.click(screen.getByText('CA'))
    await waitFor(() => {
      const series =
        screen.getByTestId('line-chart').getAttribute('data-series') ?? ''
      expect(series).not.toContain('CA')
    })
  })

  it('toggling an inactive chip adds the series to the chart', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => screen.getByTestId('line-chart'))

    await user.click(screen.getByText('Trésorerie'))
    await waitFor(() => {
      const series =
        screen.getByTestId('line-chart').getAttribute('data-series') ?? ''
      expect(series).toContain('Trésorerie')
    })
  })

  it('shows alert when all chips are toggled off', async () => {
    const user = userEvent.setup()
    mockGetHistory.mockResolvedValue(makeHistory())
    renderPage()
    await waitFor(() => screen.getByTestId('line-chart'))

    await user.click(screen.getByText('CA'))
    await user.click(screen.getByText('Résultat net'))
    await user.click(screen.getByText('Commandes'))
    await waitFor(() => {
      expect(
        screen.getByText(/sélectionnez au moins une métrique/i),
      ).toBeInTheDocument()
    })
  })
})
