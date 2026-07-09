import type { ReactNode } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  warning?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  open,
  title,
  message,
  warning,
  confirmLabel,
  cancelLabel,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <DialogContentText>{message}</DialogContentText>
        {warning && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {warning}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : undefined
          }
        >
          {confirmLabel ?? t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
