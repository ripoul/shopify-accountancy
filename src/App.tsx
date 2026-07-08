import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import StoreLayout from './components/StoreLayout'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import ShopifyInstallPage from './pages/ShopifyInstallPage'
import ShopifyCallbackPage from './pages/ShopifyCallbackPage'
import HomePage from './pages/HomePage'
import StatsCurrentQuarterPage from './pages/store/StatsCurrentQuarterPage'
import StatsAllTimePage from './pages/store/StatsAllTimePage'
import StatsProductsPage from './pages/store/StatsProductsPage'
import ConfigProductsPage from './pages/store/ConfigProductsPage'
import ConfigAchatPage from './pages/store/ConfigAchatPage'
import ConfigOrdersPage from './pages/store/ConfigOrdersPage'
import ConfigBankTransactionsPage from './pages/store/ConfigBankTransactionsPage'
import ConfigCaissePage from './pages/store/ConfigCaissePage'
import ConfigRedevancePage from './pages/store/ConfigRedevancePage'
import ConfigImpotsPage from './pages/store/ConfigImpotsPage'

const theme = createTheme({
  palette: {
    primary: { main: '#5C6BC0' },
  },
})

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shopify/install"
              element={
                <ProtectedRoute>
                  <ShopifyInstallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shopify/auth/callback"
              element={
                <ProtectedRoute>
                  <ShopifyCallbackPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            path="/store/:id"
            element={
              <ProtectedRoute>
                <StoreLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="stats/current-quarter" replace />}
            />
            <Route
              path="stats/current-quarter"
              element={<StatsCurrentQuarterPage />}
            />
            <Route path="stats/all-time" element={<StatsAllTimePage />} />
            <Route path="stats/products" element={<StatsProductsPage />} />
            <Route path="config/products" element={<ConfigProductsPage />} />
            <Route path="config/purchases" element={<ConfigAchatPage />} />
            <Route path="config/orders" element={<ConfigOrdersPage />} />
            <Route
              path="config/bank-transactions"
              element={<ConfigBankTransactionsPage />}
            />
            <Route path="config/cash" element={<ConfigCaissePage />} />
            <Route path="config/royalties" element={<ConfigRedevancePage />} />
            <Route path="config/taxes" element={<ConfigImpotsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)

export default App
