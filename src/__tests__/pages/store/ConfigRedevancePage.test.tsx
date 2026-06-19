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

vi.mock('../../../api/royalties', () => ({
  listRoyalties: vi.fn(),
  updateRoyalty: vi.fn(),
}))

vi.mock('../../../api/stores', () => ({
  getStore: vi.fn(),
  updateStore: vi.fn(),
}))

import ConfigRedevancePage from '../../../pages/store/ConfigRedevancePage'
import { listRoyalties, updateRoyalty } from '../../../api/royalties'
import { getStore, updateStore } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListRoyalties = listRoyalties as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateRoyalty = updateRoyalty as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetStore = getStore as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateStore = updateStore as any

const makeRoyalty = (id: number, overrides = {}) => ({
  id,
  quarter: `Q${id} 2024`,
  amount: `${id * 100}.00`,
  payment_date: null,
  bank_transaction: null,
  sum_after_tax_result: `${id * 1000}.00`,
  sum_purchase_price: `${id * 200}.00`,
  ...overrides,
})

const makeStoreResponse = (royaltyRate = '5.00') => ({
  data: { royalty_rate: royaltyRate },
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/redevance']}>
      <Routes>
        <Route
          path="/store/:id/config/redevance"
          element={<ConfigRedevancePage />}
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
  mockGetStore.mockResolvedValue(makeStoreResponse('5.00'))
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('ConfigRedevancePage', () => {
  describe('royalties list', () => {
    it('shows loading spinner initially', () => {
      mockListRoyalties.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0)
    })

    it('shows error when list API fails', async () => {
      mockListRoyalties.mockRejectedValue(new Error('network'))
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/impossible de charger les redevances/i),
        ).toBeInTheDocument()
      })
    })

    it('shows empty state when no royalties', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/aucune redevance enregistrée/i),
        ).toBeInTheDocument()
      })
    })

    it('renders royalties in table', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1), makeRoyalty(2)],
          next: null,
          count: 2,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Q1 2024')).toBeInTheDocument()
        expect(screen.getByText('Q2 2024')).toBeInTheDocument()
      })
    })

    it('displays sum_after_tax_result column', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { sum_after_tax_result: '1234.56' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('1234.56 €')).toBeInTheDocument()
      })
    })

    it('displays sum_purchase_price column', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { sum_purchase_price: '321.00' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('321.00 €')).toBeInTheDocument()
      })
    })

    it('formats amount with 2 decimal places', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [
            makeRoyalty(1, {
              amount: '134.50',
              sum_after_tax_result: '0.00',
              sum_purchase_price: '0.00',
            }),
          ],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('134.50 €')).toBeInTheDocument()
      })
    })

    it('shows "En attente" chip when payment_date is null', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { payment_date: null })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('En attente')).toBeInTheDocument()
      })
    })

    it('shows "Payé" chip when payment_date is set', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { payment_date: '2024-06-30' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Payé')).toBeInTheDocument()
      })
    })

    it('formats payment_date in French locale', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { payment_date: '2024-06-30' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('30/06/2024')).toBeInTheDocument()
      })
    })

    it('shows — when payment_date is null', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { payment_date: null })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('—')).toBeInTheDocument()
      })
    })

    it('shows count label', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1), makeRoyalty(2)],
          next: null,
          count: 2,
        },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/2 trimestres/i)).toBeInTheDocument()
      })
    })

    it('shows singular count label for one royalty', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/1 trimestre$/i)).toBeInTheDocument()
      })
    })

    it('shows scroll hint when hasMore', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: '/page2', count: 2 },
      })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/faites défiler pour plus/i),
        ).toBeInTheDocument()
      })
    })

    it('loads more royalties on scroll', async () => {
      const page1 = {
        data: {
          results: [makeRoyalty(1), makeRoyalty(2)],
          next: '/page2',
          count: 4,
        },
      }
      const page2 = {
        data: {
          results: [makeRoyalty(3), makeRoyalty(4)],
          next: null,
          count: 4,
        },
      }
      mockListRoyalties
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2)

      renderPage()
      await waitFor(() =>
        expect(screen.getByText('Q1 2024')).toBeInTheDocument(),
      )

      await act(async () => {
        intersectionCallback!(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })

      await waitFor(() =>
        expect(screen.getByText('Q3 2024')).toBeInTheDocument(),
      )
      expect(mockListRoyalties).toHaveBeenCalledTimes(2)
      expect(mockListRoyalties).toHaveBeenLastCalledWith('1', 2)
    })

    it('does not set up observer when hasMore is false', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() =>
        expect(screen.getByText('Q1 2024')).toBeInTheDocument(),
      )
      expect(intersectionCallback).toBeNull()
    })

    it('shows error when scroll load fails', async () => {
      mockListRoyalties
        .mockResolvedValueOnce({
          data: { results: [makeRoyalty(1)], next: '/page2', count: 2 },
        })
        .mockRejectedValueOnce(new Error('scroll fail'))

      renderPage()
      await waitFor(() =>
        expect(screen.getByText('Q1 2024')).toBeInTheDocument(),
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

    it('dismisses error alert when closed', async () => {
      mockListRoyalties.mockRejectedValue(new Error('fail'))
      renderPage()
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

      fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))

      await waitFor(() =>
        expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
      )
    })

    it('shows edit button per row', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1), makeRoyalty(2)],
          next: null,
          count: 2,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      const editButtons = screen.getAllByLabelText('Modifier la redevance')
      expect(editButtons).toHaveLength(2)
    })

    it('disables edit button for paid royalties', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [
            makeRoyalty(1, { payment_date: '2024-06-30' }),
            makeRoyalty(2, { payment_date: null }),
          ],
          next: null,
          count: 2,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      const editButtons = screen.getAllByLabelText('Modifier la redevance')
      expect(editButtons[0]).toBeDisabled()
      expect(editButtons[1]).not.toBeDisabled()
    })
  })

  describe('edit royalty dialog', () => {
    it('opens edit dialog on icon click', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() =>
        expect(screen.getByText(/redevance — Q1 2024/i)).toBeInTheDocument(),
      )
    })

    it('pre-fills amount in dialog', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { amount: '134.00' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))
      expect(screen.getByDisplayValue('134.00')).toBeInTheDocument()
    })

    it('saves with payment_date and amount, shows success', async () => {
      mockUpdateRoyalty.mockResolvedValue({ data: {} })
      mockListRoyalties
        .mockResolvedValueOnce({
          data: {
            results: [makeRoyalty(1, { amount: '100.00' })],
            next: null,
            count: 1,
          },
        })
        .mockResolvedValueOnce({
          data: { results: [], next: null, count: 0 },
        })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))

      const dialog = screen.getByRole('dialog')
      fireEvent.change(within(dialog).getByDisplayValue('100.00'), {
        target: { value: '99.50' },
      })
      fireEvent.change(within(dialog).getByLabelText(/date de paiement/i), {
        target: { value: '2024-06-30' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(screen.getByText(/redevance mise à jour/i)).toBeInTheDocument(),
      )
      expect(mockUpdateRoyalty).toHaveBeenCalledWith('1', 1, {
        payment_date: '2024-06-30',
        amount: '99.50',
      })
    })

    it('disables submit when amount is empty', async () => {
      mockListRoyalties.mockResolvedValue({
        data: {
          results: [makeRoyalty(1, { amount: '100.00' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))

      fireEvent.change(screen.getByDisplayValue('100.00'), {
        target: { value: '' },
      })

      expect(
        screen.getByRole('button', { name: /enregistrer/i }),
      ).toBeDisabled()
    })

    it('shows error in dialog when update fails', async () => {
      mockUpdateRoyalty.mockRejectedValue(new Error('fail'))
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: null, count: 1 },
      })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/l'enregistrement a échoué/i),
        ).toBeInTheDocument(),
      )
    })

    it('closes dialog on Annuler click', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [makeRoyalty(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))

      fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

      await waitFor(() =>
        expect(
          screen.queryByText(/redevance — Q1 2024/i),
        ).not.toBeInTheDocument(),
      )
    })

    it('dismisses success message when closed', async () => {
      mockUpdateRoyalty.mockResolvedValue({ data: {} })
      mockListRoyalties
        .mockResolvedValueOnce({
          data: { results: [makeRoyalty(1)], next: null, count: 1 },
        })
        .mockResolvedValueOnce({
          data: { results: [], next: null, count: 0 },
        })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la redevance'))
      await waitFor(() => screen.getByText(/redevance — Q1 2024/i))

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(screen.getByText(/redevance mise à jour/i)).toBeInTheDocument(),
      )

      const alert = screen.getByRole('alert')
      fireEvent.click(within(alert).getByRole('button'))

      await waitFor(() =>
        expect(
          screen.queryByText(/redevance mise à jour/i),
        ).not.toBeInTheDocument(),
      )
    })
  })

  describe('royalty rate editing', () => {
    it('loads and displays the royalty rate from store', async () => {
      mockGetStore.mockResolvedValue(makeStoreResponse('7.50'))
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => {
        expect(screen.getByDisplayValue('7.50')).toBeInTheDocument()
      })
    })

    it('shows error when store load fails', async () => {
      mockGetStore.mockRejectedValue(new Error('fail'))
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => {
        expect(
          screen.getByText(/impossible de charger le taux de redevance/i),
        ).toBeInTheDocument()
      })
    })

    it('does not show save/cancel buttons when rate is unchanged', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))
      expect(
        screen.queryByRole('button', { name: /enregistrer/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /annuler/i }),
      ).not.toBeInTheDocument()
    })

    it('shows save and cancel buttons when rate changes', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))

      fireEvent.change(screen.getByDisplayValue('5.00'), {
        target: { value: '8.00' },
      })

      expect(
        screen.getByRole('button', { name: /enregistrer/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /annuler/i }),
      ).toBeInTheDocument()
    })

    it('cancel reverts rate to original value', async () => {
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))

      fireEvent.change(screen.getByDisplayValue('5.00'), {
        target: { value: '8.00' },
      })
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

      await waitFor(() => {
        expect(screen.getByDisplayValue('5.00')).toBeInTheDocument()
      })
    })

    it('saves rate and shows success', async () => {
      mockUpdateStore.mockResolvedValue({ data: {} })
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))

      fireEvent.change(screen.getByDisplayValue('5.00'), {
        target: { value: '8.00' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/taux de redevance mis à jour/i),
        ).toBeInTheDocument(),
      )
      expect(mockUpdateStore).toHaveBeenCalledWith('1', {
        royalty_rate: '8.00',
      })
    })

    it('hides save/cancel after successful save', async () => {
      mockUpdateStore.mockResolvedValue({ data: {} })
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))

      fireEvent.change(screen.getByDisplayValue('5.00'), {
        target: { value: '8.00' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /enregistrer/i }),
        ).not.toBeInTheDocument(),
      )
    })

    it('shows error when rate save fails', async () => {
      mockUpdateStore.mockRejectedValue(new Error('fail'))
      mockListRoyalties.mockResolvedValue({
        data: { results: [], next: null, count: 0 },
      })
      renderPage()
      await waitFor(() => screen.getByDisplayValue('5.00'))

      fireEvent.change(screen.getByDisplayValue('5.00'), {
        target: { value: '8.00' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(
          screen.getByText(/l'enregistrement du taux a échoué/i),
        ).toBeInTheDocument(),
      )
    })
  })
})
