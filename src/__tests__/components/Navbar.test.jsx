import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/useAuth';

describe('Navbar', () => {
  afterEach(() => { vi.clearAllMocks(); });

  it('shows logout button when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() });
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByText('Se déconnecter')).toBeInTheDocument();
  });

  it('shows register button on /login page when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText("S'inscrire")).toBeInTheDocument();
  });

  it('shows login button on other pages when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Navbar />
      </MemoryRouter>
    );
    expect(screen.getByText('Se connecter')).toBeInTheDocument();
  });

  it('calls logout and navigates to /login when logout button is clicked', () => {
    const mockLogout = vi.fn();
    useAuth.mockReturnValue({ isAuthenticated: true, logout: mockLogout });
    render(<MemoryRouter><Navbar /></MemoryRouter>);

    fireEvent.click(screen.getByText('Se déconnecter'));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders the brand title as a link', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    expect(screen.getByText('Shopify Accountancy')).toBeInTheDocument();
  });
});
