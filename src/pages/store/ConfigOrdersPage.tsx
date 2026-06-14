import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
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
import {
  AddRounded,
  CheckRounded,
  CloseRounded,
  CloudDownloadRounded,
  DeleteRounded,
  EditRounded,
  KeyboardArrowDownRounded,
  RefreshRounded,
} from '@mui/icons-material'
import {
  listOrders,
  importOrders,
  reimportOrder,
  getOrder,
  createOrderExpense,
  updateOrderExpense,
  deleteOrderExpense,
  updateOrderLineItem,
} from '../../api/orders'

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderExpenseType = 'DELIVERY' | 'PACKAGING' | 'SHOPIFY_PAYMENT' | 'OTHER'

interface OrderLineItem {
  id: number
  title: string
  quantity: number
  unit_price: string
  distributor_price: string | null
}

interface OrderDiscount {
  id: number
  code: string
  title: string
  amount: string
}

interface OrderExpense {
  id: number
  type: OrderExpenseType
  source: 'MANUAL' | 'AUTO'
  amount: string
  label: string
}

interface Order {
  id: number
  external_id: string
  name: string
  processed_at: string
  payment_method: string
  currency_code: string
  total_price: string
  cash_paid_amount: string
  net_margin: string
  after_tax_result: string
  quarter: string
}

interface FullOrder extends Order {
  line_items: OrderLineItem[]
  discounts: OrderDiscount[]
  expenses: OrderExpense[]
}

