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
import { listTaxes, updateTax } from '../../api/taxes'

interface Tax {
  id: number
  quarter: string
  amount: string
  payment_date: string | null
  bank_transaction: number | null
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

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
      onSaved('Impôt mis à jour.')
    } catch {
      setError("L'enregistrement a échoué.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Impôt — {tax.quarter}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Montant dû"
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
            label="Date de paiement"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Laisser vide pour retirer la date"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
          startIcon={
            saving ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const ConfigImpotsPage = () => {
  const { id } = useParams()
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
        setError('Impossible de charger les impôts.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
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

  const handleSaved = (message: string) => {
    setEditingTax(null)
    setSuccessMessage(message)
    setReloadKey((k) => k + 1)
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Config — Impôts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Les montants sont calculés automatiquement (13,4% du CA encaissé par
          trimestre).
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
                  <TableCell sx={{ fontWeight: 600 }}>Trimestre</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Montant dû
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    Date de paiement
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
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
                      Aucun impôt enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  taxes.map((tax) => (
                    <TableRow key={tax.id} hover>
                      <TableCell>{tax.quarter}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {parseFloat(tax.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {tax.payment_date ? formatDate(tax.payment_date) : '—'}
                      </TableCell>
                      <TableCell>
                        {tax.payment_date ? (
                          <Chip label="Payé" color="success" size="small" />
                        ) : (
                          <Chip
                            label="En attente"
                            color="warning"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            tax.payment_date
                              ? 'Impôt déjà payé — non modifiable'
                              : 'Modifier'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setEditingTax(tax)}
                              aria-label="Modifier la date de paiement"
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
              {taxes.length} trimestre{taxes.length > 1 ? 's' : ''}
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
