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
import { useTranslation } from 'react-i18next'
import { getQuartersHistory, type QuarterHistoryItem } from '../../api/stores'
import { useFormatters } from '../../i18n/useFormatters'

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
  labelKey:
    | 'revenue'
    | 'cashVariation'
    | 'profitBeforeTax'
    | 'profitAfterTax'
    | 'profitAfterTaxAfterPurchase'
    | 'orderCount'
    | 'avgProfitPerOrder'
    | 'avgBasket'
  color: string
  axis: 'euros' | 'count'
}

type ChartRow = Record<MetricKey, number> & { period: string }

const METRICS: MetricDef[] = [
  { key: 'revenue', labelKey: 'revenue', color: '#5C6BC0', axis: 'euros' },
  {
    key: 'cash_variation',
    labelKey: 'cashVariation',
    color: '#26A69A',
    axis: 'euros',
  },
  {
    key: 'profit_before_tax',
    labelKey: 'profitBeforeTax',
    color: '#FFA726',
    axis: 'euros',
  },
  {
    key: 'profit_after_tax',
    labelKey: 'profitAfterTax',
    color: '#66BB6A',
    axis: 'euros',
  },
  {
    key: 'profit_after_tax_after_purchase',
    labelKey: 'profitAfterTaxAfterPurchase',
    color: '#EF5350',
    axis: 'euros',
  },
  {
    key: 'order_count',
    labelKey: 'orderCount',
    color: '#AB47BC',
    axis: 'count',
  },
  {
    key: 'average_profit_per_order',
    labelKey: 'avgProfitPerOrder',
    color: '#EC407A',
    axis: 'euros',
  },
  {
    key: 'average_basket',
    labelKey: 'avgBasket',
    color: '#78909C',
    axis: 'euros',
  },
]

const DEFAULT_VISIBLE = new Set<MetricKey>([
  'revenue',
  'profit_after_tax',
  'order_count',
])

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
  const { t } = useTranslation()
  const { currency } = useFormatters()
  const metricLabel = (m: MetricDef) => t(`statsHistory.${m.labelKey}`)
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
    return <Alert severity="error">{t('statsHistory.loadError')}</Alert>
  }

  if (history.length === 0) {
    return <Alert severity="info">{t('common.noData')}</Alert>
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
              currency(v, { maximumFractionDigits: 0 }),
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
        {t('statsHistory.title')}
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {METRICS.map((m) => {
          const active = visible.has(m.key)
          return (
            <Chip
              key={m.key}
              label={metricLabel(m)}
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
        <Alert severity="info">{t('statsHistory.noMetricSelected')}</Alert>
      ) : (
        <Box sx={{ width: '100%' }}>
          <LineChart
            dataset={chartData as Record<string, number | string>[]}
            xAxis={[{ dataKey: 'period', scaleType: 'point' }]}
            yAxis={yAxes}
            series={visibleMetrics.map((m) => ({
              dataKey: m.key,
              label: metricLabel(m),
              color: m.color,
              yAxisId: m.axis === 'count' ? 'count' : 'euros',
              valueFormatter: (v: number | null) =>
                m.axis === 'euros'
                  ? v !== null
                    ? currency(v, { maximumFractionDigits: 0 })
                    : ''
                  : String(v ?? ''),
            }))}
            height={420}
          />
        </Box>
      )}
    </Box>
  )
}

export default StatsAllTimePage
