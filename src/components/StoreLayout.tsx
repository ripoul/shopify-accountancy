import { useState } from 'react'
import {
  Link as RouterLink,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import {
  ArrowBackRounded,
  BarChartRounded,
  ExpandLess,
  ExpandMore,
  MenuRounded,
  SettingsRounded,
  StorefrontRounded,
} from '@mui/icons-material'
import { useAuth } from '../contexts/useAuth'

const DRAWER_WIDTH = 240
const DRAWER_MINI = 56

const StoreLayout = () => {
  const { id } = useParams()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const statsItems = [
    { label: 'Trimestre actuel', path: `/store/${id}/stats/trimestre-actuel` },
    { label: 'All time', path: `/store/${id}/stats/all-time` },
    { label: 'Products', path: `/store/${id}/stats/products` },
  ]

  const configItems = [
    { label: 'Products', path: `/store/${id}/config/products` },
    { label: 'Achat', path: `/store/${id}/config/achat` },
    { label: 'Caisse', path: `/store/${id}/config/caisse` },
    {
      label: 'Mouvements divers',
      path: `/store/${id}/config/mouvements-divers`,
    },
    { label: 'Redevance', path: `/store/${id}/config/redevance` },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={1}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => setDrawerOpen((v) => !v)}
            sx={{ mr: 1 }}
            aria-label="toggle menu"
          >
            <MenuRounded />
          </IconButton>
          <StorefrontRounded sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Shopify Accountancy
          </Typography>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            startIcon={<ArrowBackRounded />}
            sx={{ mr: 1 }}
          >
            Mes boutiques
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Se déconnecter
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, mt: '64px' }}>
        <Drawer
          variant="permanent"
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : DRAWER_MINI,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerOpen ? DRAWER_WIDTH : DRAWER_MINI,
              boxSizing: 'border-box',
              top: '64px',
              height: 'calc(100% - 64px)',
              overflowX: 'hidden',
              transition: 'width 0.2s',
            },
          }}
        >
          <List dense>
            <ListItemButton onClick={() => setStatsOpen((v) => !v)}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <BarChartRounded />
              </ListItemIcon>
              {drawerOpen && (
                <>
                  <ListItemText
                    primary="Statistiques"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  {statsOpen ? <ExpandLess /> : <ExpandMore />}
                </>
              )}
            </ListItemButton>
            <Collapse in={drawerOpen && statsOpen} timeout="auto" unmountOnExit>
              <List dense disablePadding>
                {statsItems.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    selected={location.pathname === item.path}
                    sx={{ pl: 4 }}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>

            <Divider sx={{ my: 0.5 }} />

            <ListItemButton onClick={() => setConfigOpen((v) => !v)}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsRounded />
              </ListItemIcon>
              {drawerOpen && (
                <>
                  <ListItemText
                    primary="Config"
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  {configOpen ? <ExpandLess /> : <ExpandMore />}
                </>
              )}
            </ListItemButton>
            <Collapse
              in={drawerOpen && configOpen}
              timeout="auto"
              unmountOnExit
            >
              <List dense disablePadding>
                {configItems.map((item) => (
                  <ListItemButton
                    key={item.path}
                    component={RouterLink}
                    to={item.path}
                    selected={location.pathname === item.path}
                    sx={{ pl: 4 }}
                  >
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </List>
        </Drawer>

        <Box component="main" sx={{ flex: 1, p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default StoreLayout
