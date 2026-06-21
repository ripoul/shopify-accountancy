import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { getQuartersHistory, type QuarterHistoryItem } from '../../api/stores'

type MetricKey =
  | 'revenue'
  | 'cash_variation'
  | 'profit_before_tax'
  | 'profit_after_tax'
  | 'profit_after_tax_after_purchase'
  | 'order_count'
  | 'average_profit_per_order'
  | 'average_basket'

interface MetricDef {
  key: MetricKey
  label: string
  color: string
  axis: 'euros' | 'count'
}

type ChartRow = Record<MetricKey, number> & { period: string }

const METRICS: MetricDef[] = [
  { key: 'revenue', label: 'CA', color: '#5C6BC0', axis: 'euros' },
  {
    key: 'cash_variation',
    label: 'Trésorerie',
    color: '#26A69A',
    axis: 'euros',
  },
  {
    key: 'profit_before_tax',
    label: 'Marge avant impôts',
    color: '#FFA726',
    axis: 'euros',
  },
  {
    key: 'profit_after_tax',
    label: 'Résultat net',
    color: '#66BB6A',
    axis: 'euros',
  },
  {
    key: 'profit_after_tax_after_purchase',
    label: 'Résultat net (post-achats)',
    color: '#EF5350',
    axis: 'euros',
  },
  { key: 'order_count', label: 'Commandes', color: '#AB47BC', axis: 'count' },
  {
    key: 'average_profit_per_order',
    label: 'Bénéfice / commande',
    color: '#EC407A',
    axis: 'euros',
  },
  {
    key: 'average_basket',
    label: 'Panier moyen',
    color: '#78909C',
    axis: 'euros',
  },
]

const DEFAULT_VISIBLE = new Set<MetricKey>([
  'revenue',
  'profit_after_tax',
  'order_count',
])

const formatEuros = (v: number | null) =>
  v !== null
    ? new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(v)
    : ''

const toChartRow = (q: QuarterHistoryItem): ChartRow => ({
  period: q.period,
  revenue: parseFloat(q.revenue),
  cash_variation: parseFloat(q.cash_variation),
  profit_before_tax: parseFloat(q.profit_before_tax),
  profit_after_tax: parseFloat(q.profit_after_tax),
  profit_after_tax_after_purchase: parseFloat(
    q.profit_after_tax_after_purchase,
  ),
  order_count: q.order_count,
  average_profit_per_order: parseFloat(q.average_profit_per_order),
  average_basket: parseFloat(q.average_basket),
})

const StatsAllTimePage = () => {
  const { id } = useParams<{ id: string }>()
  const [history, setHistory] = useState<QuarterHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState<Set<MetricKey>>(DEFAULT_VISIBLE)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await getQuartersHistory(id)
        if (!cancelled) setHistory(res.data)
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

  if (error) {
    return (
      <Alert severity="error">
        Impossible de charger l'historique des trimestres.
      </Alert>
    )
  }

  if (history.length === 0) {
    return <Alert severity="info">Aucune donnée disponible.</Alert>
  }

  const toggle = (key: MetricKey) => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const visibleMetrics = METRICS.filter((m) => visible.has(m.key))
  const hasEuros = visibleMetrics.some((m) => m.axis === 'euros')
  const hasCount = visibleMetrics.some((m) => m.axis === 'count')
  const chartData = history.map(toChartRow)

  const yAxes = [
    ...(hasEuros
      ? [
          {
            id: 'euros',
            position: 'left' as const,
            valueFormatter: (v: number) =>
              `${Math.round(v).toLocaleString('fr-FR')} €`,
          },
        ]
      : []),
    ...(hasCount
      ? [
          {
            id: 'count',
            position: (hasEuros ? 'right' : 'left') as 'left' | 'right',
          },
        ]
      : []),
  ]

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Évolution par trimestre
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {METRICS.map((m) => {
          const active = visible.has(m.key)
          return (
            <Chip
              key={m.key}
              label={m.label}
              onClick={() => toggle(m.key)}
              variant={active ? 'filled' : 'outlined'}
              sx={{
                bgcolor: active ? m.color : undefined,
                color: active ? '#fff' : m.color,
                borderColor: m.color,
                fontWeight: 600,
                '&:hover': {
                  bgcolor: active ? m.color : `${m.color}22`,
                },
              }}
            />
          )
        })}
      </Stack>
      {visibleMetrics.length === 0 ? (
        <Alert severity="info">
          Sélectionnez au moins une métrique à afficher.
        </Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <LineChart
            dataset={chartData as Record<string, number | string>[]}
            xAxis={[{ dataKey: 'period', scaleType: 'point' }]}
            yAxis={yAxes}
            series={visibleMetrics.map((m) => ({
              dataKey: m.key,
              label: m.label,
              color: m.color,
              yAxisId: m.axis === 'count' ? 'count' : 'euros',
              valueFormatter: (v: number | null) =>
                m.axis === 'euros' ? formatEuros(v) : String(v ?? ''),
            }))}
            height={420}
          />
        </Box>
      )}
    </Box>
  )
}

export default StatsAllTimePage
