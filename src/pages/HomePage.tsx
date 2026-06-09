import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  CardActionArea,
  CircularProgress,
  Container,
  Typography,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
} from '@mui/material'
import { StorefrontRounded } from '@mui/icons-material'
import { listStores } from '../api/stores'

interface Store {
  id: number
  name: string
  shop_domain: string
  scopes?: string
}

interface StoreCardProps {
  store: Store
}

const StoreCard = ({ store }: StoreCardProps) => (
  <Card variant="outlined">
    <CardActionArea component={RouterLink} to={`/store/${store.id}`}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <StorefrontRounded color="primary" />
          <Typography variant="h6" fontWeight={600}>
            {store.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {store.shop_domain}
        </Typography>
        {store.scopes && (
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {store.scopes.split(',').map((scope) => (
              <Chip
                key={scope.trim()}
                label={scope.trim()}
                size="small"
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </CardContent>
    </CardActionArea>
  </Card>
)

const HomePage = () => {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await listStores()
        setStores(response.data.results as Store[])
      } catch {
        setError('Impossible de charger les boutiques.')
      } finally {
        setLoading(false)
      }
    }
    fetchStores()
  }, [])

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Mes boutiques
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && stores.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Aucune boutique connectée. Initiez une connexion depuis Shopify.
        </Alert>
      )}

      {!loading && !error && stores.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {stores.map((store) => (
            <Grid key={store.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <StoreCard store={store} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  )
}

export default HomePage
