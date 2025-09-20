import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import UserNavbar from './components/UserNavbar'

function App() {
  const { pathname } = useLocation()
  // Show UserNavbar for user-facing routes (prefix '/user') and for the root homepage '/'
  const showUserNavbar = typeof pathname === 'string' && (pathname === '/' || pathname.startsWith('/user'))

  return (
    <div>
      {showUserNavbar && <UserNavbar />}
      <Outlet />
    </div>
  )
}

export default App
