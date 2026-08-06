import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/stores', () => ({
  getCurrentQuarterStats: vi.fn(),
  getTreasuryStats: vi.fn(),
  updateStore: vi.fn(),
}))

import StatsCurrentQuarterPage from '../../../pages/store/StatsCurrentQuarterPage'
import {
  getCurrentQuarterStats,
  getTreasuryStats,
  updateStore,
} from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetStats = getCurrentQuarterStats as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetTreasury = getTreasuryStats as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateStore = updateStore as any

const makeStats = (currentOverrides = {}, previousOverrides = {}) => ({
  data: {
    current_quarter: {
      period: '2026/02',
      start_date: '2026-04-01',
      end_date: '2026-06-19',
      revenue: '10000.00',
      cash_variation: '1500.00',
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
      cash_variation: '1200.00',
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

const makeTreasury = (overrides = {}) => ({
  data: {
    bank_amount: '800.00',
    cash_amount: '300.00',
    unpaid_taxes_amount: '100.00',
    unpaid_royalties_amount: '50.00',
    fixed_costs_reserve: '150.00',
    investable_amount: '500.00',
    ...overrides,
  },
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/stats/current-quarter']}>
      <Routes>
        <Route
          path="/store/:id/stats/current-quarter"
          element={<StatsCurrentQuarterPage />}
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTreasury.mockResolvedValue(makeTreasury())
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

  it('renders all 8 stat card labels', async () => {
    mockGetStats.mockResolvedValue(makeStats())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument()
      expect(screen.getByText('Variation de trésorerie')).toBeInTheDocument()
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
      const diffs = screen.getAllByText('+25,0 %')
      expect(diffs.length).toBeGreaterThan(0)
    })
  })

  it('shows negative diff without + prefix', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ order_count: 60 }, { order_count: 80 }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText('-25,0 %').length).toBeGreaterThan(0)
    })
  })

  it('shows exact current and previous quarter values in tooltip on hover', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ revenue: '10000.5' }, { revenue: '8000.25' }),
    )
    renderPage()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByText("Chiffre d'affaires")).toBeInTheDocument()
    })

    await user.hover(screen.getByText("Chiffre d'affaires"))

    expect(
      await screen.findByText('Trimestre actuel : 10 000,50 €'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Trimestre précédent : 8 000,25 €'),
    ).toBeInTheDocument()
  })

  it('shows exact order counts in tooltip on hover', async () => {
    mockGetStats.mockResolvedValue(
      makeStats({ order_count: 100 }, { order_count: 80 }),
    )
    renderPage()
    const user = userEvent.setup()
    await waitFor(() => {
      expect(screen.getByText('Nombre de commandes')).toBeInTheDocument()
    })

    await user.hover(screen.getByText('Nombre de commandes'))

    expect(
      await screen.findByText('Trimestre actuel : 100'),
    ).toBeInTheDocument()
    expect(screen.getByText('Trimestre précédent : 80')).toBeInTheDocument()
  })

  it('shows no diff when all previous values are zero', async () => {
    mockGetStats.mockResolvedValue(
      makeStats(
        { order_count: 10 },
        {
          revenue: '0.00',
          cash_variation: '0.00',
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

  describe('treasury section', () => {
    it('renders the treasury cards below the existing stats', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Trésorerie')).toBeInTheDocument()
      })
      expect(screen.getByText('Montant en banque')).toBeInTheDocument()
      expect(screen.getByText('Montant en caisse')).toBeInTheDocument()
      expect(screen.getByText('Reste à investir')).toBeInTheDocument()
      expect(screen.getByText('800,00 €')).toBeInTheDocument()
      expect(screen.getByText('300,00 €')).toBeInTheDocument()
      expect(screen.getByText('500,00 €')).toBeInTheDocument()
      expect(
        screen.queryByRole('img', { name: 'Le reste à investir est négatif' }),
      ).not.toBeInTheDocument()
    })

    it('shows a red badge when the investable amount is negative', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      mockGetTreasury.mockResolvedValue(
        makeTreasury({ investable_amount: '-200.00' }),
      )
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('-200,00 €')).toBeInTheDocument()
      })
      expect(
        screen.getByRole('img', { name: 'Le reste à investir est négatif' }),
      ).toBeInTheDocument()
    })

    it('shows the calculation breakdown on hover over the investable amount card', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => {
        expect(screen.getByText('Reste à investir')).toBeInTheDocument()
      })

      await user.hover(screen.getByText('Reste à investir'))

      expect(await screen.findByText('Banque : 800,00 €')).toBeInTheDocument()
      expect(
        screen.getByText('Impôts non payés : -100,00 €'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Redevances non payées : -50,00 €'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Réserve charges fixes : -150,00 €'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Reste à investir : 500,00 €'),
      ).toBeInTheDocument()
    })

    it('shows an error alert when treasury stats fail to load', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      mockGetTreasury.mockRejectedValue(new Error('network'))
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText('Impossible de charger les données de trésorerie.'),
        ).toBeInTheDocument()
      })
    })

    it('opens the reserve dialog prefilled with the current value', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => {
        expect(screen.getByText('Reste à investir')).toBeInTheDocument()
      })

      await user.click(
        screen.getByRole('button', {
          name: 'Modifier la réserve pour charges fixes',
        }),
      )

      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog).getByLabelText('Réserve pour charges fixes'),
      ).toHaveValue(150)
    })

    it('saves a new reserve value, closes the dialog and shows a success message', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      mockUpdateStore.mockResolvedValue({})
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => {
        expect(screen.getByText('Reste à investir')).toBeInTheDocument()
      })

      await user.click(
        screen.getByRole('button', {
          name: 'Modifier la réserve pour charges fixes',
        }),
      )
      const dialog = await screen.findByRole('dialog')
      const input = within(dialog).getByLabelText('Réserve pour charges fixes')
      await user.clear(input)
      await user.type(input, '2000')
      await user.click(
        within(dialog).getByRole('button', { name: 'Enregistrer' }),
      )

      await waitFor(() => {
        expect(mockUpdateStore).toHaveBeenCalledWith('1', {
          fixed_costs_reserve: '2000',
        })
      })
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(
        await screen.findByText('Réserve mise à jour.'),
      ).toBeInTheDocument()
      await waitFor(() => expect(mockGetTreasury).toHaveBeenCalledTimes(2))
    })

    it('shows an error inside the dialog when saving the reserve fails', async () => {
      mockGetStats.mockResolvedValue(makeStats())
      mockUpdateStore.mockRejectedValue(new Error('network'))
      renderPage()
      const user = userEvent.setup()
      await waitFor(() => {
        expect(screen.getByText('Reste à investir')).toBeInTheDocument()
      })

      await user.click(
        screen.getByRole('button', {
          name: 'Modifier la réserve pour charges fixes',
        }),
      )
      const dialog = await screen.findByRole('dialog')
      await user.click(
        within(dialog).getByRole('button', { name: 'Enregistrer' }),
      )

      expect(
        await within(dialog).findByText("L'enregistrement a échoué."),
      ).toBeInTheDocument()
    })
  })
})
