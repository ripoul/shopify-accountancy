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
  Divider,
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
import { EditRounded, SaveRounded } from '@mui/icons-material'
import { listRoyalties, updateRoyalty } from '../../api/royalties'
import { getStore, updateStore } from '../../api/stores'

interface Royalty {
  id: number
  quarter: string
  amount: string
  payment_date: string | null
  bank_transaction: number | null
  sum_after_tax_result: string
  sum_purchase_price: string
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

interface RoyaltyFormDialogProps {
  open: boolean
  storePk: string
  royalty: Royalty
  onClose: () => void
  onSaved: (message: string) => void
}

const RoyaltyFormDialog = ({
  open,
  storePk,
  royalty,
  onClose,
  onSaved,
}: RoyaltyFormDialogProps) => {
  const [paymentDate, setPaymentDate] = useState(royalty.payment_date ?? '')
  const [amount, setAmount] = useState(royalty.amount)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = amount.trim() !== '' && !isNaN(parseFloat(amount))

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await updateRoyalty(storePk, royalty.id, {
        payment_date: paymentDate === '' ? null : paymentDate,
        amount,
      })
      onSaved('Redevance mise à jour.')
    } catch {
      setError("L'enregistrement a échoué.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Redevance — {royalty.quarter}</DialogTitle>
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

const ConfigRedevancePage = () => {
  const { id } = useParams()

  const [royaltyRate, setRoyaltyRate] = useState('')
  const [royaltyRateDraft, setRoyaltyRateDraft] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [loadingRate, setLoadingRate] = useState(true)
  const [rateError, setRateError] = useState('')

  const [royalties, setRoyalties] = useState<Royalty[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingRoyalty, setEditingRoyalty] = useState<Royalty | null>(null)

  const nextPageRef = useRef(2)
  const busyRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const rateChanged =
    royaltyRateDraft !== royaltyRate && royaltyRateDraft.trim() !== ''
  const rateValid =
    !isNaN(parseFloat(royaltyRateDraft)) && parseFloat(royaltyRateDraft) >= 0

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoadingRate(true)
      try {
        const res = await getStore(id)
        if (cancelled) return
        const rate = res.data.royalty_rate ?? ''
        setRoyaltyRate(rate)
        setRoyaltyRateDraft(rate)
      } catch {
        if (!cancelled)
          setRateError('Impossible de charger le taux de redevance.')
      } finally {
        if (!cancelled) setLoadingRate(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    nextPageRef.current = 2
    busyRef.current = false
    let cancelled = false
    const load = async () => {
      setRoyalties([])
      setLoading(true)
      setError('')
      setHasMore(false)
      try {
        const res = await listRoyalties(id, 1)
        if (cancelled) return
        setRoyalties(res.data.results)
        setHasMore(!!res.data.next)
      } catch {
        if (cancelled) return
        setError('Impossible de charger les redevances.')
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
          const res = await listRoyalties(id!, page)
          setRoyalties((prev) => [...prev, ...res.data.results])
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

  const handleSaveRate = async () => {
    if (!id) return
    setSavingRate(true)
    setRateError('')
    try {
      await updateStore(id, { royalty_rate: royaltyRateDraft })
      setRoyaltyRate(royaltyRateDraft)
      setSuccessMessage('Taux de redevance mis à jour.')
    } catch {
      setRateError("L'enregistrement du taux a échoué.")
    } finally {
      setSavingRate(false)
    }
  }

  const handleSaved = (message: string) => {
    setEditingRoyalty(null)
    setSuccessMessage(message)
    setReloadKey((k) => k + 1)
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Config — Redevance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Le taux est appliqué automatiquement sur le CA encaissé par trimestre.
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

      {rateError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRateError('')}>
          {rateError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Taux de redevance
        </Typography>
        {loadingRate ? (
          <CircularProgress size={20} />
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              type="number"
              value={royaltyRateDraft}
              onChange={(e) => setRoyaltyRateDraft(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                  inputProps: { step: '0.01', min: '0', max: '100' },
                },
              }}
              sx={{ width: 160 }}
            />
            {rateChanged && (
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveRate}
                disabled={savingRate || !rateValid}
                startIcon={
                  savingRate ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <SaveRounded fontSize="small" />
                  )
                }
              >
                Enregistrer
              </Button>
            )}
            {rateChanged && (
              <Button
                size="small"
                onClick={() => setRoyaltyRateDraft(royaltyRate)}
                disabled={savingRate}
              >
                Annuler
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      <Divider sx={{ mb: 3 }} />

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
                    CA HT
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Achats
                  </TableCell>
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
                {royalties.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      Aucune redevance enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  royalties.map((royalty) => (
                    <TableRow key={royalty.id} hover>
                      <TableCell>{royalty.quarter}</TableCell>
                      <TableCell align="right">
                        {parseFloat(royalty.sum_after_tax_result).toFixed(2)} €
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(royalty.sum_purchase_price).toFixed(2)} €
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500 }}>
                        {parseFloat(royalty.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {royalty.payment_date
                          ? formatDate(royalty.payment_date)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {royalty.payment_date ? (
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
                            royalty.payment_date
                              ? 'Redevance déjà payée — non modifiable'
                              : 'Modifier'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => setEditingRoyalty(royalty)}
                              aria-label="Modifier la redevance"
                              disabled={!!royalty.payment_date}
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

          {royalties.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              {royalties.length} trimestre{royalties.length > 1 ? 's' : ''}
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

      {editingRoyalty && (
        <RoyaltyFormDialog
          key={editingRoyalty.id}
          open
          storePk={id!}
          royalty={editingRoyalty}
          onClose={() => setEditingRoyalty(null)}
          onSaved={handleSaved}
        />
      )}
    </Box>
  )
}

export default ConfigRedevancePage
