import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AdminPanelSettingsRounded,
  CheckRounded,
  CloudDownloadRounded,
  KeyboardArrowDownRounded,
  OpenInNewRounded,
  SaveRounded,
  SearchRounded,
} from '@mui/icons-material'
import {
  importProducts,
  listProducts,
  listCollections,
  updateVariant,
} from '../../api/products'
import { listStores } from '../../api/stores'

interface ProductVariant {
  id: number
  external_id: string
  title: string
  price: string
  distributor_price: string | null
}

interface Product {
  id: number
  external_id: string
  title: string
  collections: string | string[] | null
  variants: ProductVariant[]
  created_at: string
  updated_at: string
}

interface Collection {
  id: number
  external_id: string
  title: string
}

const extractNumericId = (externalId: string): string =>
  externalId.startsWith('gid://')
    ? (externalId.split('/').pop() ?? externalId)
    : externalId

const parseCollections = (
  raw: string | string[] | null | undefined,
): string[] => {
  if (!raw) return []
  if (Array.isArray(raw))
    return raw.map((s) => String(s).trim()).filter(Boolean)
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const fetchAllPages = async <T,>(
  fetcher: (
    page: number,
  ) => Promise<{ data: { results: T[]; next: string | null } }>,
): Promise<T[]> => {
  const all: T[] = []
  let page = 1
  while (true) {
    const res = await fetcher(page)
    all.push(...res.data.results)
    if (!res.data.next) break
    page++
  }
  return all
}

interface VariantRowProps {
  storePk: string
  shopDomain: string
  productExternalId: string
  variant: ProductVariant
  onSaved: (updated: ProductVariant) => void
}

const VariantRow = ({
  storePk,
  shopDomain,
  productExternalId,
  variant,
  onSaved,
}: VariantRowProps) => {
  const [value, setValue] = useState(variant.distributor_price ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const isDirty = value !== (variant.distributor_price ?? '')

  const productNumericId = extractNumericId(productExternalId)
  const variantNumericId = extractNumericId(variant.external_id)
  const adminProductUrl = `https://${shopDomain}/admin/products/${productNumericId}`
  const adminVariantUrl = `https://${shopDomain}/admin/products/${productNumericId}/variants/${variantNumericId}`

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await updateVariant(storePk, variant.id, {
        distributor_price: value === '' ? null : value,
      })
      onSaved(res.data)
      setValue(res.data.distributor_price ?? '')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TableRow>
      <TableCell>{variant.title}</TableCell>
      <TableCell>
        <Tooltip title="Page produit (admin Shopify)">
          <IconButton
            size="small"
            component="a"
            href={adminProductUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Page produit (admin Shopify)"
          >
            <OpenInNewRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Page variante (admin Shopify)">
          <IconButton
            size="small"
            component="a"
            href={adminVariantUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Page variante (admin Shopify)"
          >
            <AdminPanelSettingsRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
      <TableCell>{variant.price} €</TableCell>
      <TableCell>
        <TextField
          size="small"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="—"
          type="number"
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
              inputProps: { min: 0, step: '0.01' },
            },
          }}
          error={!!error}
          sx={{ width: 140 }}
        />
        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mt: 0.5 }}
          >
            {error}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ width: 48, textAlign: 'center' }}>
        {saving ? (
          <CircularProgress size={20} />
        ) : saved ? (
          <CheckRounded color="success" fontSize="small" />
        ) : (
          <Tooltip title="Enregistrer">
            <span>
              <IconButton
                size="small"
                onClick={handleSave}
                disabled={!isDirty}
                color="primary"
                aria-label="Enregistrer le prix fournisseur"
              >
                <SaveRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  )
}

