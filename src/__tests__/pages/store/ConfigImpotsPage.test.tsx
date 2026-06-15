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

vi.mock('../../../api/taxes', () => ({
  listTaxes: vi.fn(),
  updateTax: vi.fn(),
}))

import ConfigImpotsPage from '../../../pages/store/ConfigImpotsPage'
import { listTaxes, updateTax } from '../../../api/taxes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListTaxes = listTaxes as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateTax = updateTax as any

const makeTax = (id: number, overrides = {}) => ({
  id,
  quarter: `Q${id} 2024`,
  amount: `${id * 100}.00`,
  payment_date: null,
  bank_transaction: null,
  ...overrides,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/impots']}>
      <Routes>
        <Route path="/store/:id/config/impots" element={<ConfigImpotsPage />} />
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

describe('ConfigImpotsPage', () => {
  it('shows loading spinner initially', () => {
    mockListTaxes.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    mockListTaxes.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les impôts/i),
      ).toBeInTheDocument()
    })
  })

  it('shows empty state when no taxes', async () => {
    mockListTaxes.mockResolvedValue({
      data: { results: [], next: null, count: 0 },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/aucun impôt enregistré/i)).toBeInTheDocument()
    })
  })

  it('renders taxes in table', async () => {
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1), makeTax(2)],
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

  it('formats amount with 2 decimal places', async () => {
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1, { amount: '134.50' })],
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
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1, { payment_date: null })],
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
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1, { payment_date: '2024-06-30' })],
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
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1, { payment_date: '2024-06-30' })],
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
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1, { payment_date: null })],
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
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1), makeTax(2)],
        next: null,
        count: 2,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/2 trimestres/i)).toBeInTheDocument()
    })
  })

  it('shows singular count label for one tax', async () => {
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1)],
        next: null,
        count: 1,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/1 trimestre$/i)).toBeInTheDocument()
    })
  })

  it('shows scroll hint when hasMore', async () => {
    mockListTaxes.mockResolvedValue({
      data: {
        results: [makeTax(1)],
        next: '/page2',
        count: 2,
      },
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/faites défiler pour plus/i)).toBeInTheDocument()
    })
  })

  it('loads more taxes on scroll', async () => {
    const page1 = {
      data: { results: [makeTax(1), makeTax(2)], next: '/page2', count: 4 },
    }
    const page2 = {
      data: { results: [makeTax(3), makeTax(4)], next: null, count: 4 },
    }
    mockListTaxes.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    renderPage()
    await waitFor(() => expect(screen.getByText('Q1 2024')).toBeInTheDocument())

    await act(async () => {
      intersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() => expect(screen.getByText('Q3 2024')).toBeInTheDocument())
    expect(mockListTaxes).toHaveBeenCalledTimes(2)
    expect(mockListTaxes).toHaveBeenLastCalledWith('1', 2)
  })

  it('does not set up observer when hasMore is false', async () => {
    mockListTaxes.mockResolvedValue({
      data: { results: [makeTax(1)], next: null, count: 1 },
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Q1 2024')).toBeInTheDocument())
    expect(intersectionCallback).toBeNull()
  })

  it('shows error when scroll load fails', async () => {
    mockListTaxes
      .mockResolvedValueOnce({
        data: { results: [makeTax(1)], next: '/page2', count: 2 },
      })
      .mockRejectedValueOnce(new Error('scroll fail'))

    renderPage()
    await waitFor(() => expect(screen.getByText('Q1 2024')).toBeInTheDocument())

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
    mockListTaxes
      .mockResolvedValueOnce({
        data: { results: [makeTax(1)], next: '/page2', count: 2 },
      })
      .mockReturnValueOnce(
        new Promise((res) => {
          resolveLoad = res
        }),
      )

    renderPage()
    await waitFor(() => expect(screen.getByText('Q1 2024')).toBeInTheDocument())

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
      resolveLoad({ data: { results: [makeTax(2)], next: null } })
    })

    expect(mockListTaxes).toHaveBeenCalledTimes(2)
  })

  it('dismisses error alert when closed', async () => {
    mockListTaxes.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('shows edit button per row', async () => {
    mockListTaxes.mockResolvedValue({
      data: { results: [makeTax(1), makeTax(2)], next: null, count: 2 },
    })
    renderPage()
    await waitFor(() => screen.getByText('Q1 2024'))
    const editButtons = screen.getAllByLabelText('Modifier la date de paiement')
    expect(editButtons).toHaveLength(2)
  })

  describe('edit dialog', () => {
    it('opens edit dialog on icon click', async () => {
      mockListTaxes.mockResolvedValue({
        data: { results: [makeTax(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() =>
        expect(screen.getByText(/impôt — Q1 2024/i)).toBeInTheDocument(),
      )
    })

    it('pre-fills amount in dialog', async () => {
      mockListTaxes.mockResolvedValue({
        data: {
          results: [makeTax(1, { amount: '134.00' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))
      expect(screen.getByDisplayValue('134.00')).toBeInTheDocument()
    })

    it('pre-fills payment_date when already set', async () => {
      mockListTaxes.mockResolvedValue({
        data: {
          results: [makeTax(1, { payment_date: '2024-06-30' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))
      expect(screen.getByDisplayValue('2024-06-30')).toBeInTheDocument()
    })

    it('saves with payment_date and amount, shows success', async () => {
      mockUpdateTax.mockResolvedValue({ data: {} })
      mockListTaxes
        .mockResolvedValueOnce({
          data: {
            results: [makeTax(1, { amount: '100.00' })],
            next: null,
            count: 1,
          },
        })
        .mockResolvedValueOnce({
          data: { results: [], next: null, count: 0 },
        })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

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
        expect(screen.getByText(/impôt mis à jour/i)).toBeInTheDocument(),
      )
      expect(mockUpdateTax).toHaveBeenCalledWith('1', 1, {
        payment_date: '2024-06-30',
        amount: '99.50',
      })
    })

    it('sends null when payment_date is cleared', async () => {
      mockUpdateTax.mockResolvedValue({ data: {} })
      mockListTaxes
        .mockResolvedValueOnce({
          data: {
            results: [
              makeTax(1, { payment_date: '2024-06-30', amount: '100.00' }),
            ],
            next: null,
            count: 1,
          },
        })
        .mockResolvedValueOnce({
          data: { results: [], next: null, count: 0 },
        })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

      fireEvent.change(screen.getByDisplayValue('2024-06-30'), {
        target: { value: '' },
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(screen.getByText(/impôt mis à jour/i)).toBeInTheDocument(),
      )
      expect(mockUpdateTax).toHaveBeenCalledWith('1', 1, {
        payment_date: null,
        amount: '100.00',
      })
    })

    it('disables submit when amount is empty', async () => {
      mockListTaxes.mockResolvedValue({
        data: {
          results: [makeTax(1, { amount: '100.00' })],
          next: null,
          count: 1,
        },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

      fireEvent.change(screen.getByDisplayValue('100.00'), {
        target: { value: '' },
      })

      expect(
        screen.getByRole('button', { name: /enregistrer/i }),
      ).toBeDisabled()
    })

    it('shows error in dialog when update fails', async () => {
      mockUpdateTax.mockRejectedValue(new Error('fail'))
      mockListTaxes.mockResolvedValue({
        data: { results: [makeTax(1)], next: null, count: 1 },
      })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

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
      mockListTaxes.mockResolvedValue({
        data: { results: [makeTax(1)], next: null, count: 1 },
      })
      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

      fireEvent.click(screen.getByRole('button', { name: /annuler/i }))

      await waitFor(() =>
        expect(screen.queryByText(/impôt — Q1 2024/i)).not.toBeInTheDocument(),
      )
    })

    it('dismisses success message when closed', async () => {
      mockUpdateTax.mockResolvedValue({ data: {} })
      mockListTaxes
        .mockResolvedValueOnce({
          data: { results: [makeTax(1)], next: null, count: 1 },
        })
        .mockResolvedValueOnce({
          data: { results: [], next: null, count: 0 },
        })

      renderPage()
      await waitFor(() => screen.getByText('Q1 2024'))
      fireEvent.click(screen.getByLabelText('Modifier la date de paiement'))
      await waitFor(() => screen.getByText(/impôt — Q1 2024/i))

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))
      })

      await waitFor(() =>
        expect(screen.getByText(/impôt mis à jour/i)).toBeInTheDocument(),
      )

      const alert = screen.getByRole('alert')
      fireEvent.click(within(alert).getByRole('button'))

      await waitFor(() =>
        expect(screen.queryByText(/impôt mis à jour/i)).not.toBeInTheDocument(),
      )
    })
  })
})
