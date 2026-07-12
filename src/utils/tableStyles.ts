import type { SxProps, Theme } from '@mui/material/styles'

export const stripedRowSx = (index: number): SxProps<Theme> =>
  index % 2 === 1 ? { bgcolor: 'action.hover' } : {}
