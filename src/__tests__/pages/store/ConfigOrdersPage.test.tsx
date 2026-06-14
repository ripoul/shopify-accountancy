import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  within,
} from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/orders', () => ({
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  importOrders: vi.fn(),
  reimportOrder: vi.fn(),
  createOrderExpense: vi.fn(),
  updateOrderExpense: vi.fn(),
  deleteOrderExpense: vi.fn(),
  updateOrderLineItem: vi.fn(),
}))

import ConfigOrdersPage from '../../../pages/store/ConfigOrdersPage'
import {
  listOrders,
  getOrder,
  importOrders,
  reimportOrder,
  createOrderExpense,
  updateOrderExpense,
  deleteOrderExpense,
  updateOrderLineItem,
} from '../../../api/orders'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListOrders = listOrders as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetOrder = getOrder as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImportOrders = importOrders as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockReimportOrder = reimportOrder as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateOrderExpense = createOrderExpense as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateOrderExpense = updateOrderExpense as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDeleteOrderExpense = deleteOrderExpense as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateOrderLineItem = updateOrderLineItem as any

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeOrder = (id: number, overrides = {}) => ({
  id,
  external_id: `gid://shopify/Order/${id}`,
  name: `#100${id}`,
  processed_at: '2024-03-15T10:00:00Z',
  payment_method: 'cash',
  currency_code: 'EUR',
  total_price: '49.90',
  cash_paid_amount: '49.90',
  net_margin: '15.00',
  after_tax_result: '10.00',
  quarter: '2024-T1',
  ...overrides,
})

const makeFullOrder = (id: number, overrides = {}) => ({
  ...makeOrder(id),
  line_items: [
    {
      id: 1,
      title: 'T-Shirt S/Blue',
      quantity: 2,
      unit_price: '15.00',
      distributor_price: '8.00',
    },
  ],
  discounts: [],
  expenses: [],
  ...overrides,
})

