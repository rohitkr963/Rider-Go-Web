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
import AcceptedRidesList from './pages/AcceptedRidesList.jsx'
import RideHistory from './pages/RideHistory.jsx'
import UserProfile from './pages/UserProfile.jsx'
import Notifications from './pages/Notifications.jsx'
import UserAcceptedRides from './pages/UserAcceptedRides.jsx'
import CaptainProfileView from './pages/CaptainProfileView.jsx'
import FooterPage from './pages/FooterPage.jsx'

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
  // Public view for any user to see a captain's profile by id
  { path: 'captain/:captainId/profile', element: <CaptainProfileView /> },
  { path: 'captain/live', element: <CaptainLive /> },
      { path: 'accepted-rides', element: <AcceptedRidesList /> },
      { path: 'captain/ride-history', element: <RideHistory /> },
      { path: 'user/ride-live', element: <UserRideLive /> },
      { path: 'user/rides', element: <UserRideList /> },
      { path: 'user/accepted-rides', element: <UserAcceptedRides /> },
      { path: 'user/profile', element: <UserProfile /> },
  { path: 'user/notifications', element: <Notifications /> },
      { path: 'footer', element: <FooterPage /> },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
