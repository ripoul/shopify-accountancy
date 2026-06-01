import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../api/auth', () => ({
  register: vi.fn(),
}))

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import RegisterPage from '../../pages/RegisterPage'
import { register } from '../../api/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRegister = register as any

describe('RegisterPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields and the submit button', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^nom/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /créer mon compte/i }),
    ).toBeInTheDocument()
  })

  it('navigates to /login with registered=true on successful registration', async () => {
    mockRegister.mockResolvedValue({})
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { registered: true },
      })
    })
  })

  it('shows flattened API error messages on registration failure', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { email: ['Cet email est déjà utilisé.'] } },
    })
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/cet email est déjà utilisé/i),
      ).toBeInTheDocument()
    })
  })

  it('shows generic error when no response data', async () => {
    mockRegister.mockRejectedValue({})
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    await waitFor(() => {
      expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument()
    })
  })

  it('updates form fields on change', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )
    const firstNameInput = screen.getByLabelText(/prénom/i) as HTMLInputElement
    fireEvent.change(firstNameInput, {
      target: { name: 'firstName', value: 'Alice' },
    })
    expect(firstNameInput.value).toBe('Alice')
  })

  it('disables the submit button while loading', async () => {
    let resolve: (value: unknown) => void
    mockRegister.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }))

    expect(
      screen.getByRole('button', { name: /création en cours/i }),
    ).toBeDisabled()
    resolve!({})
  })
})
