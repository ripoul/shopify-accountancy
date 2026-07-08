import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material'
import { StorefrontRounded } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/useAuth'
import LanguageSwitcher from './LanguageSwitcher'

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const rightAction = () => {
    if (isAuthenticated) {
      return (
        <Button color="inherit" onClick={handleLogout}>
          {t('nav.logout')}
        </Button>
      )
    }
    if (location.pathname === '/login') {
      return (
        <Button color="inherit" component={RouterLink} to="/register">
          {t('nav.register')}
        </Button>
      )
    }
    return (
      <Button color="inherit" component={RouterLink} to="/login">
        {t('nav.login')}
      </Button>
    )
  }

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <StorefrontRounded sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 700,
          }}
        >
          Shopify Accountancy
        </Typography>
        <LanguageSwitcher />
        <Box sx={{ ml: 1 }}>{rightAction()}</Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