const makeExpense = (id: number, overrides = {}) => ({
  id,
  type: 'DELIVERY',
  source: 'MANUAL',
  amount: '5.90',
  label: 'Colissimo',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// ─── Setup ────────────────────────────────────────────────────────────────────

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/commandes']}>
      <Routes>
        <Route
          path="/store/:id/config/commandes"
          element={<ConfigOrdersPage />}
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
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfigOrdersPage', () => {
  // ── Basic rendering ─────────────────────────────────────────────────────────

  it('shows loading spinner initially', () => {
    mockListOrders.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error when list API fails', async () => {
    mockListOrders.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les commandes/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no orders', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/aucune commande/i)).toBeInTheDocument()
    })
  })

  it('renders order rows in table', async () => {
    mockListOrders.mockResolvedValue({
      data: {
        results: [makeOrder(1), makeOrder(2)],
        next: null,
        count: 2,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('#1001')).toBeInTheDocument()
      expect(screen.getByText('#1002')).toBeInTheDocument()
    })
  })

  // ── Import ───────────────────────────────────────────────────────────────────

  it('calls importOrders on button click and reloads list', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockImportOrders.mockResolvedValue({})

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /importer les commandes/i }),
    )
    await waitFor(() =>
      expect(screen.getByText(/import terminé/i)).toBeInTheDocument(),
    )
    expect(mockImportOrders).toHaveBeenCalledWith('1')
    expect(mockListOrders).toHaveBeenCalledTimes(2)
  })

  it('shows error if importOrders fails', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    mockImportOrders.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/aucune commande/i)).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /importer les commandes/i }),
    )
    await waitFor(() =>
      expect(screen.getByText(/l'import a échoué/i)).toBeInTheDocument(),
    )
  })

  it('closes import success alert', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    mockImportOrders.mockResolvedValue({})

    renderPage()
    await waitFor(() => screen.getByText(/aucune commande/i))

    fireEvent.click(
      screen.getByRole('button', { name: /importer les commandes/i }),
    )
    await waitFor(() => screen.getByText(/import terminé/i))

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))
    await waitFor(() =>
      expect(screen.queryByText(/import terminé/i)).not.toBeInTheDocument(),
    )
  })

  it('closes error alert when dismissed', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    mockImportOrders.mockRejectedValue(new Error('fail'))

    renderPage()
    await waitFor(() => screen.getByText(/aucune commande/i))

    fireEvent.click(
      screen.getByRole('button', { name: /importer les commandes/i }),
    )
    await waitFor(() => screen.getByText(/l'import a échoué/i))

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))
    await waitFor(() =>
      expect(screen.queryByText(/l'import a échoué/i)).not.toBeInTheDocument(),
    )
  })

  // ── Expand via row click ─────────────────────────────────────────────────────

  it('expands order by clicking the row directly', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(screen.getByText('#1001'))

    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )
  })

  // ── Re-import ────────────────────────────────────────────────────────────────

  it('calls reimportOrder when per-row button is clicked', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockReimportOrder.mockResolvedValue({})

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', {
        name: /re-importer la commande #1001/i,
      }),
    )
    await waitFor(() =>
      expect(mockReimportOrder).toHaveBeenCalledWith(
        '1',
        'gid://shopify/Order/1',
      ),
    )
  })

  it('refreshes full order detail after reimport when order was expanded', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })
    mockReimportOrder.mockResolvedValue({})

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /re-importer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(mockReimportOrder).toHaveBeenCalledWith(
        '1',
        'gid://shopify/Order/1',
      ),
    )
    await waitFor(() => expect(mockGetOrder).toHaveBeenCalledTimes(2))
  })

  // ── Expand / detail ──────────────────────────────────────────────────────────

  it('expands an order row and fetches full order details', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )
    expect(mockGetOrder).toHaveBeenCalledWith('1', 1)
  })

  it('shows detail loading spinner while fetching', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockReturnValue(new Promise(() => {}))

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0),
    )
  })

  it('shows detail error when getOrder fails', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockRejectedValue(new Error('fail'))

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(
        screen.getByText(/impossible de charger les détails/i),
      ).toBeInTheDocument(),
    )
  })

  it('caches order details on second expand', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    // expand
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    // collapse
    fireEvent.click(
      screen.getByRole('button', { name: /réduire la commande #1001/i }),
    )

    // re-expand — should not call getOrder again
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )
    expect(mockGetOrder).toHaveBeenCalledTimes(1)
  })

  // ── Line items: distributor_price column & totals ───────────────────────────────

  it('shows distributor_price column and total row', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, {
        line_items: [
          {
            id: 1,
            title: 'T-Shirt',
            quantity: 2,
            unit_price: '15.00',
            distributor_price: '8.00',
          },
          {
            id: 2,
            title: 'Hoodie',
            quantity: 1,
            unit_price: '35.00',
            distributor_price: '20.00',
          },
        ],
      }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )

    await waitFor(() => expect(screen.getByText('T-Shirt')).toBeInTheDocument())

    // distributor_price * quantity: 8*2=16, 20*1=20
    expect(screen.getByText('16.00 €')).toBeInTheDocument()
    expect(screen.getByText('20.00 €')).toBeInTheDocument()

    // totals row: qty=3, achat=36, vente=65
    // ("Total" also appears as a column header in the outer table, so getAllByText)
    expect(screen.getAllByText('Total').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('36.00 €')).toBeInTheDocument()
    expect(screen.getByText('65.00 €')).toBeInTheDocument()
  })

  it('shows — for distributor_price when null, total achat is — when all null', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, {
        line_items: [
          {
            id: 1,
            title: 'Mystery Item',
            quantity: 1,
            unit_price: '10.00',
            distributor_price: null,
          },
        ],
      }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )

    await waitFor(() =>
      expect(screen.getByText('Mystery Item')).toBeInTheDocument(),
    )

    // Both the item cell and the total achat cell show —
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('shows discounts section when order has discounts', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, {
        discounts: [
          { id: 10, code: 'PROMO10', title: '10% off', amount: '5.00' },
        ],
      }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() => expect(screen.getByText('PROMO10')).toBeInTheDocument())
    expect(screen.getByText('Remises')).toBeInTheDocument()
  })

  it('hides discounts section when order has no discounts', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, { discounts: [] }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Articles')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Remises')).not.toBeInTheDocument()
  })

  // ── Expense CRUD ──────────────────────────────────────────────────────────────

  it('shows existing expenses when order is expanded', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, {
        expenses: [makeExpense(1, { label: 'Colissimo', amount: '5.90' })],
      }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Colissimo')).toBeInTheDocument(),
    )
    expect(screen.getByText('5.90 €')).toBeInTheDocument()
    expect(screen.getByText('Manuel')).toBeInTheDocument()
  })

  it('adds a new expense via the form', async () => {
    const newExpense = makeExpense(42, {
      type: 'PACKAGING',
      label: 'Boîte',
      amount: '2.00',
      source: 'MANUAL',
    })
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder
      .mockResolvedValueOnce({ data: makeFullOrder(1) })
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { expenses: [newExpense] }),
      })
    mockCreateOrderExpense.mockResolvedValue({ data: newExpense })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Dépenses')).toBeInTheDocument(),
    )

    // Click "Ajouter"
    fireEvent.click(
      screen.getByRole('button', { name: /ajouter une dépense/i }),
    )

    // Fill in amount
    const amountField = screen.getByRole('spinbutton')
    fireEvent.change(amountField, { target: { value: '2.00' } })

    // Save
    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer la dépense/i }),
    )

    await waitFor(() =>
      expect(mockCreateOrderExpense).toHaveBeenCalledWith('1', 1, {
        type: 'DELIVERY',
        amount: '2.00',
        label: '',
      }),
    )
    await waitFor(() => expect(screen.getByText('Boîte')).toBeInTheDocument())
  })

  it('cancels adding an expense', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /ajouter une dépense/i }),
      ).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /ajouter une dépense/i }),
    )
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('edits an existing MANUAL expense', async () => {
    const expense = makeExpense(5, { label: 'Initial', amount: '3.00' })
    const updated = { ...expense, amount: '4.50', label: 'Updated' }
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { expenses: [expense] }),
      })
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { expenses: [updated] }),
      })
    mockUpdateOrderExpense.mockResolvedValue({ data: updated })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() => expect(screen.getByText('Initial')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /modifier la dépense 5/i }),
    )

    const amountField = screen.getByRole('spinbutton')
    fireEvent.change(amountField, { target: { value: '4.50' } })

    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer la dépense/i }),
    )

    await waitFor(() =>
      expect(mockUpdateOrderExpense).toHaveBeenCalledWith('1', 1, 5, {
        type: 'DELIVERY',
        amount: '4.50',
        label: 'Initial',
      }),
    )
    await waitFor(() => expect(screen.getByText('Updated')).toBeInTheDocument())
  })

  it('deletes a MANUAL expense', async () => {
    const expense = makeExpense(5)
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { expenses: [expense] }),
      })
      .mockResolvedValueOnce({ data: makeFullOrder(1, { expenses: [] }) })
    mockDeleteOrderExpense.mockResolvedValue({})

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Colissimo')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /supprimer la dépense 5/i }),
    )

    await waitFor(() =>
      expect(screen.queryByText('Colissimo')).not.toBeInTheDocument(),
    )
    expect(mockDeleteOrderExpense).toHaveBeenCalledWith('1', 1, 5)
  })

  it('shows error when delete fails', async () => {
    const expense = makeExpense(5)
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, { expenses: [expense] }),
    })
    mockDeleteOrderExpense.mockRejectedValue(new Error('fail'))

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Colissimo')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /supprimer la dépense 5/i }),
    )

    await waitFor(() =>
      expect(
        screen.getByText(/erreur lors de la suppression/i),
      ).toBeInTheDocument(),
    )
  })

  it('does not show edit/delete buttons for AUTO expenses', async () => {
    const expense = makeExpense(5, { source: 'AUTO' })
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({
      data: makeFullOrder(1, { expenses: [expense] }),
    })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() => expect(screen.getByText('Auto')).toBeInTheDocument())

    expect(
      screen.queryByRole('button', { name: /modifier la dépense/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /supprimer la dépense/i }),
    ).not.toBeInTheDocument()
  })

  it('shows save error when createOrderExpense fails', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })
    mockCreateOrderExpense.mockRejectedValue(new Error('fail'))

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /ajouter une dépense/i }),
      ).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /ajouter une dépense/i }),
    )
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '5.00' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer la dépense/i }),
    )

    await waitFor(() =>
      expect(
        screen.getByText(/erreur lors de la sauvegarde/i),
      ).toBeInTheDocument(),
    )
  })

  // ── Infinite scroll ──────────────────────────────────────────────────────────

  it('loads more orders on scroll', async () => {
    const page1 = {
      data: {
        results: [makeOrder(1), makeOrder(2)],
        next: '/page2',
        count: 4,
      },
    }
    const page2 = {
      data: { results: [makeOrder(3), makeOrder(4)], next: null, count: 4 },
    }
    mockListOrders.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())

    await act(async () => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() => expect(screen.getByText('#1003')).toBeInTheDocument())
    expect(mockListOrders).toHaveBeenCalledTimes(2)
    expect(mockListOrders).toHaveBeenLastCalledWith('1', 2)
  })

  // ── within helper for multi-order scenarios ──────────────────────────────────

  // ── Line item distributor_price editing ──────────────────────────────────────

  it('shows edit button for each line item', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    expect(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    ).toBeInTheDocument()
  })

  it('clicking edit opens inline input pre-filled with unit distributor_price', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('8.00')
  })

  it('saves the new distributor_price and updates the display', async () => {
    const updatedLineItem = {
      id: 1,
      title: 'T-Shirt S/Blue',
      quantity: 2,
      unit_price: '15.00',
      distributor_price: '9.50',
    }
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder
      .mockResolvedValueOnce({ data: makeFullOrder(1) })
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { line_items: [updatedLineItem] }),
      })
    mockUpdateOrderLineItem.mockResolvedValue({ data: updatedLineItem })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    )

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '9.50' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer le prix fournisseur/i }),
    )

    await waitFor(() =>
      expect(mockUpdateOrderLineItem).toHaveBeenCalledWith('1', 1, 1, {
        distributor_price: '9.50',
      }),
    )
    // 9.50 * 2 = 19.00 (appears in item row and total row)
    await waitFor(() =>
      expect(screen.getAllByText('19.00 €').length).toBeGreaterThanOrEqual(1),
    )
    // Input should be gone
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('saves null distributor_price when input is cleared', async () => {
    const updatedLineItem = {
      id: 1,
      title: 'T-Shirt S/Blue',
      quantity: 2,
      unit_price: '15.00',
      distributor_price: null,
    }
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder
      .mockResolvedValueOnce({ data: makeFullOrder(1) })
      .mockResolvedValueOnce({
        data: makeFullOrder(1, { line_items: [updatedLineItem] }),
      })
    mockUpdateOrderLineItem.mockResolvedValue({ data: updatedLineItem })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    )

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer le prix fournisseur/i }),
    )

    await waitFor(() =>
      expect(mockUpdateOrderLineItem).toHaveBeenCalledWith('1', 1, 1, {
        distributor_price: null,
      }),
    )
  })

  it('cancels editing line item price without saving', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    )
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /annuler la modification du prix fournisseur/i,
      }),
    )

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(mockUpdateOrderLineItem).not.toHaveBeenCalled()
    // Original price still shown: 8.00 * 2 = 16.00 (appears in item row and total row)
    expect(screen.getAllByText('16.00 €').length).toBeGreaterThanOrEqual(1)
  })

  it('shows error when updateOrderLineItem fails', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1)], next: null, count: 1 },
    })
    mockGetOrder.mockResolvedValue({ data: makeFullOrder(1) })
    mockUpdateOrderLineItem.mockRejectedValue(new Error('fail'))

    renderPage()
    await waitFor(() => expect(screen.getByText('#1001')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('T-Shirt S/Blue')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /modifier le prix fournisseur de T-Shirt S\/Blue/i,
      }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: /enregistrer le prix fournisseur/i }),
    )

    await waitFor(() =>
      expect(
        screen.getByText(/erreur lors de la sauvegarde/i),
      ).toBeInTheDocument(),
    )
  })

  it('expands two orders independently', async () => {
    mockListOrders.mockResolvedValue({
      data: { results: [makeOrder(1), makeOrder(2)], next: null, count: 2 },
    })
    mockGetOrder
      .mockResolvedValueOnce({
        data: makeFullOrder(1, {
          line_items: [
            { id: 1, title: 'Product A', quantity: 1, unit_price: '10.00' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        data: makeFullOrder(2, {
          line_items: [
            { id: 2, title: 'Product B', quantity: 1, unit_price: '20.00' },
          ],
        }),
      })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('#1001')).toBeInTheDocument()
      expect(screen.getByText('#1002')).toBeInTheDocument()
    })

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1001/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Product A')).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /développer la commande #1002/i }),
    )
    await waitFor(() =>
      expect(screen.getByText('Product B')).toBeInTheDocument(),
    )

    expect(screen.getByText('Product A')).toBeInTheDocument()
    expect(mockGetOrder).toHaveBeenCalledTimes(2)
  })
})
