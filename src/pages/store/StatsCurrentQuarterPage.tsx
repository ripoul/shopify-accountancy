import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import SaveRounded from '@mui/icons-material/SaveRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import { useTranslation } from 'react-i18next'
import {
  getCurrentQuarterStats,
  getTreasuryStats,
  updateStore,
  type DashboardStats,
  type TreasuryStats,
} from '../../api/stores'
import { useFormatters } from '../../i18n/useFormatters'

const calcDiff = (
  current: string | number,
  previous: string | number,
): number | null => {
  const cur = parseFloat(String(current))
  const prev = parseFloat(String(previous))
  if (!prev || isNaN(cur) || isNaN(prev)) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

interface StatCardProps {
  label: string
  value: string
  diff: number | null
  exactCurrent: string
  exactPrevious: string
}

const StatCard = ({
  label,
  value,
  diff,
  exactCurrent,
  exactPrevious,
}: StatCardProps) => {
  const { t } = useTranslation()
  const { percent } = useFormatters()
  const isUp = diff !== null && diff > 0
  const isDown = diff !== null && diff < 0
  const trendColor = isUp
    ? 'success.main'
    : isDown
      ? 'error.main'
      : 'text.secondary'

  return (
    <Tooltip
      title={
        <>
          <Typography variant="caption" component="div">
            {t('statsQuarter.tooltipCurrent', { value: exactCurrent })}
          </Typography>
          <Typography variant="caption" component="div">
            {t('statsQuarter.tooltipPrevious', { value: exactPrevious })}
          </Typography>
        </>
      }
    >
      <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
          {value}
        </Typography>
        {diff !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isUp && (
              <ArrowUpwardRounded
                sx={{ color: 'success.main', fontSize: 20 }}
              />
            )}
            {isDown && (
              <ArrowDownwardRounded
                sx={{ color: 'error.main', fontSize: 20 }}
              />
            )}
            <Typography variant="body2" fontWeight={600} color={trendColor}>
              {percent(diff / 100, { signDisplay: 'exceptZero' })}
            </Typography>
          </Box>
        )}
      </Paper>
    </Tooltip>
  )
}

interface TreasuryCardProps {
  label: string
  value: string
}

const TreasuryCard = ({ label, value }: TreasuryCardProps) => (
  <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {label}
    </Typography>
    <Typography variant="h4" fontWeight={700} sx={{ my: 1 }}>
      {value}
    </Typography>
  </Paper>
)

interface InvestableAmountCardProps {
  label: string
  value: string
  treasury: TreasuryStats
  onEditReserve: () => void
}

