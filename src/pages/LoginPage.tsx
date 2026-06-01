import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Box,
  Button,
  Container,
  Link,
  TextField,
  Typography,
  Alert,
  Paper,
} from '@mui/material'
import { useAuth } from '../contexts/useAuth'

const SHOPIFY_PENDING_KEY = 'shopify_pending_params'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const registeredSuccess = (location.state as { registered?: boolean } | null)
    ?.registered

  useEffect(() => {
    if ((location.state as { registered?: boolean } | null)?.registered) {
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)

      const pendingRedirect = sessionStorage.getItem(SHOPIFY_PENDING_KEY)
      if (pendingRedirect) {
        sessionStorage.removeItem(SHOPIFY_PENDING_KEY)
        navigate(pendingRedirect, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      const data = (err as { response?: { data?: { detail?: string } } })
        .response?.data
      if (data?.detail) {
        setError(data.detail)
      } else {
        setError('Email ou mot de passe incorrect.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" component="h1" gutterBottom fontWeight={600}>
            Connexion
          </Typography>

          {registeredSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Compte créé avec succès. Connectez-vous.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              fullWidth
              margin="normal"
              required
              autoFocus
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              fullWidth
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </Box>

          <Typography variant="body2" align="center">
            Pas encore de compte ?{' '}
            <Link component={RouterLink} to="/register">
              S'inscrire
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}

export default LoginPage
