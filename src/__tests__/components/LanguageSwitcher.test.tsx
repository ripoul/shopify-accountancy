import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../api/profile', () => ({
  updateProfile: vi.fn(),
}))

import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuth } from '../../contexts/useAuth'
import { updateProfile } from '../../api/profile'
import i18n from '../../i18n'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUseAuth = useAuth as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateProfile = updateProfile as any

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Changer de langue' }))
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockUpdateProfile.mockResolvedValue({})
  })

  afterEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('fr_FR')
    localStorage.clear()
  })

  it('shows the current language flag on the trigger button', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    render(<LanguageSwitcher />)
    expect(
      screen.getByRole('button', { name: 'Changer de langue' }),
    ).toBeInTheDocument()
  })

  it('opens a dropdown listing every supported language', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)

    expect(
      screen.getByRole('menuitem', { name: /Français/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /English \(US\)/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /English \(UK\)/ }),
    ).toBeInTheDocument()
  })

  it('marks the active language with the selected (high-contrast) state', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)

    expect(screen.getByRole('menuitem', { name: /Français/ })).toHaveClass(
      'Mui-selected',
    )
    expect(
      screen.getByRole('menuitem', { name: /English \(US\)/ }),
    ).not.toHaveClass('Mui-selected')
  })

  it('switches the active language and persists it to localStorage', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /English \(US\)/ }))

    await waitFor(() => expect(i18n.language).toBe('en_US'))
    expect(localStorage.getItem('lang')).toBe('en_US')
  })

  it('closes the dropdown after selecting a language', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /English \(US\)/ }))

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
    )
  })

  it('does not call updateProfile when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /English \(UK\)/ }))

    await waitFor(() => expect(i18n.language).toBe('en_GB'))
    expect(mockUpdateProfile).not.toHaveBeenCalled()
  })

  it('calls updateProfile with the new language when authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true })
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /English \(US\)/ }))

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith('en_US'))
  })
})
