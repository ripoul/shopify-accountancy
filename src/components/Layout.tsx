import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => (
  <>
    <Navbar />
    {children}
  </>
)

export default Layout
