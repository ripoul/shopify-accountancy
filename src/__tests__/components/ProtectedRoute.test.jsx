import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/useAuth';

describe('ProtectedRoute', () => {
  afterEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('saves Shopify pending params to sessionStorage when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={['/?shop=test.myshopify.com&hmac=abc123']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(sessionStorage.getItem('shopify_pending_params')).toBeTruthy();
  });

  it('does not save to sessionStorage when Shopify params are absent', () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(sessionStorage.getItem('shopify_pending_params')).toBeNull();
  });
});
