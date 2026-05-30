import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

const SHOPIFY_PENDING_KEY = 'shopify_pending_params';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const shopifyParams = new URLSearchParams(location.search);
    const hasShopifyParams = shopifyParams.has('shop') && shopifyParams.has('hmac');

    if (hasShopifyParams) {
      sessionStorage.setItem(SHOPIFY_PENDING_KEY, location.pathname + location.search);
    }

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