const ConfigProductsPage = () => {
  const { id } = useParams()
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [shopDomain, setShopDomain] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [nameFilter, setNameFilter] = useState('')
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const loadProducts = async () => {
    setLoadingProducts(true)
    setError('')
    try {
      const all = await fetchAllPages<Product>((page) =>
        listProducts(id!, page),
      )
      setProducts(all)
    } catch {
      setError('Impossible de charger les produits.')
    } finally {
      setLoadingProducts(false)
    }
  }

  const loadCollections = async () => {
    try {
      const all = await fetchAllPages<Collection>((page) =>
        listCollections(id!, page),
      )
      setCollections(all)
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingProducts(true)

    setError('')
    fetchAllPages<Product>((page) => listProducts(id!, page))
      .then(setProducts)
      .catch(() => setError('Impossible de charger les produits.'))
      .finally(() => setLoadingProducts(false))
    fetchAllPages<Collection>((page) => listCollections(id!, page))
      .then(setCollections)
      .catch(() => {})
    listStores()
      .then((res) => {
        const store = (
          res.data.results as { id: number; shop_domain: string }[]
        ).find((s) => s.id === Number(id))
        if (store) setShopDomain(store.shop_domain)
      })
      .catch(() => {})
  }, [id])

  const handleImport = async () => {
    setImporting(true)
    setError('')
    setImportSuccess(false)
    try {
      await importProducts(id!)
      setImportSuccess(true)
      await Promise.all([loadProducts(), loadCollections()])
    } catch {
      setError("L'import a échoué.")
    } finally {
      setImporting(false)
    }
  }

  const toggleCollection = (title: string) => {
    setSelectedCollections((prev) =>
      prev.includes(title) ? prev.filter((c) => c !== title) : [...prev, title],
    )
  }

  const toggleExpand = (productId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const handleVariantSaved = (productId: number, updated: ProductVariant) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === updated.id ? updated : v,
              ),
            }
          : p,
      ),
    )
  }

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (
        nameFilter &&
        !p.title.toLowerCase().includes(nameFilter.toLowerCase())
      )
        return false
      if (selectedCollections.length > 0) {
        const productCols = parseCollections(p.collections)
        if (!selectedCollections.every((c) => productCols.includes(c)))
          return false
      }
      return true
    })
    return [...filtered].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, undefined, {
        sensitivity: 'base',
      })
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [products, nameFilter, selectedCollections, sortOrder])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Config — Products
        </Typography>
        <Button
          variant="contained"
          startIcon={
            importing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CloudDownloadRounded />
            )
          }
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? 'Import en cours…' : 'Importer les produits'}
        </Button>
      </Box>

      {importSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setImportSuccess(false)}
        >
          Import terminé avec succès.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          placeholder="Rechercher par nom…"
          size="small"
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ maxWidth: 360 }}
        />

        {collections.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {collections.map((col) => (
              <Chip
                key={col.id}
                label={col.title}
                size="small"
                color={
                  selectedCollections.includes(col.title)
                    ? 'primary'
                    : 'default'
                }
                variant={
                  selectedCollections.includes(col.title)
                    ? 'filled'
                    : 'outlined'
                }
                onClick={() => toggleCollection(col.title)}
                clickable
              />
            ))}
          </Box>
        )}
      </Stack>

      {loadingProducts ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 600 }}>
                    <TableSortLabel
                      active
                      direction={sortOrder}
                      onClick={() =>
                        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
                      }
                    >
                      Titre
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Collections</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 100 }}>
                    Variantes
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      {products.length === 0
                        ? 'Aucun produit. Cliquez sur "Importer les produits".'
                        : 'Aucun produit ne correspond aux filtres.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const expanded = expandedIds.has(product.id)
                    return (
                      <>
                        <TableRow
                          key={product.id}
                          hover
                          onClick={() => toggleExpand(product.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ p: 0.5, textAlign: 'center' }}>
                            <KeyboardArrowDownRounded
                              fontSize="small"
                              sx={{
                                transition: 'transform 0.2s',
                                transform: expanded ? 'rotate(180deg)' : 'none',
                                color: 'text.secondary',
                              }}
                            />
                          </TableCell>
                          <TableCell>{product.title}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                              }}
                            >
                              {parseCollections(product.collections).map(
                                (col) => (
                                  <Chip
                                    key={col}
                                    label={col}
                                    size="small"
                                    variant="outlined"
                                  />
                                ),
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{product.variants.length}</TableCell>
                        </TableRow>
                        <TableRow key={`${product.id}-variants`}>
                          <TableCell
                            colSpan={4}
                            sx={{ p: 0, border: expanded ? undefined : 0 }}
                          >
                            <Collapse
                              in={expanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 600 }}>
                                        Variante
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>
                                        Référence externe
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>
                                        Prix de vente
                                      </TableCell>
                                      <TableCell sx={{ fontWeight: 600 }}>
                                        Prix fournisseur
                                      </TableCell>
                                      <TableCell />
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {product.variants.map((variant) => (
                                      <VariantRow
                                        key={variant.id}
                                        storePk={id!}
                                        shopDomain={shopDomain}
                                        productExternalId={product.external_id}
                                        variant={variant}
                                        onSaved={(updated) =>
                                          handleVariantSaved(
                                            product.id,
                                            updated,
                                          )
                                        }
                                      />
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredProducts.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              {filteredProducts.length} produit
              {filteredProducts.length > 1 ? 's' : ''}
              {filteredProducts.length !== products.length &&
                ` sur ${products.length}`}
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}

export default ConfigProductsPage
