import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { AddRounded, EditRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { createSupplier, listSuppliers } from '../../api/suppliers'
import {
  createPurchase,
  listPurchases,
  updatePurchase,
  type PurchasePayload,
} from '../../api/purchases'
import { useFormatters } from '../../i18n/useFormatters'

interface Supplier {
  id: number
  name: string
}

interface Purchase {
  id: number
  supplier: number
  order_number: string
  order_date: string
  price: string
  is_raw_material: boolean
  reception_date: string | null
  reception_checked: boolean
  has_supporting_documents: boolean
  claim_text: string | null
  claim_date: string | null
  supplier_return_text: string | null
  claim_closed_at: string | null
  created_at: string
  updated_at: string
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

interface SupplierOption {
  inputValue?: string
  id: number | null
  name: string
}

interface PurchaseFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  storePk: string
  suppliers: Supplier[]
  purchase: Purchase | null
  onClose: () => void
  onSaved: () => void
  onSupplierCreated: (supplier: Supplier) => void
}

const emptyForm = {
  order_number: '',
  order_date: '',
  price: '',
  is_raw_material: false,
  reception_date: '',
  reception_checked: false,
  has_supporting_documents: false,
  claim_text: '',
  claim_date: '',
  supplier_return_text: '',
  claim_closed_at: '',
}

const buildInitialSupplier = (
  mode: 'create' | 'edit',
  purchase: Purchase | null,
  suppliers: Supplier[],
): SupplierOption | null => {
  if (mode !== 'edit' || !purchase) return null
  const current = suppliers.find((s) => s.id === purchase.supplier)
  return current
    ? { id: current.id, name: current.name }
    : { id: purchase.supplier, name: `#${purchase.supplier}` }
}

const buildInitialForm = (
  mode: 'create' | 'edit',
  purchase: Purchase | null,
): typeof emptyForm => {
  if (mode !== 'edit' || !purchase) return emptyForm
  return {
    order_number: purchase.order_number ?? '',
    order_date: purchase.order_date ?? '',
    price: purchase.price ?? '',
    is_raw_material: purchase.is_raw_material,
    reception_date: purchase.reception_date ?? '',
    reception_checked: purchase.reception_checked,
    has_supporting_documents: purchase.has_supporting_documents,
    claim_text: purchase.claim_text ?? '',
    claim_date: purchase.claim_date ?? '',
    supplier_return_text: purchase.supplier_return_text ?? '',
    claim_closed_at: purchase.claim_closed_at ?? '',
  }
}

const PurchaseFormDialog = ({
  open,
  mode,
  storePk,
  suppliers,
  purchase,
  onClose,
  onSaved,
  onSupplierCreated,
}: PurchaseFormDialogProps) => {
  const { t } = useTranslation()
  const [supplierValue, setSupplierValue] = useState<SupplierOption | null>(
    () => buildInitialSupplier(mode, purchase, suppliers),
  )
  const [form, setForm] = useState(() => buildInitialForm(mode, purchase))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const resolveSupplierId = async (): Promise<number> => {
    if (!supplierValue) throw new Error('missing supplier')
    if (supplierValue.id !== null && !supplierValue.inputValue)
      return supplierValue.id
    const name = supplierValue.inputValue ?? supplierValue.name
    const res = await createSupplier(storePk, { name })
    onSupplierCreated(res.data)
    return res.data.id
  }

  const nullable = (value: string) => (value.trim() === '' ? null : value)

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const supplierId = await resolveSupplierId()
      if (mode === 'create') {
        const payload: PurchasePayload = {
          supplier: supplierId,
          order_number: form.order_number,
          order_date: form.order_date,
          price: form.price,
          is_raw_material: form.is_raw_material,
        }
        await createPurchase(storePk, payload)
      } else if (purchase) {
        const payload: Partial<PurchasePayload> = {
          supplier: supplierId,
          order_number: form.order_number,
          order_date: form.order_date,
          price: form.price,
          is_raw_material: form.is_raw_material,
          reception_date: nullable(form.reception_date),
          reception_checked: form.reception_checked,
          has_supporting_documents: form.has_supporting_documents,
          claim_text: nullable(form.claim_text),
          claim_date: nullable(form.claim_date),
          supplier_return_text: nullable(form.supplier_return_text),
          claim_closed_at: nullable(form.claim_closed_at),
        }
        await updatePurchase(storePk, purchase.id, payload)
      }
      onSaved()
    } catch {
      setError(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }))

  const canSubmit =
    !!supplierValue && form.order_date.trim() !== '' && form.price.trim() !== ''

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === 'create'
          ? t('configPurchases.addButton')
          : t('configPurchases.editPurchase')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Autocomplete
            freeSolo
            options={supplierOptions}
            value={supplierValue}
            getOptionLabel={(option) =>
              typeof option === 'string'
                ? option
                : (option.inputValue ?? option.name)
            }
            isOptionEqualToValue={(option, val) => option.id === val.id}
            filterOptions={(options, params) => {
              const filtered = options.filter((o) =>
                o.name.toLowerCase().includes(params.inputValue.toLowerCase()),
              )
              const exists = options.some(
                (o) => o.name.toLowerCase() === params.inputValue.toLowerCase(),
              )
              if (params.inputValue !== '' && !exists) {
                filtered.push({
                  inputValue: params.inputValue,
                  id: null,
                  name: t('configPurchases.addSupplierOption', {
                    name: params.inputValue,
                  }),
                })
              }
              return filtered
            }}
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                setSupplierValue({
                  inputValue: newValue,
                  id: null,
                  name: newValue,
                })
              } else {
                setSupplierValue(newValue)
              }
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props
              return (
                <li key={key} {...rest}>
                  {option.name}
                </li>
              )
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('configPurchases.colSupplier')}
                required
              />
            )}
          />

          <TextField
            label={t('configPurchases.fieldOrderNumber')}
            value={form.order_number}
            onChange={(e) => setField('order_number', e.target.value)}
            fullWidth
          />

          <TextField
            label={t('configPurchases.fieldOrderDate')}
            type="date"
            value={form.order_date}
            onChange={(e) => setField('order_date', e.target.value)}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label={t('configPurchases.colPrice')}
            type="number"
            value={form.price}
            onChange={(e) => setField('price', e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                inputProps: { min: 0, step: '0.01' },
              },
            }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.is_raw_material}
                onChange={(e) => setField('is_raw_material', e.target.checked)}
              />
            }
            label={t('configPurchases.colRawMaterial')}
          />

          {mode === 'edit' && (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                {t('configPurchases.colReception')}
              </Typography>
              <TextField
                label={t('configPurchases.fieldReceptionDate')}
                type="date"
                value={form.reception_date}
                onChange={(e) => setField('reception_date', e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.reception_checked}
                    onChange={(e) =>
                      setField('reception_checked', e.target.checked)
                    }
                  />
                }
                label={t('configPurchases.fieldReceptionChecked')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.has_supporting_documents}
                    onChange={(e) =>
                      setField('has_supporting_documents', e.target.checked)
                    }
                  />
                }
                label={t('configPurchases.fieldSupportingDocs')}
              />

              <Typography variant="subtitle2" color="text.secondary">
                {t('configPurchases.colClaim')}
              </Typography>
              <TextField
                label={t('configPurchases.colClaim')}
                value={form.claim_text}
                onChange={(e) => setField('claim_text', e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label={t('configPurchases.fieldClaimDate')}
                type="date"
                value={form.claim_date}
                onChange={(e) => setField('claim_date', e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('configPurchases.fieldSupplierReturn')}
                value={form.supplier_return_text}
                onChange={(e) =>
                  setField('supplier_return_text', e.target.value)
                }
                multiline
                minRows={2}
                fullWidth
              />
              <TextField
                label={t('configPurchases.fieldClaimClosedAt')}
                type="date"
                value={form.claim_closed_at}
                onChange={(e) => setField('claim_closed_at', e.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {mode === 'create' ? t('common.create') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const ConfigAchatPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { currency, date } = useFormatters()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)

  const loadPurchases = async () => {
    const all = await fetchAllPages<Purchase>((page) =>
      listPurchases(id!, page),
    )
    setPurchases(all)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    Promise.all([
      fetchAllPages<Purchase>((page) => listPurchases(id!, page)),
      fetchAllPages<Supplier>((page) => listSuppliers(id!, page)),
    ])
      .then(([purchaseList, supplierList]) => {
        setPurchases(purchaseList)
        setSuppliers(supplierList)
      })
      .catch(() => setError(t('configPurchases.loadError')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const supplierName = useMemo(() => {
    const map = new Map(suppliers.map((s) => [s.id, s.name]))
    return (supplierId: number) => map.get(supplierId) ?? `#${supplierId}`
  }, [suppliers])

  const openCreate = () => {
    setDialogMode('create')
    setEditingPurchase(null)
    setDialogOpen(true)
  }

  const openEdit = (purchase: Purchase) => {
    setDialogMode('edit')
    setEditingPurchase(purchase)
    setDialogOpen(true)
  }

  const handleSaved = async () => {
    setDialogOpen(false)
    setSuccessMessage(
      dialogMode === 'create'
        ? t('configPurchases.createSuccess')
        : t('configPurchases.updateSuccess'),
    )
    await loadPurchases()
  }

  const handleSupplierCreated = (supplier: Supplier) => {
    setSuppliers((prev) =>
      prev.some((s) => s.id === supplier.id) ? prev : [...prev, supplier],
    )
  }

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
          {t('configPurchases.title')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={openCreate}
        >
          {t('configPurchases.addButton')}
        </Button>
      </Box>

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colSupplier')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colOrderNumber')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colDate')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colPrice')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colRawMaterial')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colReception')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configPurchases.colClaim')}
                </TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    {t('configPurchases.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id} hover>
                    <TableCell>{supplierName(purchase.supplier)}</TableCell>
                    <TableCell>{purchase.order_number || '—'}</TableCell>
                    <TableCell>{date(purchase.order_date)}</TableCell>
                    <TableCell>{currency(purchase.price)}</TableCell>
                    <TableCell>
                      {purchase.is_raw_material ? (
                        <Chip
                          label={t('configPurchases.yes')}
                          size="small"
                          color="primary"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.reception_checked ? (
                        <Chip
                          label={t('configPurchases.checked')}
                          size="small"
                          color="success"
                        />
                      ) : purchase.reception_date ? (
                        <Chip
                          label={t('configPurchases.received')}
                          size="small"
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {purchase.claim_text ? (
                        <Chip
                          label={
                            purchase.claim_closed_at
                              ? t('configPurchases.closed')
                              : t('configPurchases.open')
                          }
                          size="small"
                          color={
                            purchase.claim_closed_at ? 'default' : 'warning'
                          }
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('common.edit')}>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(purchase)}
                          aria-label={t('configPurchases.editPurchase')}
                        >
                          <EditRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {dialogOpen && (
        <PurchaseFormDialog
          key={`${dialogMode}-${editingPurchase?.id ?? 'new'}`}
          open={dialogOpen}
          mode={dialogMode}
          storePk={id!}
          suppliers={suppliers}
          purchase={editingPurchase}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
          onSupplierCreated={handleSupplierCreated}
        />
      )}
    </Box>
  )
}

export default ConfigAchatPage
