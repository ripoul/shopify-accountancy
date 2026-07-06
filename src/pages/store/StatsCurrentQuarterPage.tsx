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
import { getCurrentQuarterStats, type DashboardStats } from '../../api/stores'

const formatCurrency = (value: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(parseFloat(value))

const formatCurrencyExact = (value: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(value))

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
            Trimestre actuel : {exactCurrent}
          </Typography>
          <Typography variant="caption" component="div">
            Trimestre précédent : {exactPrevious}
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
              {diff > 0 ? '+' : ''}
              {diff.toFixed(1)}%
            </Typography>
          </Box>
        )}
      </Paper>
    </Tooltip>
  )
}

const StatsCurrentQuarterPage = () => {
  const { id } = useParams<{ id: string }>()
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
    return (
      <Alert severity="error">
        Impossible de charger les statistiques du trimestre.
      </Alert>
    )
  }

  const { current_quarter: cq, previous_quarter: pq } = data

  const currencyStat = (
    label: string,
    current: string,
    previous: string,
  ): StatCardProps => ({
    label,
    value: formatCurrency(current),
    diff: calcDiff(current, previous),
    exactCurrent: formatCurrencyExact(current),
    exactPrevious: formatCurrencyExact(previous),
  })

  const cards: StatCardProps[] = [
    currencyStat("Chiffre d'affaires", cq.revenue, pq.revenue),
    currencyStat(
      'Variation de trésorerie',
      cq.cash_variation,
      pq.cash_variation,
    ),
    currencyStat(
      'Marge avant impôts',
      cq.profit_before_tax,
      pq.profit_before_tax,
    ),
    currencyStat(
      'Résultat après impôts',
      cq.profit_after_tax,
      pq.profit_after_tax,
    ),
    currencyStat(
      'Résultat après impôts et achats',
      cq.profit_after_tax_after_purchase,
      pq.profit_after_tax_after_purchase,
    ),
    {
      label: 'Nombre de commandes',
      value: String(cq.order_count),
      diff: calcDiff(cq.order_count, pq.order_count),
      exactCurrent: String(cq.order_count),
      exactPrevious: String(pq.order_count),
    },
    currencyStat(
      'Bénéfice moyen / commande',
      cq.average_profit_per_order,
      pq.average_profit_per_order,
    ),
    currencyStat('Panier moyen', cq.average_basket, pq.average_basket),
  ]

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Trimestre actuel
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
