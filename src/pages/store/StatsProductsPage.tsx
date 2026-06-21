import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import SearchRounded from '@mui/icons-material/SearchRounded'
import {
  getProductStats,
  getVariantStats,
  listCollections,
  type ProductStats,
  type VariantStats,
} from '../../api/products'

interface Collection {
  id: number
  external_id: string
  title: string
}

type Mode = 'product' | 'variant'
type SortDir = 'asc' | 'desc'

const DEBOUNCE_MS = 300

const formatEuros = (v: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(parseFloat(v))

const formatRate = (v: string) => `${(parseFloat(v) * 100).toFixed(2)} %`

const getVal = (
  row: ProductStats | VariantStats,
  key: string,
): string | number => {
  if (key === 'product_title') return (row as VariantStats).product_title ?? ''
  if (key === 'total_sold' || key === 'orders_containing')
    return (row as Record<string, number>)[key]
  if (
    key === 'net_gain' ||
    key === 'net_gain_per_unit' ||
    key === 'occurrence_rate'
  )
    return parseFloat((row as Record<string, string>)[key])
  return (row as Record<string, string>)[key] ?? ''
}

const compareRows = (
  a: ProductStats | VariantStats,
  b: ProductStats | VariantStats,
  key: string,
  dir: SortDir,
): number => {
  const av = getVal(a, key)
  const bv = getVal(b, key)
  if (av < bv) return dir === 'asc' ? -1 : 1
  if (av > bv) return dir === 'asc' ? 1 : -1
  return 0
}

const fetchAllCollections = async (storePk: string): Promise<Collection[]> => {
  const all: Collection[] = []
  let page = 1
  while (true) {
    const res = await listCollections(storePk, page)
    const { results, next } = res.data as {
      results: Collection[]
      next: string | null
    }
    all.push(...results)
    if (!next) break
    page++
  }
  return all
}

const StatsProductsPage = () => {
  const { id } = useParams<{ id: string }>()
  const [mode, setMode] = useState<Mode>('product')
  const [rows, setRows] = useState<(ProductStats | VariantStats)[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [apiName, setApiName] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<number | null>(
    null,
  )
  const [sortKey, setSortKey] = useState('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Load collections once (shared between both modes)
  useEffect(() => {
    if (!id) return
    fetchAllCollections(id)
      .then(setCollections)
      .catch(() => {})
  }, [id])

  // Debounce name input → apiName
  useEffect(() => {
    const timer = setTimeout(() => setApiName(nameInput), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [nameInput])

  // Fetch rows whenever mode / server-side filters change
  useEffect(() => {
    if (!id) return
    let cancelled = false
    const params: { name?: string; collection?: number } = {}
    if (apiName) params.name = apiName
    if (selectedCollection !== null) params.collection = selectedCollection

    const load = async () => {
      setLoading(true)
      setError(false)
      try {
        const res =
          mode === 'product'
            ? await getProductStats(id, params)
            : await getVariantStats(id, params)
        if (!cancelled) setRows(res.data)
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
  }, [id, mode, apiName, selectedCollection])

  const handleModeChange = (_: React.MouseEvent, next: Mode | null) => {
    if (!next) return
    setMode(next)
    setNameInput('')
    setApiName('')
    setSelectedCollection(null)
    setSortKey('title')
    setSortDir('asc')
  }

  const handleCollectionToggle = (colId: number) => {
    setSelectedCollection((prev) => (prev === colId ? null : colId))
  }

  const handleSort = (col: string) => {
    if (sortKey === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [rows, sortKey, sortDir],
  )

  const sortCell = (col: string, label: string) => (
    <TableCell sortDirection={sortKey === col ? sortDir : false}>
      <TableSortLabel
        active={sortKey === col}
        direction={sortKey === col ? sortDir : 'asc'}
        onClick={() => handleSort(col)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  )

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Statistiques produits
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="product">Produit</ToggleButton>
          <ToggleButton value="variant">Variante</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Stack spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Rechercher par nom…"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          sx={{ width: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        {collections.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {collections.map((col) => (
              <Chip
                key={col.id}
                label={col.title}
                size="small"
                color={selectedCollection === col.id ? 'primary' : 'default'}
                variant={selectedCollection === col.id ? 'filled' : 'outlined'}
                onClick={() => handleCollectionToggle(col.id)}
                clickable
              />
            ))}
          </Box>
        )}
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error">
          Impossible de charger les statistiques produits.
        </Alert>
      )}

      {!loading && !error && sortedRows.length === 0 && (
        <Alert severity="info">Aucune donnée disponible.</Alert>
      )}

      {!loading && !error && sortedRows.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {mode === 'variant' && sortCell('product_title', 'Produit')}
                {sortCell('title', mode === 'variant' ? 'Variante' : 'Nom')}
                {sortCell('total_sold', 'Qté vendue')}
                {sortCell('net_gain', 'Gain net')}
                {sortCell('net_gain_per_unit', 'Gain / unité')}
                {sortCell('orders_containing', 'Nb commandes')}
                {sortCell('occurrence_rate', 'Taux')}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.id} hover>
                  {mode === 'variant' && (
                    <TableCell>{(row as VariantStats).product_title}</TableCell>
                  )}
                  <TableCell>{row.title}</TableCell>
                  <TableCell align="right">{row.total_sold}</TableCell>
                  <TableCell align="right">
                    {formatEuros(row.net_gain)}
                  </TableCell>
                  <TableCell align="right">
                    {formatEuros(row.net_gain_per_unit)}
                  </TableCell>
                  <TableCell align="right">{row.orders_containing}</TableCell>
                  <TableCell align="right">
                    {formatRate(row.occurrence_rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

export default StatsProductsPage