const InvestableAmountCard = ({
  label,
  value,
  treasury,
  onEditReserve,
}: InvestableAmountCardProps) => {
  const { t } = useTranslation()
  const { currency } = useFormatters()
  const exact = (v: string) =>
    currency(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const isNegative = parseFloat(treasury.investable_amount) < 0

  return (
    <Tooltip
      title={
        <>
          <Typography variant="caption" component="div">
            {t('statsQuarter.investableTooltipBank', {
              value: exact(treasury.bank_amount),
            })}
          </Typography>
          <Typography variant="caption" component="div">
            {t('statsQuarter.investableTooltipTaxes', {
              value: exact(treasury.unpaid_taxes_amount),
            })}
          </Typography>
          <Typography variant="caption" component="div">
            {t('statsQuarter.investableTooltipRoyalties', {
              value: exact(treasury.unpaid_royalties_amount),
            })}
          </Typography>
          <Typography variant="caption" component="div">
            {t('statsQuarter.investableTooltipReserve', {
              value: exact(treasury.fixed_costs_reserve),
            })}
          </Typography>
          <Divider sx={{ my: 0.5, opacity: 0.5 }} />
          <Typography variant="caption" component="div" fontWeight={700}>
            {t('statsQuarter.investableTooltipResult', {
              value: exact(treasury.investable_amount),
            })}
          </Typography>
        </>
      }
    >
      <Paper elevation={2} sx={{ p: 3, height: '100%', position: 'relative' }}>
        <IconButton
          size="small"
          onClick={onEditReserve}
          aria-label={t('statsQuarter.editReserve')}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <SettingsRounded fontSize="small" />
        </IconButton>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {isNegative && (
            <Box
              component="span"
              role="img"
              aria-label={t('statsQuarter.investableNegative')}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'error.main',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
      </Paper>
    </Tooltip>
  )
}

interface ReserveDialogProps {
  storePk: string
  currentValue: string
  onClose: () => void
  onSaved: () => void
}

const ReserveDialog = ({
  storePk,
  currentValue,
  onClose,
  onSaved,
}: ReserveDialogProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(currentValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit =
    value.trim() !== '' && !isNaN(parseFloat(value)) && parseFloat(value) >= 0

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      await updateStore(storePk, { fixed_costs_reserve: value })
      onSaved()
    } catch {
      setError(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('statsQuarter.editReserveTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('statsQuarter.reserveFieldLabel')}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            helperText={t('statsQuarter.reserveFieldHelper')}
            autoFocus
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
                inputProps: { step: '0.01', min: '0' },
              },
            }}
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
            saving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveRounded fontSize="small" />
            )
          }
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const StatsCurrentQuarterPage = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currency } = useFormatters()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [treasury, setTreasury] = useState<TreasuryStats | null>(null)
  const [treasuryLoading, setTreasuryLoading] = useState(true)
  const [treasuryError, setTreasuryError] = useState(false)
  const [treasuryReloadKey, setTreasuryReloadKey] = useState(0)
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false)
  const [reserveSuccess, setReserveSuccess] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await getCurrentQuarterStats(id)
        if (!cancelled) setData(res.data)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setTreasuryLoading(true)
      setTreasuryError(false)
      try {
        const res = await getTreasuryStats(id)
        if (!cancelled) setTreasury(res.data)
      } catch {
        if (!cancelled) setTreasuryError(true)
      } finally {
        if (!cancelled) setTreasuryLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, treasuryReloadKey])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !data) {
    return <Alert severity="error">{t('statsQuarter.loadError')}</Alert>
  }

  const { current_quarter: cq, previous_quarter: pq } = data

  const currencyStat = (
    label: string,
    current: string,
    previous: string,
  ): StatCardProps => ({
    label,
    value: currency(current, { maximumFractionDigits: 0 }),
    diff: calcDiff(current, previous),
    exactCurrent: currency(current, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    exactPrevious: currency(previous, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  })

  const cards: StatCardProps[] = [
    currencyStat(t('statsQuarter.revenue'), cq.revenue, pq.revenue),
    currencyStat(
      t('statsQuarter.cashVariation'),
      cq.cash_variation,
      pq.cash_variation,
    ),
    currencyStat(
      t('statsQuarter.profitBeforeTax'),
      cq.profit_before_tax,
      pq.profit_before_tax,
    ),
    currencyStat(
      t('statsQuarter.profitAfterTax'),
      cq.profit_after_tax,
      pq.profit_after_tax,
    ),
    currencyStat(
      t('statsQuarter.profitAfterTaxAfterPurchase'),
      cq.profit_after_tax_after_purchase,
      pq.profit_after_tax_after_purchase,
    ),
    {
      label: t('statsQuarter.orderCount'),
      value: String(cq.order_count),
      diff: calcDiff(cq.order_count, pq.order_count),
      exactCurrent: String(cq.order_count),
      exactPrevious: String(pq.order_count),
    },
    currencyStat(
      t('statsQuarter.avgProfitPerOrder'),
      cq.average_profit_per_order,
      pq.average_profit_per_order,
    ),
    currencyStat(
      t('statsQuarter.avgBasket'),
      cq.average_basket,
      pq.average_basket,
    ),
  ]

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        {t('statsQuarter.title')}
        <Typography
          component="span"
          variant="body2"
          color="text.secondary"
          sx={{ ml: 2 }}
        >
          {cq.period} · {cq.start_date} → {cq.end_date}
        </Typography>
      </Typography>
      <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
        {t('statsQuarter.treasuryTitle')}
      </Typography>

      {reserveSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setReserveSuccess('')}
        >
          {reserveSuccess}
        </Alert>
      )}

      {treasuryLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : treasuryError || !treasury ? (
        <Alert severity="error">{t('statsQuarter.treasuryLoadError')}</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TreasuryCard
              label={t('statsQuarter.bankAmount')}
              value={currency(treasury.bank_amount)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TreasuryCard
              label={t('statsQuarter.cashAmount')}
              value={currency(treasury.cash_amount)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <InvestableAmountCard
              label={t('statsQuarter.investableAmount')}
              value={currency(treasury.investable_amount)}
              treasury={treasury}
              onEditReserve={() => setReserveDialogOpen(true)}
            />
          </Grid>
        </Grid>
      )}

      {reserveDialogOpen && treasury && (
        <ReserveDialog
          storePk={id!}
          currentValue={treasury.fixed_costs_reserve}
          onClose={() => setReserveDialogOpen(false)}
          onSaved={() => {
            setReserveDialogOpen(false)
            setReserveSuccess(t('statsQuarter.reserveUpdateSuccess'))
            setTreasuryReloadKey((k) => k + 1)
          }}
        />
      )}
    </Box>
  )
}

export default StatsCurrentQuarterPage
