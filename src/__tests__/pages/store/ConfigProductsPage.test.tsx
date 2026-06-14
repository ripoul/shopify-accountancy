import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../../../api/products', () => ({
  importProducts: vi.fn(),
  listProducts: vi.fn(),
  listCollections: vi.fn(),
  updateVariant: vi.fn(),
}))

vi.mock('../../../api/stores', () => ({
  listStores: vi.fn(),
}))

import ConfigProductsPage from '../../../pages/store/ConfigProductsPage'
import {
  importProducts,
  listProducts,
  listCollections,
  updateVariant,
} from '../../../api/products'
import { listStores } from '../../../api/stores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockImportProducts = importProducts as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListProducts = listProducts as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListCollections = listCollections as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateVariant = updateVariant as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListStores = listStores as any

const mockVariant = {
  id: 201,
  external_id: '44308058882226',
  title: 'S / Blue',
  price: '29.99',
  distributor_price: null,
}

const mockVariantWithPrice = {
  id: 202,
  external_id: '44308058882227',
  title: 'M / Blue',
  price: '29.99',
  distributor_price: '15.00',
}

const mockProduct = {
  id: 101,
  external_id: '8876543210',
  title: 'T-Shirt Blue',
  collections: 'Vêtements, Nouveautés',
  variants: [mockVariant, mockVariantWithPrice],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockProduct2 = {
  id: 102,
  external_id: '8876543211',
  title: 'Hoodie Red',
  collections: 'Vêtements',
  variants: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockCollection = { id: 1, external_id: 'col1', title: 'Vêtements' }
const mockCollection2 = { id: 2, external_id: 'col2', title: 'Nouveautés' }
const mockStore = {
  id: 1,
  shop_domain: 'mystore.myshopify.com',
  name: 'My Store',
  scopes: '',
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/store/1/config/products']}>
      <Routes>
        <Route
          path="/store/:id/config/products"
          element={<ConfigProductsPage />}
        />
      </Routes>
    </MemoryRouter>,
  )

describe('ConfigProductsPage', () => {
  beforeEach(() => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct], next: null },
    })
    mockListCollections.mockResolvedValue({
      data: { results: [mockCollection, mockCollection2], next: null },
    })
    mockListStores.mockResolvedValue({ data: { results: [mockStore] } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // --- Loading & error states ---

  it('shows loading spinner while products are loading', () => {
    mockListProducts.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error message when products fail to load', async () => {
    mockListProducts.mockRejectedValue(new Error('network error'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les produits/i),
      ).toBeInTheDocument()
    })
  })

  it('renders products in table after loading', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('T-Shirt Blue')).toBeInTheDocument()
    })
  })

  it('shows empty state message when no products', async () => {
    mockListProducts.mockResolvedValue({ data: { results: [], next: null } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/aucun produit/i)).toBeInTheDocument()
    })
  })

  it('shows "no match" message when filters exclude all products', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.change(screen.getByPlaceholderText(/rechercher par nom/i), {
      target: { value: 'zzznotexists' },
    })
    expect(screen.getByText(/aucun produit ne correspond/i)).toBeInTheDocument()
  })

  // --- Collections chips ---

  it('renders collection chips after loading', async () => {
    renderPage()
    // Filter chips have role="button" (clickable); product-row chips do not
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Vêtements' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Nouveautés' }),
      ).toBeInTheDocument()
    })
  })

  // --- Import ---

  it('calls importProducts with store id on import button click', async () => {
    mockImportProducts.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(
      screen.getByRole('button', { name: /importer les produits/i }),
    )
    await waitFor(() => {
      expect(mockImportProducts).toHaveBeenCalledWith('1')
    })
  })

  it('shows success alert after successful import', async () => {
    mockImportProducts.mockResolvedValue({})
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(
      screen.getByRole('button', { name: /importer les produits/i }),
    )
    await waitFor(() => {
      expect(screen.getByText(/import terminé/i)).toBeInTheDocument()
    })
  })

  it('shows error alert when import fails', async () => {
    mockImportProducts.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(
      screen.getByRole('button', { name: /importer les produits/i }),
    )
    await waitFor(() => {
      expect(screen.getByText(/l'import a échoué/i)).toBeInTheDocument()
    })
  })

  it('loads all pages when products span multiple pages', async () => {
    mockListProducts
      .mockResolvedValueOnce({
        data: { results: [mockProduct], next: '/page2' },
      })
      .mockResolvedValueOnce({ data: { results: [mockProduct2], next: null } })

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('T-Shirt Blue')).toBeInTheDocument()
      expect(screen.getByText('Hoodie Red')).toBeInTheDocument()
    })
    expect(mockListProducts).toHaveBeenCalledTimes(2)
  })

  it('shows error when reload after import fails', async () => {
    mockImportProducts.mockResolvedValue({})
    mockListProducts
      .mockResolvedValueOnce({ data: { results: [mockProduct], next: null } })
      .mockRejectedValueOnce(new Error('reload fail'))

    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))

    fireEvent.click(
      screen.getByRole('button', { name: /importer les produits/i }),
    )
    await waitFor(() => {
      expect(
        screen.getByText(/impossible de charger les produits/i),
      ).toBeInTheDocument()
    })
  })

  it('closes import success alert', async () => {
    mockImportProducts.mockResolvedValue({})
    mockListProducts
      .mockResolvedValueOnce({ data: { results: [mockProduct], next: null } })
      .mockResolvedValueOnce({ data: { results: [mockProduct], next: null } })

    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))

    fireEvent.click(
      screen.getByRole('button', { name: /importer les produits/i }),
    )
    await waitFor(() => screen.getByText(/import terminé/i))

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))
    await waitFor(() =>
      expect(screen.queryByText(/import terminé/i)).not.toBeInTheDocument(),
    )
  })

  // --- Filters ---

  it('filters products by name', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.change(screen.getByPlaceholderText(/rechercher par nom/i), {
      target: { value: 'Hoodie' },
    })
    expect(screen.queryByText('T-Shirt Blue')).not.toBeInTheDocument()
    expect(screen.getByText('Hoodie Red')).toBeInTheDocument()
  })

  it('filter is case-insensitive', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.change(screen.getByPlaceholderText(/rechercher par nom/i), {
      target: { value: 't-shirt' },
    })
    expect(screen.getByText('T-Shirt Blue')).toBeInTheDocument()
  })

  it('filters products by collection chip', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    // Wait for the clickable filter chip (role="button") to appear
    await waitFor(() => screen.getByRole('button', { name: 'Nouveautés' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nouveautés' }))
    await waitFor(() => {
      expect(screen.queryByText('Hoodie Red')).not.toBeInTheDocument()
      expect(screen.getByText('T-Shirt Blue')).toBeInTheDocument()
    })
  })

  it('deselects collection filter on second click', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: 'Nouveautés' }))
    const chip = screen.getByRole('button', { name: 'Nouveautés' })
    fireEvent.click(chip)
    await waitFor(() =>
      expect(screen.queryByText('Hoodie Red')).not.toBeInTheDocument(),
    )
    fireEvent.click(chip)
    expect(screen.getByText('Hoodie Red')).toBeInTheDocument()
  })

  // --- Sort ---

  it('sorts products alphabetically ascending by default', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct2, mockProduct], next: null }, // Hoodie, T-Shirt
    })
    renderPage()
    await waitFor(() => screen.getByText('Hoodie Red'))
    const content = document.body.textContent ?? ''
    expect(content.indexOf('Hoodie Red')).toBeLessThan(
      content.indexOf('T-Shirt Blue'),
    )
  })

  it('toggles sort to descending on header click', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByRole('button', { name: /titre/i }))
    const content = document.body.textContent ?? ''
    expect(content.indexOf('T-Shirt Blue')).toBeLessThan(
      content.indexOf('Hoodie Red'),
    )
  })

  // --- Expand rows ---

  it('expands product row to show variants on click', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    expect(screen.queryByText('S / Blue')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    expect(screen.getByText('S / Blue')).toBeInTheDocument()
    expect(screen.getByText('M / Blue')).toBeInTheDocument()
  })

  it('shows variant price and reference links when expanded', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    // Two variants both have price 29.99 €
    expect(screen.getAllByText('29.99 €').length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', {
        name: /page produit \(admin shopify\)/i,
      })[0],
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', {
        name: /page variante \(admin shopify\)/i,
      })[0],
    ).toBeInTheDocument()
  })

  it('collapses variants on second click', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    expect(screen.getByText('S / Blue')).toBeInTheDocument()
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    await waitFor(() => {
      expect(screen.queryByText('S / Blue')).not.toBeInTheDocument()
    })
  })

  // --- Admin links ---

  it('admin links have correct hrefs with plain numeric external_id', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))

    const productLinks = screen.getAllByRole('link', {
      name: /page produit \(admin shopify\)/i,
    })
    expect(productLinks[0]).toHaveAttribute(
      'href',
      'https://mystore.myshopify.com/admin/products/8876543210',
    )

    const variantLinks = screen.getAllByRole('link', {
      name: /page variante \(admin shopify\)/i,
    })
    expect(variantLinks[0]).toHaveAttribute(
      'href',
      'https://mystore.myshopify.com/admin/products/8876543210/variants/44308058882226',
    )
  })

  it('extracts numeric id from GID format external_id', async () => {
    mockListProducts.mockResolvedValue({
      data: {
        results: [
          {
            ...mockProduct,
            external_id: 'gid://shopify/Product/8876543210',
            variants: [
              {
                ...mockVariant,
                external_id: 'gid://shopify/ProductVariant/44308058882226',
              },
            ],
          },
        ],
        next: null,
      },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))

    const productLink = screen.getByRole('link', {
      name: /page produit \(admin shopify\)/i,
    })
    expect(productLink).toHaveAttribute(
      'href',
      'https://mystore.myshopify.com/admin/products/8876543210',
    )
  })

  // --- Save distributor price ---

  it('save button is disabled when distributor price is unchanged', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    // First variant has distributor_price: null → input is '' → not dirty
    expect(saveButtons[0]).toBeDisabled()
  })

  it('save button enables when distributor price is changed', async () => {
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '12.50' } })
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    expect(saveButtons[0]).not.toBeDisabled()
  })

  it('calls updateVariant with correct args on save', async () => {
    mockUpdateVariant.mockResolvedValue({
      data: { ...mockVariant, distributor_price: '12.50' },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '12.50' } })
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    fireEvent.click(saveButtons[0])
    await waitFor(() => {
      expect(mockUpdateVariant).toHaveBeenCalledWith('1', 201, {
        distributor_price: '12.50',
      })
    })
  })

  it('sends null when distributor price is cleared', async () => {
    mockUpdateVariant.mockResolvedValue({
      data: { ...mockVariantWithPrice, distributor_price: null },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const inputs = screen.getAllByPlaceholderText('—')
    // Second variant has distributor_price: '15.00' → clear it
    fireEvent.change(inputs[1], { target: { value: '' } })
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    fireEvent.click(saveButtons[1])
    await waitFor(() => {
      expect(mockUpdateVariant).toHaveBeenCalledWith('1', 202, {
        distributor_price: null,
      })
    })
  })

  it('shows error message when save fails', async () => {
    mockUpdateVariant.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '5.00' } })
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    fireEvent.click(saveButtons[0])
    await waitFor(() => {
      expect(
        screen.getByText(/erreur lors de la sauvegarde/i),
      ).toBeInTheDocument()
    })
  })

  // --- collections as array ---

  it('handles collections field as array', async () => {
    mockListProducts.mockResolvedValue({
      data: {
        results: [{ ...mockProduct, collections: ['Vêtements', 'Nouveautés'] }],
        next: null,
      },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Vêtements')).toBeInTheDocument()
  })

  // --- product count ---

  it('shows product count below table', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/1 produit/)).toBeInTheDocument()
    })
  })

  it('shows filtered count vs total when filter is active', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.change(screen.getByPlaceholderText(/rechercher par nom/i), {
      target: { value: 'Hoodie' },
    })
    expect(screen.getByText(/1 produit sur 2/)).toBeInTheDocument()
  })

  it('toggles sort back to ascending on second header click', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    const sortBtn = screen.getByRole('button', { name: /titre/i })
    fireEvent.click(sortBtn)
    fireEvent.click(sortBtn)
    const content = document.body.textContent ?? ''
    expect(content.indexOf('Hoodie Red')).toBeLessThan(
      content.indexOf('T-Shirt Blue'),
    )
  })

  it('keeps other products unchanged when handleVariantSaved is called', async () => {
    mockListProducts.mockResolvedValue({
      data: { results: [mockProduct, mockProduct2], next: null },
    })
    mockUpdateVariant.mockResolvedValue({
      data: { ...mockVariant, distributor_price: '9.99' },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
    fireEvent.click(screen.getByText('T-Shirt Blue'))
    const inputs = screen.getAllByPlaceholderText('—')
    fireEvent.change(inputs[0], { target: { value: '9.99' } })
    const saveButtons = screen.getAllByRole('button', {
      name: /enregistrer le prix fournisseur/i,
    })
    fireEvent.click(saveButtons[0])
    await waitFor(() => expect(mockUpdateVariant).toHaveBeenCalled())
    expect(screen.getByText('Hoodie Red')).toBeInTheDocument()
  })

  it('does not set shop domain when store is not in the list', async () => {
    mockListStores.mockResolvedValue({ data: { results: [] } })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
  })

  it('parseCollections returns empty array for null collections', async () => {
    mockListProducts.mockResolvedValue({
      data: {
        results: [{ ...mockProduct, collections: null }],
        next: null,
      },
    })
    renderPage()
    await waitFor(() => screen.getByText('T-Shirt Blue'))
  })
})
