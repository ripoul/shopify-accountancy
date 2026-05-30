import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import { connectStore } from '../api/stores';

const REQUIRED_PARAMS = ['shop', 'code', 'hmac', 'host', 'state', 'timestamp'];

const ShopifyCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useMemo(
    () => Object.fromEntries(REQUIRED_PARAMS.map((k) => [k, searchParams.get(k)])),
    [searchParams]
  );
  const hasMissingParams = REQUIRED_PARAMS.some((k) => !params[k]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const visibleStatus = hasMissingParams ? 'missing_params' : status;

  useEffect(() => {
    if (hasMissingParams) {
      return;
    }

    const run = async () => {
      try {
        await connectStore(params);
        navigate('/', { replace: true });
      } catch (err) {
        const data = err.response?.data;
        if (data) {
          const messages = Object.values(data).flat().join(' ');
          setErrorMessage(messages || 'Une erreur est survenue.');
        } else {
          setErrorMessage('Impossible de connecter la boutique. Veuillez réessayer.');
        }
        setStatus('error');
      }
    };

    run();
  }, [hasMissingParams, navigate, params]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          {visibleStatus === 'loading' && (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="h6">Connexion de votre boutique Shopify…</Typography>
            </>
          )}

          {visibleStatus === 'error' && (
            <>
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                {errorMessage}
              </Alert>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </>
          )}

          {visibleStatus === 'missing_params' && (
            <>
              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                Paramètres Shopify manquants. Ce lien semble invalide.
              </Alert>
              <Button variant="outlined" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ShopifyCallbackPage;
