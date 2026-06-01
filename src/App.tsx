import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import RegisterPage from './pages/RegisterPage'
import LoginPage from './pages/LoginPage'
import ShopifyInstallPage from './pages/ShopifyInstallPage'
import ShopifyCallbackPage from './pages/ShopifyCallbackPage'
import HomePage from './pages/HomePage'

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
        <Layout>
          <Routes>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
)

export default App
