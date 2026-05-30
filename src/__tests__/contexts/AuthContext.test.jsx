import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
}));

import { AuthProvider } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/useAuth';
import * as authApi from '../../api/auth';

describe('AuthContext', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it('starts unauthenticated when no token in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('starts authenticated when access_token exists in localStorage', () => {
    localStorage.setItem('access_token', 'existing-token');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('login stores tokens and sets isAuthenticated to true', async () => {
    authApi.login.mockResolvedValue({ data: { access: 'acc-tok', refresh: 'ref-tok' } });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login('user@example.com', 'password');
    });

    expect(localStorage.getItem('access_token')).toBe('acc-tok');
    expect(localStorage.getItem('refresh_token')).toBe('ref-tok');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout removes tokens and sets isAuthenticated to false', () => {
    localStorage.setItem('access_token', 'tok');
    localStorage.setItem('refresh_token', 'ref');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => { result.current.logout(); });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside AuthProvider');
    spy.mockRestore();
  });
});
