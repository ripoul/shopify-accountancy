import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '../../components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Supprimer ?"
        message="Voulez-vous vraiment supprimer cet élément ?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText('Supprimer ?')).not.toBeInTheDocument()
  })

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Voulez-vous vraiment supprimer cet élément ?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Supprimer ?')).toBeInTheDocument()
    expect(
      screen.getByText('Voulez-vous vraiment supprimer cet élément ?'),
    ).toBeInTheDocument()
  })

  it('does not render a warning alert by default', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the warning alert when provided', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        warning="N'oubliez pas l'achat associé."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      "N'oubliez pas l'achat associé.",
    )
  })

  it('renders the error alert when provided', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        error="Erreur lors de la suppression."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Erreur lors de la suppression.',
    )
  })

  it('defaults confirm/cancel labels to common.delete / common.cancel', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Supprimer' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
  })

  it('uses custom confirm/cancel labels when provided', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        confirmLabel="Oui, supprimer"
        cancelLabel="Non"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Oui, supprimer' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non' })).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while loading', () => {
    render(
      <ConfirmDialog
        open
        title="Supprimer ?"
        message="Message"
        loading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled()
  })
})
