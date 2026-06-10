import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/purchases', () => ({
  listPurchases: vi.fn(),
  createPurchase: vi.fn(),
  updatePurchase: vi.fn(),
}))

vi.mock('../../../api/suppliers', () => ({
  listSuppliers: vi.fn(),
  createSupplier: vi.fn(),
}))

import ConfigAchatPage from '../../../pages/store/ConfigAchatPage'
import {
  listPurchases,
  createPurchase,
  updatePurchase,
} from '../../../api/purchases'
import { listSuppliers, createSupplier } from '../../../api/suppliers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListPurchases = listPurchases as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreatePurchase = createPurchase as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdatePurchase = updatePurchase as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListSuppliers = listSuppliers as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateSupplier = createSupplier as any

const mockSupplier = { id: 5, name: 'Acme' }

const mockPurchase = {
  id: 101,
  supplier: 5,
  order_number: 'CMD-1',
  order_date: '2024-01-15',
  price: '99.90',
  is_raw_material: false,
  reception_date: null,
  reception_checked: false,
  has_supporting_documents: false,
  claim_text: null,
  claim_date: null,
  supplier_return_text: null,
  claim_closed_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/achat']}>
      <Routes>
        <Route path="/store/:id/config/achat" element={<ConfigAchatPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('ConfigAchatPage', () => {
  beforeEach(() => {
    mockListPurchases.mockResolvedValue({
      data: { results: [mockPurchase], next: null },
    })
    mockListSuppliers.mockResolvedValue({
      data: { results: [mockSupplier], next: null },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner while data is loading', () => {
    mockListPurchases.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error message when purchases fail to load', async () => {
    mockListPurchases.mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les achats/i),
      ).toBeInTheDocument()
    })
  })

  it('renders purchases with resolved supplier name', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeInTheDocument()
      expect(screen.getByText('CMD-1')).toBeInTheDocument()
      expect(screen.getByText('99.90 €')).toBeInTheDocument()
    })
  })

  it('shows empty state when no purchases', async () => {
    mockListPurchases.mockResolvedValue({ data: { results: [], next: null } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/aucun achat/i)).toBeInTheDocument()
    })
  })

  it('opens create dialog with base fields and without reception/claim fields', async () => {
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /ajouter un achat/i }))

    expect(screen.getByLabelText(/Fournisseur/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Numéro de commande/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date de commande/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Prix/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Matière première/)).toBeInTheDocument()

    expect(screen.queryByLabelText(/Date de réception/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Réclamation$/)).not.toBeInTheDocument()
  })

  it('creates a purchase with an existing supplier', async () => {
    mockCreatePurchase.mockResolvedValue({})
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /ajouter un achat/i }))

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'Acme')
    await user.click(await screen.findByRole('option', { name: 'Acme' }))

    fireEvent.change(screen.getByLabelText(/Date de commande/), {
      target: { value: '2024-02-01' },
    })
    fireEvent.change(screen.getByLabelText(/Prix/), {
      target: { value: '50.00' },
    })

    fireEvent.click(screen.getByRole('button', { name: /^créer$/i }))

    await waitFor(() => {
      expect(mockCreatePurchase).toHaveBeenCalledWith('1', {
        supplier: 5,
        order_number: '',
        order_date: '2024-02-01',
        price: '50.00',
        is_raw_material: false,
      })
    })
    expect(
      await screen.findByText(/achat créé avec succès/i),
    ).toBeInTheDocument()
  })

  it('creates a supplier on the fly then creates the purchase', async () => {
    mockCreateSupplier.mockResolvedValue({ data: { id: 99, name: 'NewSup' } })
    mockCreatePurchase.mockResolvedValue({})
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /ajouter un achat/i }))

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'NewSup')
    await user.click(
      await screen.findByRole('option', { name: /Ajouter "NewSup"/ }),
    )

    fireEvent.change(screen.getByLabelText(/Date de commande/), {
      target: { value: '2024-03-01' },
    })
    fireEvent.change(screen.getByLabelText(/Prix/), {
      target: { value: '12.00' },
    })

    fireEvent.click(screen.getByRole('button', { name: /^créer$/i }))

    await waitFor(() => {
      expect(mockCreateSupplier).toHaveBeenCalledWith('1', { name: 'NewSup' })
    })
    await waitFor(() => {
      expect(mockCreatePurchase).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ supplier: 99 }),
      )
    })
  })

  it('shows error when create fails', async () => {
    mockCreatePurchase.mockRejectedValue(new Error('fail'))
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /ajouter un achat/i }))

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByRole('combobox'), 'Acme')
    await user.click(await screen.findByRole('option', { name: 'Acme' }))

    fireEvent.change(screen.getByLabelText(/Date de commande/), {
      target: { value: '2024-02-01' },
    })
    fireEvent.change(screen.getByLabelText(/Prix/), {
      target: { value: '50.00' },
    })

    fireEvent.click(screen.getByRole('button', { name: /^créer$/i }))

    await waitFor(() => {
      expect(screen.getByText(/l'enregistrement a échoué/i)).toBeInTheDocument()
    })
  })

  it('opens edit dialog pre-filled with extra fields', async () => {
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /modifier l'achat/i }))

    expect(screen.getByDisplayValue('CMD-1')).toBeInTheDocument()
    expect(screen.getByLabelText(/Date de réception/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Réception contrôlée/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Pièces justificatives/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Retour fournisseur/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Réclamation clôturée le/)).toBeInTheDocument()
  })

  it('updates a purchase with PATCH sending empty fields as null', async () => {
    mockUpdatePurchase.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText('CMD-1'))
    fireEvent.click(screen.getByRole('button', { name: /modifier l'achat/i }))

    fireEvent.change(screen.getByLabelText(/Prix/), {
      target: { value: '120.00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

    await waitFor(() => {
      expect(mockUpdatePurchase).toHaveBeenCalledWith(
        '1',
        101,
        expect.objectContaining({
          supplier: 5,
          price: '120.00',
          reception_date: null,
          claim_text: null,
          claim_date: null,
          supplier_return_text: null,
          claim_closed_at: null,
        }),
      )
    })
  })
})
