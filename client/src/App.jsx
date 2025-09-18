import { Outlet, useLocation } from 'react-router-dom'
import './App.css'
import UserNavbar from './components/UserNavbar'

function App() {
  const { pathname } = useLocation()
  // Show UserNavbar only for user-facing routes (prefix '/user')
  const showUserNavbar = typeof pathname === 'string' && pathname.startsWith('/user')

  return (
    <div>
      {showUserNavbar && <UserNavbar />}
      <Outlet />
    </div>
  )
}

export default App
