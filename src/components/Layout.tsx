import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

interface LayoutProps {
  children?: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Navbar />
    {children ?? <Outlet />}
  </>
)

export default Layout
