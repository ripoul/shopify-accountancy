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
  listBankTransactions: vi.fn(),
  listCashTransactions: vi.fn(),
  createBankTransaction: vi.fn(),
  updateBankTransaction: vi.fn(),
}))

vi.mock('../../../api/stores', () => ({
  listStores: vi.fn(),
}))

import ConfigBankTransactionsPage from '../../../pages/store/ConfigBankTransactionsPage'
import {
  listBankTransactions,
  createBankTransaction,
  updateBankTransaction,
} from '../../../api/transactions'
import { listStores } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListBankTransactions = listBankTransactions as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateBankTransaction = createBankTransaction as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateBankTransaction = updateBankTransaction as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListStores = listStores as any

const makeTx = (id: number, overrides = {}) => ({
  id,
  title: `Transaction ${id}`,
  date: '2024-03-15',
  amount: '29.90',
  source: 'ORDER',
  order: id * 10,
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/bank-transactions']}>
      <Routes>
        <Route
          path="/store/:id/config/bank-transactions"
          element={<ConfigBankTransactionsPage />}
        />
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

describe('ConfigBankTransactionsPage', () => {
  it('shows loading spinner initially', () => {
    mockListBankTransactions.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    mockListBankTransactions.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les transactions bancaires/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/aucune transaction bancaire/i),
      ).toBeInTheDocument()
    })
  })

  it('renders transactions in table', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1), makeTx(2, { amount: '-10.00' })],
        next: null,
        count: 2,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Transaction 1')).toBeInTheDocument()
      expect(screen.getByText('Transaction 2')).toBeInTheDocument()
    })
  })

  it('displays source label in French', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { source: 'EMPTY_CASHBOX' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Vidage caisse')).toBeInTheDocument()
    })
  })

  it('shows + prefix for positive amounts', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { amount: '50.00' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('+50.00 €')).toBeInTheDocument()
    })
  })

  it('shows bank_amount chip when store has bank_amount', async () => {
    mockListStores.mockResolvedValue({
      data: {
        results: [{ id: 1, bank_amount: '1234.56' }],
      },
    })
    mockListBankTransactions.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/solde bancaire/i)).toBeInTheDocument()
      expect(screen.getByText(/1234\.56/)).toBeInTheDocument()
    })
  })

  it('loads more transactions on scroll', async () => {
    const page1 = {
      data: { results: [makeTx(1), makeTx(2)], next: '/page2', count: 4 },
    }
    const page2 = {
      data: { results: [makeTx(3), makeTx(4)], next: null, count: 4 },
    }
    mockListBankTransactions
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)

    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Transaction 1')).toBeInTheDocument(),
    )

    await act(async () => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() =>
      expect(screen.getByText('Transaction 3')).toBeInTheDocument(),
    )
    expect(mockListBankTransactions).toHaveBeenCalledTimes(2)
    expect(mockListBankTransactions).toHaveBeenLastCalledWith('1', 2)
  })

  it('does not set up observer when hasMore is false', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: { results: [makeTx(1)], next: null, count: 1 },
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Transaction 1')).toBeInTheDocument(),
    )
    expect(intersectionCallback).toBeNull()
  })

  it('shows — when order is null', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: { results: [makeTx(1, { order: null })], next: null, count: 1 },
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })

  it('falls back to raw source value for unknown source types', async () => {
    mockListBankTransactions.mockResolvedValue({
      data: {
        results: [makeTx(1, { source: 'UNKNOWN_TYPE' })],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('UNKNOWN_TYPE')).toBeInTheDocument(),
    )
  })

  it('shows error message when scroll load fails', async () => {
    mockListBankTransactions
      .mockResolvedValueOnce({
        data: { results: [makeTx(1)], next: '/page2', count: 2 },
      })
      .mockRejectedValueOnce(new Error('scroll fail'))

    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Transaction 1')).toBeInTheDocument(),
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
    mockListBankTransactions
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
      expect(screen.getByText('Transaction 1')).toBeInTheDocument(),
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

    expect(mockListBankTransactions).toHaveBeenCalledTimes(2)
  })

  it('dismisses error alert when closed', async () => {
    mockListBankTransactions.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  describe('create dialog', () => {
    beforeEach(() => {
      mockListBankTransactions.mockResolvedValue({
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
      mockCreateBankTransaction.mockResolvedValue({ data: {} })
      mockListBankTransactions
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })

      renderPage()
      await waitFor(() => screen.getByRole('button', { name: /ajouter/i }))
      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }))
      await waitFor(() => screen.getByText('Ajouter une transaction'))

      fireEvent.change(screen.getByLabelText(/titre \*/i), {
        target: { value: 'Alimentation caisse' },
      })
      fireEvent.change(screen.getByLabelText(/date \*/i), {
        target: { value: '2024-06-03' },
      })
      fireEvent.change(screen.getByLabelText(/montant \*/i), {
        target: { value: '200' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /créer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/transaction créée avec succès/i),
        ).toBeInTheDocument(),
      )
      expect(mockCreateBankTransaction).toHaveBeenCalledWith('1', {
        source: 'FILL_CASHBOX',
        title: 'Alimentation caisse',
        date: '2024-06-03',
        amount: '200',
      })
    })

    it('shows error alert in dialog when create fails', async () => {
      mockCreateBankTransaction.mockRejectedValue(new Error('fail'))

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
      mockListBankTransactions.mockResolvedValue({
        data: { results: [makeTx(1), makeTx(2)], next: null, count: 2 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Transaction 1'))
      const editButtons = screen.getAllByLabelText('Modifier la transaction')
      expect(editButtons).toHaveLength(2)
    })

    it('opens edit dialog with pre-filled data', async () => {
      mockListBankTransactions.mockResolvedValue({
        data: {
          results: [
            makeTx(1, {
              title: 'Ma BT',
              date: '2024-06-20',
              amount: '150.00',
              source: 'FILL_CASHBOX',
              order: null,
            }),
          ],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Ma BT'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() =>
        expect(screen.getByText('Modifier la transaction')).toBeInTheDocument(),
      )
      expect(screen.getByDisplayValue('Ma BT')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-06-20')).toBeInTheDocument()
      expect(screen.getByDisplayValue('150.00')).toBeInTheDocument()
    })

    it('shows source as disabled field in edit mode', async () => {
      mockListBankTransactions.mockResolvedValue({
        data: {
          results: [makeTx(1, { source: 'FILL_CASHBOX', order: null })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Transaction 1'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() => screen.getByText('Modifier la transaction'))

      const sourceInput = screen.getByDisplayValue('Alimentation caisse')
      expect(sourceInput).toBeDisabled()
    })

    it('updates a transaction and shows success message', async () => {
      mockUpdateBankTransaction.mockResolvedValue({ data: {} })
      mockListBankTransactions
        .mockResolvedValueOnce({
          data: {
            results: [
              makeTx(1, {
                title: 'Ancienne BT',
                date: '2024-01-01',
                amount: '100.00',
                order: null,
              }),
            ],
            next: null,
            count: 1,
          },
        })
        .mockResolvedValueOnce({ data: { results: [], next: null, count: 0 } })

      renderPage()
      await waitFor(() => screen.getByText('Ancienne BT'))
      fireEvent.click(screen.getByLabelText('Modifier la transaction'))
      await waitFor(() => screen.getByText('Modifier la transaction'))

      fireEvent.change(screen.getByDisplayValue('Ancienne BT'), {
        target: { value: 'Nouvelle BT' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/transaction mise à jour/i),
        ).toBeInTheDocument(),
      )
      expect(mockUpdateBankTransaction).toHaveBeenCalledWith('1', 1, {
        title: 'Nouvelle BT',
        date: '2024-01-01',
        amount: '100.00',
      })
    })
  })
})
