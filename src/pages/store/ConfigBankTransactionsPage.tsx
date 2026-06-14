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
  MenuItem,
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
import {
  AccountBalanceRounded,
  AddRounded,
  EditRounded,
} from '@mui/icons-material'
import {
  createBankTransaction,
  listBankTransactions,
  updateBankTransaction,
} from '../../api/transactions'
import { listStores } from '../../api/stores'

type BankTransactionSource =
  | 'ORDER'
  | 'EMPTY_CASHBOX'
  | 'FILL_CASHBOX'
  | 'OTHER'

type BankTxCreateSource = 'FILL_CASHBOX' | 'OTHER'

interface BankTransaction {
  id: number
  title: string
  date: string
  amount: string
  source: BankTransactionSource
  order: number | null
}

const SOURCE_LABELS: Record<BankTransactionSource, string> = {
  ORDER: 'Commande',
  EMPTY_CASHBOX: 'Vidage caisse',
  FILL_CASHBOX: 'Alimentation caisse',
  OTHER: 'Autre',
}

const CREATE_SOURCE_OPTIONS: { value: BankTxCreateSource; label: string }[] = [
  { value: 'FILL_CASHBOX', label: 'Alimentation caisse' },
  { value: 'OTHER', label: 'Autre' },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

interface TxFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  storePk: string
  transaction: BankTransaction | null
  onClose: () => void
  onSaved: (message: string) => void
}

const emptyForm = { title: '', date: '', amount: '' }

const TxFormDialog = ({
  open,
  mode,
  storePk,
  transaction,
  onClose,
  onSaved,
}: TxFormDialogProps) => {
  const [createSource, setCreateSource] =
    useState<BankTxCreateSource>('FILL_CASHBOX')
  const [form, setForm] = useState(() =>
    mode === 'edit' && transaction
      ? {
          title: transaction.title,
          date: transaction.date,
          amount: transaction.amount,
        }
      : emptyForm,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (key: keyof typeof emptyForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const canSubmit =
    form.title.trim() !== '' &&
    form.date.trim() !== '' &&
    form.amount.trim() !== ''

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      if (mode === 'create') {
        await createBankTransaction(storePk, { source: createSource, ...form })
        onSaved('Transaction créée avec succès.')
      } else if (transaction) {
        await updateBankTransaction(storePk, transaction.id, form)
        onSaved('Transaction mise à jour.')
      }
    } catch {
      setError("L'enregistrement a échoué.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {mode === 'create'
          ? 'Ajouter une transaction'
          : 'Modifier la transaction'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {mode === 'create' ? (
            <TextField
              select
              label="Source"
              value={createSource}
              onChange={(e) =>
                setCreateSource(e.target.value as BankTxCreateSource)
              }
              fullWidth
            >
              {CREATE_SOURCE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Source"
              value={SOURCE_LABELS[transaction!.source] ?? transaction!.source}
              disabled
              fullWidth
            />
          )}
          <TextField
            label="Titre"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setField('date', e.target.value)}
            required
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Montant"
            type="number"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                inputProps: { step: '0.01' },
              },
            }}
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
          {mode === 'create' ? 'Créer' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const ConfigBankTransactionsPage = () => {
  const { id } = useParams()
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [bankAmount, setBankAmount] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [editingTx, setEditingTx] = useState<BankTransaction | null>(null)
  const nextPageRef = useRef(2)
  const busyRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listStores()
      .then((res) => {
        const store = (
          res.data.results as { id: number; bank_amount?: string }[]
        ).find((s) => s.id === Number(id))
        if (store?.bank_amount != null) setBankAmount(store.bank_amount)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    nextPageRef.current = 2
    busyRef.current = false
    let cancelled = false
    const load = async () => {
      setTransactions([])
      setLoading(true)
      setError('')
      setHasMore(false)
      try {
        const res = await listBankTransactions(id, 1)
        if (cancelled) return
        setTransactions(res.data.results)
        setHasMore(!!res.data.next)
      } catch {
        if (cancelled) return
        setError('Impossible de charger les transactions bancaires.')
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
          const res = await listBankTransactions(id!, page)
          setTransactions((prev) => [...prev, ...res.data.results])
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

  const openCreate = () => {
    setDialogMode('create')
    setEditingTx(null)
    setDialogOpen(true)
  }

  const openEdit = (tx: BankTransaction) => {
    setDialogMode('edit')
    setEditingTx(tx)
    setDialogOpen(true)
  }

  const handleSaved = (message: string) => {
    setDialogOpen(false)
    setSuccessMessage(message)
    setReloadKey((k) => k + 1)
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
          Config — Bank Transactions
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {bankAmount != null && (
            <Chip
              icon={<AccountBalanceRounded />}
              label={`Solde bancaire : ${parseFloat(bankAmount).toFixed(2)} €`}
              color="primary"
              variant="outlined"
            />
          )}
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={openCreate}
          >
            Ajouter
          </Button>
        </Box>
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
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Titre</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    Montant
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Commande</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align="center"
                      sx={{ py: 4, color: 'text.secondary' }}
                    >
                      Aucune transaction bancaire.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>{tx.title}</TableCell>
                      <TableCell>
                        {SOURCE_LABELS[tx.source] ?? tx.source}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            parseFloat(tx.amount) >= 0
                              ? 'success.main'
                              : 'error.main',
                          fontWeight: 500,
                        }}
                      >
                        {parseFloat(tx.amount) >= 0 ? '+' : ''}
                        {parseFloat(tx.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {tx.order != null ? `#${tx.order}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(tx)}
                            aria-label="Modifier la transaction"
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

          {transactions.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              {transactions.length} transaction
              {transactions.length > 1 ? 's' : ''}
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

      {dialogOpen && (
        <TxFormDialog
          key={`${dialogMode}-${editingTx?.id ?? 'new'}`}
          open={dialogOpen}
          mode={dialogMode}
          storePk={id!}
          transaction={editingTx}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </Box>
  )
}

export default ConfigBankTransactionsPage
