import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

interface LayoutProps {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Navbar />
    <Box sx={{ flex: 1 }}>{children ?? <Outlet />}</Box>
    <Footer />
  </Box>
)

export default Layout
