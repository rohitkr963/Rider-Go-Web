import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

import UserLogin from './pages/UserLogin.jsx'
import UserSignup from './pages/UserSignup.jsx'
import CaptainLogin from './pages/CaptainLogin.jsx'
import CaptainSignup from './pages/CaptainSignup.jsx'
import UserHome from './pages/UserHome.jsx'
import CaptainHome from './pages/CaptainHome.jsx'
import CaptainRides from './pages/CaptainRides.jsx'
import CaptainProfile from './pages/CaptainProfile.jsx'
import CaptainEarnings from './pages/CaptainEarnings.jsx'
import CaptainLive from './pages/CaptainLive.jsx'
import UserRideLive from './pages/UserRideLive.jsx'
import UserRideList from './pages/UserRideList.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <UserHome /> },
      { path: 'user/login', element: <UserLogin /> },
      { path: 'user/signup', element: <UserSignup /> },
      { path: 'user/home', element: <UserHome /> },
      { path: 'captain/login', element: <CaptainLogin /> },
      { path: 'captain/signup', element: <CaptainSignup /> },
      { path: 'captain/home', element: <CaptainHome /> },
      { path: 'captain/rides', element: <CaptainRides /> },
      { path: 'captain/earnings', element: <CaptainEarnings /> },
  { path: 'captain/profile', element: <CaptainProfile /> },
  { path: 'captain/live', element: <CaptainLive /> },
      { path: 'user/ride-live', element: <UserRideLive /> },
      { path: 'user/rides', element: <UserRideList /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
