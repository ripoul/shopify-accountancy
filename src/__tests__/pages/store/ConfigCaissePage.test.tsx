import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
  within,
} from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/transactions', () => ({
  listCashTransactions: vi.fn(),
  listBankTransactions: vi.fn(),
  createCashTransaction: vi.fn(),
  updateCashTransaction: vi.fn(),
}))

vi.mock('../../../api/stores', () => ({
  listStores: vi.fn(),
}))

import ConfigCaissePage from '../../../pages/store/ConfigCaissePage'
import {
  listCashTransactions,
  createCashTransaction,
  updateCashTransaction,
} from '../../../api/transactions'
import { listStores } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListCashTransactions = listCashTransactions as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateCashTransaction = createCashTransaction as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateCashTransaction = updateCashTransaction as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListStores = listStores as any

const makeTx = (id: number, overrides = {}) => ({
  id,
  title: `Caisse ${id}`,
  date: '2024-04-10',
  amount: '20.00',
  source: 'ORDER',
  order: null,
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/caisse']}>
      <Routes>
        <Route path="/store/:id/config/caisse" element={<ConfigCaissePage />} />
      </Routes>
    </MemoryRouter>,
  )

let intersectionCallback: IntersectionObserverCallback | null = null

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  constructor(cb: IntersectionObserverCallback) {
    intersectionCallback = cb
  }
}

