import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { EditRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { listTaxes, updateTax } from '../../api/taxes'
import { useFormatters } from '../../i18n/useFormatters'

interface Tax {
  id: number
  quarter: string
  amount: string
  payment_date: string | null
  bank_transaction: number | null
}

interface TaxFormDialogProps {
  open: boolean
  storePk: string
  tax: Tax
  onClose: () => void
  onSaved: (message: string) => void
}

const TaxFormDialog = ({
  open,
  storePk,
  tax,
  onClose,
  onSaved,
}: TaxFormDialogProps) => {
  const { t } = useTranslation()
  const [paymentDate, setPaymentDate] = useState(tax.payment_date ?? '')
  const [amount, setAmount] = useState(tax.amount)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = amount.trim() !== '' && !isNaN(parseFloat(amount))

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await updateTax(storePk, tax.id, {
        payment_date: paymentDate === '' ? null : paymentDate,
        amount,
      })
      onSaved(t('configTaxes.updateSuccess'))
    } catch {
      setError(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {t('configTaxes.dialogTitle', { quarter: tax.quarter })}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('configTaxes.colAmountDue')}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                inputProps: { step: '0.01', min: '0' },
              },
            }}
          />
          <TextField
            label={t('configTaxes.colPaymentDate')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText={t('configTaxes.paymentDateHelper')}
          />
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
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const ConfigImpotsPage = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { currency, date } = useFormatters()
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingTax, setEditingTax] = useState<Tax | null>(null)
  const nextPageRef = useRef(2)
  const busyRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    nextPageRef.current = 2
    busyRef.current = false
    let cancelled = false
    const load = async () => {
      setTaxes([])
      setLoading(true)
      setError('')
      setHasMore(false)
      try {
        const res = await listTaxes(id, 1)
        if (cancelled) return
        setTaxes(res.data.results)
        setHasMore(!!res.data.next)
      } catch {
        if (cancelled) return
        setError(t('configTaxes.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reloadKey])

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
          const res = await listTaxes(id!, page)
          setTaxes((prev) => [...prev, ...res.data.results])
          setHasMore(!!res.data.next)
          nextPageRef.current = page + 1
        } catch {
          setError(t('configTaxes.loadMoreError'))
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
  }, [hasMore, id])

  const handleSaved = (message: string) => {
    setEditingTax(null)
    setSuccessMessage(message)
    setReloadKey((k) => k + 1)
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('configTaxes.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('configTaxes.subtitle')}
        </Typography>
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
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configTaxes.colQuarter')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t('configTaxes.colAmountDue')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configTaxes.colPaymentDate')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {t('configTaxes.colStatus')}
                  </TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {taxes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      {t('configTaxes.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  taxes.map((tax) => (
                    <TableRow key={tax.id} hover>
                      <TableCell>{tax.quarter}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {currency(tax.amount)}
                      </TableCell>
                      <TableCell>
                        {tax.payment_date ? date(tax.payment_date) : '—'}
                      </TableCell>
                      <TableCell>
                        {tax.payment_date ? (
                          <Chip
                            label={t('configTaxes.paid')}
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip
                            label={t('configTaxes.pending')}
                            color="warning"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            tax.payment_date
                              ? t('configTaxes.alreadyPaidTooltip')
                              : t('common.edit')
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setEditingTax(tax)}
                              aria-label={t('configTaxes.editAriaLabel')}
                              disabled={!!tax.payment_date}
                            >
                              <EditRounded fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {taxes.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              {hasMore
                ? t('configTaxes.countMore', { count: taxes.length })
                : t('configTaxes.count', { count: taxes.length })}
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

      {editingTax && (
        <TaxFormDialog
          key={editingTax.id}
          open
          storePk={id!}
          tax={editingTax}
          onClose={() => setEditingTax(null)}
          onSaved={handleSaved}
        />
      )}
    </Box>
  )
}

export default ConfigImpotsPage