interface ExpenseFormData {
  type: OrderExpenseType
  amount: string
  label: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TYPE_LABELS: Record<OrderExpenseType, string> = {
  DELIVERY: 'Livraison',
  PACKAGING: 'Emballage',
  SHOPIFY_PAYMENT: 'Paiement Shopify',
  OTHER: 'Autre',
}

const EXPENSE_TYPE_OPTIONS: OrderExpenseType[] = [
  'DELIVERY',
  'PACKAGING',
  'SHOPIFY_PAYMENT',
  'OTHER',
]

const EMPTY_FORM: ExpenseFormData = { type: 'DELIVERY', amount: '', label: '' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const isValidAmount = (v: string) => v !== '' && !isNaN(parseFloat(v))

// ─── ExpenseFormRow ───────────────────────────────────────────────────────────

interface ExpenseFormRowProps {
  form: ExpenseFormData
  saving: boolean
  onChange: (patch: Partial<ExpenseFormData>) => void
  onSave: () => void
  onCancel: () => void
}

const ExpenseFormRow = ({
  form,
  saving,
  onChange,
  onSave,
  onCancel,
}: ExpenseFormRowProps) => {
  const valid = isValidAmount(form.amount)
  return (
    <TableRow>
      <TableCell sx={{ py: 0.5 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={form.type}
            onChange={(e) =>
              onChange({ type: e.target.value as OrderExpenseType })
            }
          >
            {EXPENSE_TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {EXPENSE_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <TextField
          size="small"
          value={form.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Libellé (optionnel)"
          sx={{ width: 200 }}
        />
      </TableCell>
      <TableCell sx={{ py: 0.5 }} align="right">
        <TextField
          size="small"
          type="number"
          value={form.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          error={form.amount !== '' && !valid}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
              inputProps: { step: '0.01' },
            },
          }}
          sx={{ width: 120 }}
        />
      </TableCell>
      <TableCell />
      <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
        {saving ? (
          <CircularProgress size={18} />
        ) : (
          <>
            <Tooltip title="Enregistrer">
              <span>
                <IconButton
                  size="small"
                  onClick={onSave}
                  disabled={!valid}
                  color="primary"
                  aria-label="Enregistrer la dépense"
                >
                  <CheckRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Annuler">
              <IconButton size="small" onClick={onCancel} aria-label="Annuler">
                <CloseRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

// ─── OrderDetailPanel ─────────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  storeId: string
  order: FullOrder
  onOrderChanged: () => void
}

const OrderDetailPanel = ({
  storeId,
  order,
  onOrderChanged,
}: OrderDetailPanelProps) => {
  const [editing, setEditing] = useState<{
    id: number | null
    form: ExpenseFormData
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())
  const [deleteErrors, setDeleteErrors] = useState<Map<number, string>>(
    new Map(),
  )
  const [editingLineItem, setEditingLineItem] = useState<{
    id: number
    draft: string
  } | null>(null)
  const [savingLineItem, setSavingLineItem] = useState(false)
  const [lineItemSaveError, setLineItemSaveError] = useState('')

  const startEditLineItem = (item: OrderLineItem) => {
    setEditingLineItem({ id: item.id, draft: item.distributor_price ?? '' })
    setLineItemSaveError('')
  }

  const cancelEditLineItem = () => {
    setEditingLineItem(null)
    setLineItemSaveError('')
  }

  const handleSaveLineItem = async () => {
    if (!editingLineItem) return
    setSavingLineItem(true)
    setLineItemSaveError('')
    try {
      await updateOrderLineItem(storeId, order.id, editingLineItem.id, {
        distributor_price:
          editingLineItem.draft === '' ? null : editingLineItem.draft,
      })
      onOrderChanged()
      setEditingLineItem(null)
    } catch {
      setLineItemSaveError('Erreur lors de la sauvegarde.')
    } finally {
      setSavingLineItem(false)
    }
  }

  const startAdd = () => {
    setEditing({ id: null, form: { ...EMPTY_FORM } })
    setSaveError('')
  }

  const startEdit = (expense: OrderExpense) => {
    setEditing({
      id: expense.id,
      form: {
        type: expense.type,
        amount: expense.amount,
        label: expense.label,
      },
    })
    setSaveError('')
  }

  const cancel = () => {
    setEditing(null)
    setSaveError('')
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    setSaveError('')
    try {
      if (editing.id === null) {
        await createOrderExpense(storeId, order.id, editing.form)
      } else {
        await updateOrderExpense(storeId, order.id, editing.id, editing.form)
      }
      onOrderChanged()
      setEditing(null)
    } catch {
      setSaveError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (expenseId: number) => {
    setDeletingIds((prev) => new Set(prev).add(expenseId))
    setDeleteErrors((prev) => {
      const next = new Map(prev)
      next.delete(expenseId)
      return next
    })
    try {
      await deleteOrderExpense(storeId, order.id, expenseId)
      onOrderChanged()
    } catch {
      setDeleteErrors((prev) =>
        new Map(prev).set(expenseId, 'Erreur lors de la suppression.'),
      )
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
    }
  }

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack spacing={3}>
        {/* Articles */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Articles
          </Typography>
          <Table size="small" component={Paper} variant="outlined">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Produit</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Qté
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Prix d&apos;achat
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Prix unitaire
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {order.line_items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ color: 'text.secondary' }}
                  >
                    Aucun article.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {order.line_items.map((item) => {
                    const isEditingThis = editingLineItem?.id === item.id
                    if (isEditingThis) {
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{item.title}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={editingLineItem.draft}
                              onChange={(e) =>
                                setEditingLineItem((prev) =>
                                  prev
                                    ? { ...prev, draft: e.target.value }
                                    : prev,
                                )
                              }
                              placeholder="Prix / unité"
                              slotProps={{
                                input: {
                                  endAdornment: (
                                    <InputAdornment position="end">
                                      €
                                    </InputAdornment>
                                  ),
                                  inputProps: { step: '0.01', min: '0' },
                                },
                              }}
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {(
                              parseFloat(item.unit_price) * item.quantity
                            ).toFixed(2)}{' '}
                            €
                          </TableCell>
                          <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                            {savingLineItem ? (
                              <CircularProgress size={18} />
                            ) : (
                              <>
                                <Tooltip title="Enregistrer">
                                  <IconButton
                                    size="small"
                                    onClick={handleSaveLineItem}
                                    color="primary"
                                    aria-label="Enregistrer le prix fournisseur"
                                  >
                                    <CheckRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Annuler">
                                  <IconButton
                                    size="small"
                                    onClick={cancelEditLineItem}
                                    aria-label="Annuler la modification du prix fournisseur"
                                  >
                                    <CloseRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    }
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: 'text.secondary' }}
                        >
                          {item.distributor_price != null
                            ? `${(parseFloat(item.distributor_price) * item.quantity).toFixed(2)} €`
                            : '—'}
                        </TableCell>
                        <TableCell align="right">
                          {(
                            parseFloat(item.unit_price) * item.quantity
                          ).toFixed(2)}{' '}
                          €
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Tooltip title="Modifier le prix fournisseur">
                            <IconButton
                              size="small"
                              onClick={() => startEditLineItem(item)}
                              disabled={editingLineItem !== null}
                              aria-label={`Modifier le prix fournisseur de ${item.title}`}
                            >
                              <EditRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow
                    sx={{
                      borderTop: '2px solid',
                      borderColor: 'divider',
                      '& td': { fontWeight: 600 },
                    }}
                  >
                    <TableCell>Total</TableCell>
                    <TableCell align="right">
                      {order.line_items.reduce((s, i) => s + i.quantity, 0)}
                    </TableCell>
                    <TableCell align="right">
                      {order.line_items.some((i) => i.distributor_price != null)
                        ? `${order.line_items
                            .reduce(
                              (s, i) =>
                                s +
                                (i.distributor_price != null
                                  ? parseFloat(i.distributor_price) * i.quantity
                                  : 0),
                              0,
                            )
                            .toFixed(2)} €`
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {order.line_items
                        .reduce(
                          (s, i) => s + parseFloat(i.unit_price) * i.quantity,
                          0,
                        )
                        .toFixed(2)}{' '}
                      €
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
          {lineItemSaveError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {lineItemSaveError}
            </Alert>
          )}
        </Box>

        {/* Remises */}
        {order.discounts.length > 0 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Remises
            </Typography>
            <Table size="small" component={Paper} variant="outlined">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Titre</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Montant
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>{discount.code || '—'}</TableCell>
                    <TableCell>{discount.title}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      -{parseFloat(discount.amount).toFixed(2)} €
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Dépenses */}
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Dépenses
            </Typography>
            {editing === null && (
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={startAdd}
                aria-label="Ajouter une dépense"
              >
                Ajouter
              </Button>
            )}
          </Stack>

          <Table size="small" component={Paper} variant="outlined">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Libellé</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Montant
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {order.expenses.length === 0 && editing?.id !== null && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ color: 'text.secondary' }}
                  >
                    Aucune dépense pour cette commande.
                  </TableCell>
                </TableRow>
              )}

              {order.expenses.map((expense) => {
                const isEditing = editing?.id === expense.id
                const isDeleting = deletingIds.has(expense.id)
                const deleteError = deleteErrors.get(expense.id)

                if (isEditing) {
                  return (
                    <ExpenseFormRow
                      key={expense.id}
                      form={editing!.form}
                      saving={saving}
                      onChange={(patch) =>
                        setEditing((prev) =>
                          prev
                            ? { ...prev, form: { ...prev.form, ...patch } }
                            : prev,
                        )
                      }
                      onSave={handleSave}
                      onCancel={cancel}
                    />
                  )
                }

                return (
                  <>
                    <TableRow key={expense.id}>
                      <TableCell>
                        {EXPENSE_TYPE_LABELS[expense.type] ?? expense.type}
                      </TableCell>
                      <TableCell>{expense.label || '—'}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            parseFloat(expense.amount) < 0
                              ? 'error.main'
                              : 'inherit',
                        }}
                      >
                        {parseFloat(expense.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.source === 'AUTO' ? 'Auto' : 'Manuel'}
                          size="small"
                          variant="outlined"
                          color={
                            expense.source === 'MANUAL' ? 'primary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {isDeleting ? (
                          <CircularProgress size={16} />
                        ) : expense.source === 'MANUAL' ? (
                          <>
                            <Tooltip title="Modifier">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => startEdit(expense)}
                                  disabled={editing !== null}
                                  aria-label={`Modifier la dépense ${expense.id}`}
                                >
                                  <EditRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(expense.id)}
                                  disabled={editing !== null}
                                  color="error"
                                  aria-label={`Supprimer la dépense ${expense.id}`}
                                >
                                  <DeleteRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {deleteError && (
                      <TableRow key={`${expense.id}-err`}>
                        <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                          <Alert severity="error" sx={{ py: 0.5 }}>
                            {deleteError}
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}

              {/* New expense form row */}
              {editing?.id === null && (
                <ExpenseFormRow
                  key="new-expense"
                  form={editing.form}
                  saving={saving}
                  onChange={(patch) =>
                    setEditing((prev) =>
                      prev
                        ? { ...prev, form: { ...prev.form, ...patch } }
                        : prev,
                    )
                  }
                  onSave={handleSave}
                  onCancel={cancel}
                />
              )}
            </TableBody>
          </Table>

          {saveError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

// ─── ConfigOrdersPage ─────────────────────────────────────────────────────────

const ConfigOrdersPage = () => {
  const { id } = useParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const [reimportingIds, setReimportingIds] = useState<Set<number>>(new Set())
  const [reimportedIds, setReimportedIds] = useState<Set<number>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [fullOrders, setFullOrders] = useState<Map<number, FullOrder>>(
    new Map(),
  )
  const [loadingDetailIds, setLoadingDetailIds] = useState<Set<number>>(
    new Set(),
  )
  const [detailErrors, setDetailErrors] = useState<Map<number, string>>(
    new Map(),
  )
  const nextPageRef = useRef(2)
  const busyRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    nextPageRef.current = 2
    busyRef.current = false
    let cancelled = false
    const load = async () => {
      setOrders([])
      setLoading(true)
      setError('')
      setHasMore(false)
      setExpandedIds(new Set())
      setFullOrders(new Map())
      try {
        const res = await listOrders(id, 1)
        if (cancelled) return
        setOrders(res.data.results)
        setHasMore(!!res.data.next)
      } catch {
        if (cancelled) return
        setError('Impossible de charger les commandes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  // ── Infinite scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return
    const sentinel = sentinelRef.current
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || busyRef.current) return
        busyRef.current = true
        setLoadingMore(true)
        try {
          const page = nextPageRef.current
          const res = await listOrders(id!, page)
          setOrders((prev) => [...prev, ...res.data.results])
          setHasMore(!!res.data.next)
          nextPageRef.current = page + 1
        } catch {
          setError('Erreur lors du chargement.')
        } finally {
          busyRef.current = false
          setLoadingMore(false)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, id])

  // ── Import all orders ───────────────────────────────────────────────────────

  const handleImport = async () => {
    setImporting(true)
    setError('')
    setImportSuccess(false)
    try {
      await importOrders(id!)
      setImportSuccess(true)
      nextPageRef.current = 2
      busyRef.current = false
      setExpandedIds(new Set())
      setFullOrders(new Map())
      const res = await listOrders(id!, 1)
      setOrders(res.data.results)
      setHasMore(!!res.data.next)
    } catch {
      setError("L'import a échoué.")
    } finally {
      setImporting(false)
    }
  }

  // ── Re-import single order ──────────────────────────────────────────────────

  const handleReimport = async (order: Order) => {
    setReimportingIds((prev) => new Set(prev).add(order.id))
    setReimportedIds((prev) => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    try {
      await reimportOrder(id!, order.external_id)
      // Refresh full order detail if it was loaded
      if (fullOrders.has(order.id)) {
        const res = await getOrder(id!, order.id)
        setFullOrders((prev) => new Map(prev).set(order.id, res.data))
      }
      setReimportedIds((prev) => new Set(prev).add(order.id))
      setTimeout(
        () =>
          setReimportedIds((prev) => {
            const next = new Set(prev)
            next.delete(order.id)
            return next
          }),
        2000,
      )
    } catch {
      setError(`Impossible de re-importer la commande ${order.name}.`)
    } finally {
      setReimportingIds((prev) => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  // ── Expand / collapse ───────────────────────────────────────────────────────

  const toggleExpand = async (order: Order) => {
    const isOpen = expandedIds.has(order.id)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (isOpen) next.delete(order.id)
      else next.add(order.id)
      return next
    })

    if (!isOpen && !fullOrders.has(order.id)) {
      setLoadingDetailIds((prev) => new Set(prev).add(order.id))
      setDetailErrors((prev) => {
        const next = new Map(prev)
        next.delete(order.id)
        return next
      })
      try {
        const res = await getOrder(id!, order.id)
        setFullOrders((prev) => new Map(prev).set(order.id, res.data))
      } catch {
        setDetailErrors((prev) =>
          new Map(prev).set(order.id, 'Impossible de charger les détails.'),
        )
      } finally {
        setLoadingDetailIds((prev) => {
          const next = new Set(prev)
          next.delete(order.id)
          return next
        })
      }
    }
  }

  // ── Order refresh after any mutation ───────────────────────────────────────

  const handleOrderChanged = async (orderId: number) => {
    if (!id) return
    try {
      const res = await getOrder(id, orderId)
      setFullOrders((prev) => new Map(prev).set(orderId, res.data))
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...res.data } : o)),
      )
    } catch {
      // mutation succeeded — silently ignore refresh failure
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

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
          Config — Commandes
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
          {importing ? 'Import en cours…' : 'Importer les commandes'}
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
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
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
                  <TableCell sx={{ fontWeight: 600 }}>N°</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Paiement</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Total
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Caisse
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Trimestre</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Marge nette
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Résultat net
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      Aucune commande. Cliquez sur &quot;Importer les
                      commandes&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const expanded = expandedIds.has(order.id)
                    const isLoadingDetail = loadingDetailIds.has(order.id)
                    const detailError = detailErrors.get(order.id)
                    const fullOrder = fullOrders.get(order.id)
                    const isReimporting = reimportingIds.has(order.id)
                    const isReimported = reimportedIds.has(order.id)

                    return (
                      <>
                        <TableRow
                          key={order.id}
                          hover
                          onClick={() => toggleExpand(order)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell
                            sx={{ p: 0.5, textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(order)}
                              aria-label={
                                expanded
                                  ? `Réduire la commande ${order.name}`
                                  : `Développer la commande ${order.name}`
                              }
                            >
                              <KeyboardArrowDownRounded
                                fontSize="small"
                                sx={{
                                  transition: 'transform 0.2s',
                                  transform: expanded
                                    ? 'rotate(180deg)'
                                    : 'none',
                                  color: 'text.secondary',
                                }}
                              />
                            </IconButton>
                          </TableCell>
                          <TableCell>{order.name}</TableCell>
                          <TableCell>
                            {formatDate(order.processed_at)}
                          </TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell align="right">
                            {parseFloat(order.total_price).toFixed(2)}{' '}
                            {order.currency_code}
                          </TableCell>
                          <TableCell align="right">
                            {parseFloat(order.cash_paid_amount).toFixed(2)}{' '}
                            {order.currency_code}
                          </TableCell>
                          <TableCell>{order.quarter}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color:
                                parseFloat(order.net_margin) >= 0
                                  ? 'success.main'
                                  : 'error.main',
                            }}
                          >
                            {parseFloat(order.net_margin).toFixed(2)}{' '}
                            {order.currency_code}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color:
                                parseFloat(order.after_tax_result) >= 0
                                  ? 'success.main'
                                  : 'error.main',
                            }}
                          >
                            {parseFloat(order.after_tax_result).toFixed(2)}{' '}
                            {order.currency_code}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ width: 48 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isReimporting ? (
                              <CircularProgress size={18} />
                            ) : isReimported ? (
                              <CheckRounded color="success" fontSize="small" />
                            ) : (
                              <Tooltip title="Re-importer cette commande">
                                <IconButton
                                  size="small"
                                  onClick={() => handleReimport(order)}
                                  aria-label={`Re-importer la commande ${order.name}`}
                                >
                                  <RefreshRounded fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>

                        <TableRow key={`${order.id}-detail`}>
                          <TableCell
                            colSpan={10}
                            sx={{ p: 0, border: expanded ? undefined : 0 }}
                          >
                            <Collapse
                              in={expanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              {isLoadingDetail ? (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    py: 3,
                                    bgcolor: 'grey.50',
                                  }}
                                >
                                  <CircularProgress size={24} />
                                </Box>
                              ) : detailError ? (
                                <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                  <Alert severity="error">{detailError}</Alert>
                                </Box>
                              ) : fullOrder ? (
                                <OrderDetailPanel
                                  storeId={id!}
                                  order={fullOrder}
                                  onOrderChanged={() =>
                                    handleOrderChanged(order.id)
                                  }
                                />
                              ) : null}
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

          {orders.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              {orders.length} commande{orders.length > 1 ? 's' : ''} chargée
              {orders.length > 1 ? 's' : ''}
              {hasMore ? ' (faites défiler pour plus)' : ''}
            </Typography>
          )}
        </>
      )}

      {loadingMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />
    </Box>
  )
}

export default ConfigOrdersPage