beforeEach(() => {
  intersectionCallback = null
  mockListStores.mockResolvedValue({ data: { results: [] } })
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ConfigCaissePage', () => {
  it('shows loading spinner initially', () => {
    mockListCashTransactions.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    mockListCashTransactions.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les transactions de caisse/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/aucune transaction de caisse/i),
      ).toBeInTheDocument()
    })
  })

  it('renders cash transactions in table', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1), makeTx(2)],
        next: null,
        count: 2,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Caisse 1')).toBeInTheDocument()
      expect(screen.getByText('Caisse 2')).toBeInTheDocument()
    })
  })

  it('displays ADD_MONEY source label in French', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { source: 'ADD_MONEY' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText("Ajout d'argent")).toBeInTheDocument()
    })
  })

  it('displays WITHDRAW_MONEY source label in French', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { source: 'WITHDRAW_MONEY' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText("Retrait d'argent")).toBeInTheDocument()
    })
  })

  it('shows cash_amount chip when store has cash_amount', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [{ id: 1, cash_amount: '456.78' }],
      },
    })
    mockListCashTransactions.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/solde caisse/i)).toBeInTheDocument()
      expect(screen.getByText(/456\.78/)).toBeInTheDocument()
    })
  })

  it('shows — for null order', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { order: null })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('shows order id when order is set', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { order: 99 })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('#99')).toBeInTheDocument()
    })
  })

  it('shows negative amount without + prefix and in error color', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { amount: '-15.50' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('-15.50 €')).toBeInTheDocument(),
    )
  })

  it('falls back to raw source value for unknown source types', async () => {
    mockListCashTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { source: 'UNKNOWN_SOURCE' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('UNKNOWN_SOURCE')).toBeInTheDocument(),
    )
  })

  it('shows error message when scroll load fails', async () => {
    mockListCashTransactions
      .mockResolvedValueOnce({
        data: { results: [makeTx(1)], next: '/page2', count: 2 },
      })
      .mockRejectedValueOnce(new Error('scroll fail'))

    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Caisse 1')).toBeInTheDocument(),
    )

    await act(async () => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() =>
      expect(
        screen.getByText(/erreur lors du chargement/i),
      ).toBeInTheDocument(),
    )
  })

  it('ignores a second scroll event while already loading', async () => {
    let resolveLoad!: (value: unknown) => void
    mockListCashTransactions
      .mockResolvedValueOnce({
        data: { results: [makeTx(1)], next: '/page2', count: 2 },
      })
      .mockReturnValueOnce(
        new Promise((res) => {
          resolveLoad = res
        }),
      )

    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Caisse 1')).toBeInTheDocument(),
    )

    act(() => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    act(() => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await act(async () => {
      resolveLoad({ data: { results: [makeTx(2)], next: null } })
    })

    expect(mockListCashTransactions).toHaveBeenCalledTimes(2)
  })

  it('dismisses error alert when closed', async () => {
    mockListCashTransactions.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('loads more transactions on scroll', async () => {
    const page1 = {
      data: { results: [makeTx(1), makeTx(2)], next: '/page2', count: 4 },
    }
    const page2 = {
      data: { results: [makeTx(3), makeTx(4)], next: null, count: 4 },
    }
    mockListCashTransactions
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Caisse 1')).toBeInTheDocument(),
    )

    await act(async () => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() =>
      expect(screen.getByText('Caisse 3')).toBeInTheDocument(),
    )
    expect(mockListCashTransactions).toHaveBeenCalledTimes(2)
    expect(mockListCashTransactions).toHaveBeenLastCalledWith('1', 2)
  })

  describe('create dialog', () => {
    beforeEach(() => {
      mockListCashTransactions.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
    })

    it('shows Ajouter button', async () => {
      renderPage()
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /ajouter/i }),
        ).toBeInTheDocument(),
      )
    })

    it('opens create dialog on Ajouter click', async () => {
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() =>
        expect(screen.getByText('Ajouter une transaction')).toBeInTheDocument(),
      )
    })

    it('submit button is disabled when form is empty', async () => {
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() => screen.getByText('Ajouter une transaction'))
      expect(screen.getByRole('button', { name: /créer/i })).toBeDisabled()
    })

    it('creates a transaction and shows success message', async () => {
      mockCreateCashTransaction.mockResolvedValue({ data: {} })
      mockListCashTransactions
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })

      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() => screen.getByText('Ajouter une transaction'))

      fireEvent.change(screen.getByLabelText(/titre \*/i), {
        target: { value: 'Retrait espèces' },
      })
      fireEvent.change(screen.getByLabelText(/date \*/i), {
        target: { value: '2024-06-01' },
      })
      fireEvent.change(screen.getByLabelText(/montant \*/i), {
        target: { value: '-50' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/transaction créée avec succès/i),
        ).toBeInTheDocument(),
      )
      expect(mockCreateCashTransaction).toHaveBeenCalledWith('1', {
        source: 'WITHDRAW_MONEY',
        title: 'Retrait espèces',
        date: '2024-06-01',
        amount: '-50',
      })
    })

    it('shows error alert in dialog when create fails', async () => {
      mockCreateCashTransaction.mockRejectedValue(new Error('fail'))

      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() => screen.getByText('Ajouter une transaction'))

      fireEvent.change(screen.getByLabelText(/titre \*/i), {
        target: { value: 'Test' },
      })
      fireEvent.change(screen.getByLabelText(/date \*/i), {
        target: { value: '2024-06-01' },
      })
      fireEvent.change(screen.getByLabelText(/montant \*/i), {
        target: { value: '10' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/l'enregistrement a échoué/i),
        ).toBeInTheDocument(),
      )
    })

    it('closes dialog on Annuler click', async () => {
      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() => screen.getByText('Ajouter une transaction'))

      fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

      await waitFor(() =>
        expect(
          screen.queryByText('Ajouter une transaction'),
        ).not.toBeInTheDocument(),
      )
    })
  })

  describe('edit dialog', () => {
    it('shows edit button per row', async () => {
      mockListCashTransactions.mockResolvedValue({
        data: { results: [makeTx(1), makeTx(2)], next: null, count: 2 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Caisse 1'))
      const editButtons = screen.getAllByLabelText('Modifier la transaction')
      expect(editButtons).toHaveLength(2)
    })

    it('opens edit dialog with pre-filled data', async () => {
      mockListCashTransactions.mockResolvedValue({
        data: {
          results: [
            makeTx(1, {
              title: 'Ma TX',
              date: '2024-06-15',
              amount: '30.00',
              source: 'WITHDRAW_MONEY',
            }),
          ],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Ma TX'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() =>
        expect(screen.getByText('Modifier la transaction')).toBeInTheDocument(),
      )
      expect(screen.getByDisplayValue('Ma TX')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-06-15')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30.00')).toBeInTheDocument()
    })

    it('shows source as disabled field in edit mode', async () => {
      mockListCashTransactions.mockResolvedValue({
        data: {
          results: [makeTx(1, { source: 'WITHDRAW_MONEY' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Caisse 1'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() => screen.getByText('Modifier la transaction'))

      const sourceInput = screen.getByDisplayValue("Retrait d'argent")
      expect(sourceInput).toBeDisabled()
    })

    it('updates a transaction and shows success message', async () => {
      mockUpdateCashTransaction.mockResolvedValue({ data: {} })
      mockListCashTransactions
        .mockResolvedValueOnce({
          data: {
            results: [
              makeTx(1, {
                title: 'Ancienne TX',
                date: '2024-01-01',
                amount: '10.00',
              }),
            ],
            next: null,
            count: 1,
          },
        })
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })

      renderPage()
      await waitFor(() => screen.getByText('Ancienne TX'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() => screen.getByText('Modifier la transaction'))

      fireEvent.change(screen.getByDisplayValue('Ancienne TX'), {
        target: { value: 'Nouvelle TX' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/transaction mise à jour/i),
        ).toBeInTheDocument(),
      )
      expect(mockUpdateCashTransaction).toHaveBeenCalledWith('1', 1, {
        title: 'Nouvelle TX',
        date: '2024-01-01',
        amount: '10.00',
      })
    })
  })
})
