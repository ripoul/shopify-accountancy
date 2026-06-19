import { Box, Link, Typography } from '@mui/material'

const Footer = () => (
  <Box
    component="footer"
    sx={{
      py: 2,
      textAlign: 'center',
      borderTop: '1px solid',
      borderColor: 'divider',
      mt: 'auto',
    }}
  >
    <Typography variant="body2" color="text.secondary">
      {'© 2026 '}
      <Link
        href="https://github.com/ripoul"
        target="_blank"
        rel="noopener noreferrer"
        underline="hover"
        color="inherit"
        sx={{ fontWeight: 700 }}
      >
        ripoul
      </Link>
    </Typography>
  </Box>
)

export default Footer
