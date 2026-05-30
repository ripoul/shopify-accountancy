import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { StorefrontRounded } from '@mui/icons-material';
import { useAuth } from '../contexts/useAuth';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rightAction = () => {
    if (isAuthenticated) {
      return (
        <Button color="inherit" onClick={handleLogout}>
          Se déconnecter
        </Button>
      );
    }
    if (location.pathname === '/login') {
      return (
        <Button color="inherit" component={RouterLink} to="/register">
          S'inscrire
        </Button>
      );
    }
    return (
      <Button color="inherit" component={RouterLink} to="/login">
        Se connecter
      </Button>
    );
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <StorefrontRounded sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
        >
          Shopify Accountancy
        </Typography>
        <Box>{rightAction()}</Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
