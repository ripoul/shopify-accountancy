import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: false, logout: vi.fn() })),
}))

import Layout from '../../components/Layout'

describe('Layout', () => {
  it('renders Navbar and children', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Child Content</div>
        </Layout>
      </MemoryRouter>,
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
    expect(screen.getByText('Shopify Accountancy')).toBeInTheDocument()
  })
})
