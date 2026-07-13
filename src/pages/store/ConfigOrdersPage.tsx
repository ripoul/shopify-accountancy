import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  AddRounded,
  CheckRounded,
  CloseRounded,
  CloudDownloadRounded,
  DateRangeRounded,
  DeleteRounded,
  EditRounded,
  KeyboardArrowDownRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { enUS, frFR } from '@mui/x-date-pickers/locales'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en-gb'
import { useTranslation } from 'react-i18next'
import {
  listOrders,
  importOrders,
  reimportOrder,
  getOrder,
  createOrderExpense,
  updateOrderExpense,
  deleteOrderExpense,
  updateOrderLineItem,
  type OrderListFilters,
} from '../../api/orders'
import { useFormatters } from '../../i18n/useFormatters'
import type { LangCode } from '../../i18n'
import ConfirmDialog from '../../components/ConfirmDialog'
import { stripedRowSx } from '../../utils/tableStyles'

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

interface ReturnLineItem {
  id: number
  title: string
  quantity: number
  amount: string
}

interface OrderReturn {
  id: number
  name: string
  status: string
  amount: string
  line_items: ReturnLineItem[]
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
  returns: OrderReturn[]
  total_returns: string
}

interface ExpenseFormData {
  type: OrderExpenseType
  amount: string
  label: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TYPE_LABEL_KEYS: Record<OrderExpenseType, string> = {
  DELIVERY: 'expenseTypeDelivery',
  PACKAGING: 'expenseTypePackaging',
  SHOPIFY_PAYMENT: 'expenseTypeShopifyPayment',
  OTHER: 'expenseTypeOther',
}

const EXPENSE_TYPE_OPTIONS: OrderExpenseType[] = [
  'DELIVERY',
  'PACKAGING',
  'SHOPIFY_PAYMENT',
  'OTHER',
]

const EMPTY_FORM: ExpenseFormData = { type: 'DELIVERY', amount: '', label: '' }

const DAYJS_LOCALE: Record<LangCode, string> = {
  fr_FR: 'fr',
  en_US: 'en',
  en_GB: 'en-gb',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidAmount = (v: string) => v !== '' && !isNaN(parseFloat(v))

const buildOrderFilters = (
  name: string,
  processedAfter: string,
  processedBefore: string,
  ordering: string,
): OrderListFilters => ({
  name: name || undefined,
  processed_after: processedAfter || undefined,
  processed_before: processedBefore || undefined,
  ordering: ordering || undefined,
})

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
  const { t } = useTranslation()
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
            {EXPENSE_TYPE_OPTIONS.map((type) => (
              <MenuItem key={type} value={type}>
                {t(`configOrders.${EXPENSE_TYPE_LABEL_KEYS[type]}`)}
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
          placeholder={t('configOrders.labelPlaceholder')}
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
            <Tooltip title={t('common.save')}>
              <span>
                <IconButton
                  size="small"
                  onClick={onSave}
                  disabled={!valid}
                  color="primary"
                  aria-label={t('configOrders.saveExpenseAriaLabel')}
                >
                  <CheckRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('common.cancel')}>
              <IconButton
                size="small"
                onClick={onCancel}
                aria-label={t('common.cancel')}
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
  const { t } = useTranslation()
  const { currency } = useFormatters()
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmDeleteExpense, setConfirmDeleteExpense] =
    useState<OrderExpense | null>(null)
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
      setLineItemSaveError(t('configOrders.saveError'))
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
      setSaveError(t('configOrders.saveError'))
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
        new Map(prev).set(expenseId, t('configOrders.deleteExpenseError')),
      )
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
    }
  }

  const openDeleteConfirm = (expense: OrderExpense) => {
    setConfirmDeleteExpense(expense)
    setDeleteDialogOpen(true)
  }

  const closeDeleteConfirm = () => {
    setDeleteDialogOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (!confirmDeleteExpense) return
    setDeleteDialogOpen(false)
    handleDelete(confirmDeleteExpense.id)
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
            {t('configOrders.articlesTitle')}
          </Typography>
          <Table size="small" component={Paper} variant="outlined">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configOrders.colProduct')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('configOrders.colQty')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('configOrders.colPurchasePrice')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('configOrders.colUnitPrice')}
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
                    {t('configOrders.noArticles')}
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
                              placeholder={t(
                                'configOrders.supplierPricePlaceholder',
                              )}
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
                            {currency(
                              parseFloat(item.unit_price) * item.quantity,
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                            {savingLineItem ? (
                              <CircularProgress size={18} />
                            ) : (
                              <>
                                <Tooltip title={t('common.save')}>
                                  <IconButton
                                    size="small"
                                    onClick={handleSaveLineItem}
                                    color="primary"
                                    aria-label={t(
                                      'configOrders.saveSupplierPriceAriaLabel',
                                    )}
                                  >
                                    <CheckRounded fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('common.cancel')}>
                                  <IconButton
                                    size="small"
                                    onClick={cancelEditLineItem}
                                    aria-label={t(
                                      'configOrders.cancelSupplierPriceEditAriaLabel',
                                    )}
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
                            ? currency(
                                parseFloat(item.distributor_price) *
                                  item.quantity,
                              )
                            : '—'}
                        </TableCell>
                        <TableCell align="right">
                          {currency(
                            parseFloat(item.unit_price) * item.quantity,
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Tooltip
                            title={t('configOrders.editSupplierPriceTooltip')}
                          >
                            <IconButton
                              size="small"
                              onClick={() => startEditLineItem(item)}
                              disabled={editingLineItem !== null}
                              aria-label={t(
                                'configOrders.editSupplierPriceAriaLabel',
                                { title: item.title },
                              )}
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
                    <TableCell>{t('configOrders.total')}</TableCell>
                    <TableCell align="right">
                      {order.line_items.reduce((s, i) => s + i.quantity, 0)}
                    </TableCell>
                    <TableCell align="right">
                      {order.line_items.some((i) => i.distributor_price != null)
                        ? currency(
                            order.line_items.reduce(
                              (s, i) =>
                                s +
                                (i.distributor_price != null
                                  ? parseFloat(i.distributor_price) * i.quantity
                                  : 0),
                              0,
                            ),
                          )
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {currency(
                        order.line_items.reduce(
                          (s, i) => s + parseFloat(i.unit_price) * i.quantity,
                          0,
                        ),
                      )}
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
              {t('configOrders.discountsTitle')}
            </Typography>
            <Table size="small" component={Paper} variant="outlined">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colCode')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colDiscountTitle')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('configOrders.colAmount')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>{discount.code || '—'}</TableCell>
                    <TableCell>{discount.title}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      -{currency(discount.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Retours */}
        {order.returns.length > 0 && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              {t('configOrders.returnsTitle')}
            </Typography>
            <Table size="small" component={Paper} variant="outlined">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colNumber')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colStatus')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colArticles')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('configOrders.colAmount')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.returns.map((orderReturn) => (
                  <TableRow key={orderReturn.id}>
                    <TableCell>{orderReturn.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={orderReturn.status}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {orderReturn.line_items.length > 0
                        ? orderReturn.line_items
                            .map((item) => `${item.title} ×${item.quantity}`)
                            .join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      -{currency(orderReturn.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow
                  sx={{
                    borderTop: '2px solid',
                    borderColor: 'divider',
                    '& td': { fontWeight: 600 },
                  }}
                >
                  <TableCell colSpan={3}>{t('configOrders.total')}</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    -{currency(order.total_returns)}
                  </TableCell>
                </TableRow>
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
              {t('configOrders.expensesTitle')}
            </Typography>
            {editing === null && (
              <Button
                size="small"
                startIcon={<AddRounded />}
                onClick={startAdd}
                aria-label={t('configOrders.addExpenseAriaLabel')}
              >
                {t('configOrders.addExpense')}
              </Button>
            )}
          </Stack>

          <Table size="small" component={Paper} variant="outlined">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configOrders.colType')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configOrders.colLabel')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('configOrders.colAmount')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {t('configOrders.colSource')}
                </TableCell>
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
                    {t('configOrders.noExpenses')}
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
                        {t(
                          `configOrders.${EXPENSE_TYPE_LABEL_KEYS[expense.type]}`,
                          { defaultValue: expense.type },
                        )}
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
                        {currency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            expense.source === 'AUTO'
                              ? t('configOrders.sourceAuto')
                              : t('configOrders.sourceManual')
                          }
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
                            <Tooltip title={t('common.edit')}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => startEdit(expense)}
                                  disabled={editing !== null}
                                  aria-label={t(
                                    'configOrders.editExpenseAriaLabel',
                                    { id: expense.id },
                                  )}
                                >
                                  <EditRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={t('common.delete')}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => openDeleteConfirm(expense)}
                                  disabled={editing !== null}
                                  color="error"
                                  aria-label={t(
                                    'configOrders.deleteExpenseAriaLabel',
                                    { id: expense.id },
                                  )}
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

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t('configOrders.deleteExpenseConfirmTitle')}
        message={t('configOrders.deleteExpenseConfirmMessage', {
          type: confirmDeleteExpense
            ? t(
                `configOrders.${EXPENSE_TYPE_LABEL_KEYS[confirmDeleteExpense.type]}`,
                { defaultValue: confirmDeleteExpense.type },
              )
            : '',
        })}
        warning={
          confirmDeleteExpense?.type === 'DELIVERY'
            ? t('configOrders.deleteExpenseWarningDelivery')
            : undefined
        }
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteConfirm}
      />
    </Box>
  )
}

// ─── ConfigOrdersPage ─────────────────────────────────────────────────────────

const ConfigOrdersPage = () => {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const { currency, date } = useFormatters()
  const [searchParams, setSearchParams] = useSearchParams()

  const nameFilter = searchParams.get('name') ?? ''
  const processedAfterFilter = searchParams.get('processed_after') ?? ''
  const processedBeforeFilter = searchParams.get('processed_before') ?? ''
  const orderingFilter = searchParams.get('ordering') ?? ''

  const setFilterParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const activeSortField = orderingFilter.replace(/^-/, '') || null
  const activeSortDirection: 'asc' | 'desc' = orderingFilter.startsWith('-')
    ? 'desc'
    : 'asc'

  const handleSort = (field: string) => {
    if (activeSortField === field) {
      setFilterParam(
        'ordering',
        activeSortDirection === 'asc' ? `-${field}` : field,
      )
    } else {
      setFilterParam('ordering', field)
    }
  }

  const [nameInput, setNameInput] = useState(nameFilter)
  const [dateFilterOpen, setDateFilterOpen] = useState(
    () => !!(processedAfterFilter || processedBeforeFilter),
  )
  const [afterValue, setAfterValue] = useState<Dayjs | null>(() =>
    processedAfterFilter ? dayjs(processedAfterFilter) : null,
  )
  const [beforeValue, setBeforeValue] = useState<Dayjs | null>(() =>
    processedBeforeFilter ? dayjs(processedBeforeFilter) : null,
  )

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

  // ── Filter sync ──────────────────────────────────────────────────────────────

  // Re-derive local filter UI state during render when the URL changes from
  // outside our own debounce/onAccept handlers (e.g. back/forward navigation).
  const [prevSearchParams, setPrevSearchParams] = useState(searchParams)
  if (searchParams !== prevSearchParams) {
    setPrevSearchParams(searchParams)
    setNameInput(searchParams.get('name') ?? '')
    const rawAfter = searchParams.get('processed_after')
    setAfterValue(rawAfter ? dayjs(rawAfter) : null)
    const rawBefore = searchParams.get('processed_before')
    setBeforeValue(rawBefore ? dayjs(rawBefore) : null)
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilterParam('name', nameInput.trim() || null)
    }, 400)
    return () => clearTimeout(handle)
  }, [nameInput, setFilterParam])

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
        const res = await listOrders(
          id,
          1,
          buildOrderFilters(
            nameFilter,
            processedAfterFilter,
            processedBeforeFilter,
            orderingFilter,
          ),
        )
        if (cancelled) return
        setOrders(res.data.results)
        setHasMore(!!res.data.next)
      } catch {
        if (cancelled) return
        setError(t('configOrders.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
    nameFilter,
    processedAfterFilter,
    processedBeforeFilter,
    orderingFilter,
  ])

  // ── Infinite scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return
    const sentinel = sentinelRef.current
    const filters = buildOrderFilters(
      nameFilter,
      processedAfterFilter,
      processedBeforeFilter,
      orderingFilter,
    )
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || busyRef.current) return
        busyRef.current = true
        setLoadingMore(true)
        try {
          const page = nextPageRef.current
          const res = await listOrders(id!, page, filters)
          setOrders((prev) => [...prev, ...res.data.results])
          setHasMore(!!res.data.next)
          nextPageRef.current = page + 1
        } catch {
          setError(t('configOrders.loadMoreError'))
        } finally {
          busyRef.current = false
          setLoadingMore(false)
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasMore,
    id,
    nameFilter,
    processedAfterFilter,
    processedBeforeFilter,
    orderingFilter,
  ])

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
      const res = await listOrders(
        id!,
        1,
        buildOrderFilters(
          nameFilter,
          processedAfterFilter,
          processedBeforeFilter,
          orderingFilter,
        ),
      )
      setOrders(res.data.results)
      setHasMore(!!res.data.next)
    } catch {
      setError(t('configOrders.importError'))
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
      setError(t('configOrders.reimportError', { name: order.name }))
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
          new Map(prev).set(order.id, t('configOrders.detailLoadError')),
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
          {t('configOrders.title')}
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
          {importing
            ? t('configOrders.importing')
            : t('configOrders.importButton')}
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ flexWrap: 'wrap', rowGap: 2 }}
        >
          <TextField
            size="small"
            placeholder={t('configOrders.searchPlaceholder')}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            sx={{ minWidth: 240 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: nameInput ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      aria-label={t('configOrders.clearSearchAriaLabel')}
                      onClick={() => {
                        setNameInput('')
                        setFilterParam('name', null)
                      }}
                    >
                      <CloseRounded fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
                inputProps: {
                  'aria-label': t('configOrders.searchAriaLabel'),
                },
              },
            }}
          />

          <Button
            size="small"
            variant={dateFilterOpen ? 'contained' : 'outlined'}
            startIcon={<DateRangeRounded />}
            onClick={() => setDateFilterOpen((prev) => !prev)}
          >
            {t('configOrders.filterByDate')}
          </Button>
        </Stack>

        <Collapse in={dateFilterOpen} timeout="auto" unmountOnExit>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale={DAYJS_LOCALE[i18n.language as LangCode]}
            localeText={
              (i18n.language === 'fr_FR' ? frFR : enUS).components
                .MuiLocalizationProvider.defaultProps.localeText
            }
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{ mt: 2, flexWrap: 'wrap', rowGap: 2 }}
            >
              <DatePicker
                label={t('configOrders.dateFrom')}
                value={afterValue}
                onChange={setAfterValue}
                onAccept={(value) =>
                  setFilterParam(
                    'processed_after',
                    value && value.isValid()
                      ? value.startOf('day').toISOString()
                      : null,
                  )
                }
                slotProps={{
                  textField: { size: 'small' },
                  field: { clearable: true },
                }}
              />
              <DatePicker
                label={t('configOrders.dateTo')}
                value={beforeValue}
                onChange={setBeforeValue}
                onAccept={(value) =>
                  setFilterParam(
                    'processed_before',
                    value && value.isValid()
                      ? value.endOf('day').toISOString()
                      : null,
                  )
                }
                slotProps={{
                  textField: { size: 'small' },
                  field: { clearable: true },
                }}
              />
            </Stack>
          </LocalizationProvider>
        </Collapse>
      </Paper>

      {importSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setImportSuccess(false)}
        >
          {t('configOrders.importSuccess')}
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
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colNumber')}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600 }}
                    sortDirection={
                      activeSortField === 'processed_at'
                        ? activeSortDirection
                        : false
                    }
                  >
                    <TableSortLabel
                      active={activeSortField === 'processed_at'}
                      direction={
                        activeSortField === 'processed_at'
                          ? activeSortDirection
                          : 'asc'
                      }
                      onClick={() => handleSort('processed_at')}
                    >
                      {t('configOrders.colDate')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configOrders.colPayment')}
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600 }}
                    align="right"
                    sortDirection={
                      activeSortField === 'total_price'
                        ? activeSortDirection
                        : false
                    }
                  >
                    <TableSortLabel
                      active={activeSortField === 'total_price'}
                      direction={
                        activeSortField === 'total_price'
                          ? activeSortDirection
                          : 'asc'
                      }
                      onClick={() => handleSort('total_price')}
                    >
                      {t('configOrders.colTotal')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 600 }}
                    align="right"
                    sortDirection={
                      activeSortField === 'net_margin'
                        ? activeSortDirection
                        : false
                    }
                  >
                    <TableSortLabel
                      active={activeSortField === 'net_margin'}
                      direction={
                        activeSortField === 'net_margin'
                          ? activeSortDirection
                          : 'asc'
                      }
                      onClick={() => handleSort('net_margin')}
                    >
                      {t('configOrders.colNetMargin')}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('configOrders.colNetResult')}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      {t('configOrders.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order, index) => {
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
                          sx={{ ...stripedRowSx(index), cursor: 'pointer' }}
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
                                  ? t('configOrders.collapseOrder', {
                                      name: order.name,
                                    })
                                  : t('configOrders.expandOrder', {
                                      name: order.name,
                                    })
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
                          <TableCell>{date(order.processed_at)}</TableCell>
                          <TableCell>{order.payment_method}</TableCell>
                          <TableCell align="right">
                            {currency(order.total_price, {
                              currency: order.currency_code,
                            })}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color:
                                parseFloat(order.net_margin) >= 0
                                  ? 'success.main'
                                  : 'error.main',
                            }}
                          >
                            {currency(order.net_margin, {
                              currency: order.currency_code,
                            })}
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
                            {currency(order.after_tax_result, {
                              currency: order.currency_code,
                            })}
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
                              <Tooltip
                                title={t('configOrders.reimportTooltip')}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleReimport(order)}
                                  aria-label={t(
                                    'configOrders.reimportAriaLabel',
                                    { name: order.name },
                                  )}
                                >
                                  <RefreshRounded fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>

                        <TableRow key={`${order.id}-detail`}>
                          <TableCell
                            colSpan={8}
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
              {hasMore
                ? t('configOrders.countLoadedMore', { count: orders.length })
                : t('configOrders.countLoaded', { count: orders.length })}
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
