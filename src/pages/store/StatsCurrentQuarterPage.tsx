import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded'
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded'
import { useTranslation } from 'react-i18next'
import { getCurrentQuarterStats, type DashboardStats } from '../../api/stores'
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

const StatsCurrentQuarterPage = () => {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { currency } = useFormatters()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
    </Box>
  )
}

export default StatsCurrentQuarterPage
