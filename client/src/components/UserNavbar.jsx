import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'

const UserNavbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const socketRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    const name = localStorage.getItem('userName')
    setIsLoggedIn(!!token)
    setUserName(name || 'User')
  }, [])

  // Initialize notifications from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('notifications')
      const items = raw ? JSON.parse(raw) : []
      const clearedAt = Number(localStorage.getItem('notifications_cleared_at') || 0)
      const unread = items.filter(n => (n.timestamp || 0) > clearedAt).length
      setUnreadCount(unread)
    } catch {
      // ignore parse errors
    }
  }, [])

  // Listen for storage changes to update login state
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token')
      const name = localStorage.getItem('userName')
      setIsLoggedIn(!!token)
      setUserName(name || 'User')

      try {
        const raw = localStorage.getItem('notifications')
        const items = raw ? JSON.parse(raw) : []
        const clearedAt = Number(localStorage.getItem('notifications_cleared_at') || 0)
        const unread = items.filter(n => (n.timestamp || 0) > clearedAt).length
        setUnreadCount(unread)
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [])

  // Socket: join user room and listen for notifications
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userId = localStorage.getItem('userId')
    if (!token || !userId) return

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
  const socket = io(SOCKET_URL, { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {
      try {
        // send the room name as a string to match server handler
        socket.emit('join', `user:${userId}`)
      } catch {
        console.warn('socket join failed')
      }
    })

    socket.on('notification', (payload) => {
      const currentUserId = localStorage.getItem('userId')
      
      // Only process if notification is for current user
      if (payload.userId === currentUserId) {
        try {
          console.log('🔔 Received notification for current user:', payload)
          
          const now = Date.now()
          const note = { 
            ...payload, 
            receivedAt: now, 
            timestamp: payload.timestamp || now 
          }
          
          const raw = localStorage.getItem('notifications')
          const items = raw ? JSON.parse(raw) : []
          items.unshift(note)
          
          // Keep list bounded to 200
          if (items.length > 200) items.length = 200
          localStorage.setItem('notifications', JSON.stringify(items))
          
          // Update unread count
          const clearedAt = Number(localStorage.getItem('notifications_cleared_at') || 0)
          const unread = items.filter(n => (n.timestamp || 0) > clearedAt).length
          setUnreadCount(unread)
          
          // Trigger storage event for other tabs
          window.dispatchEvent(new Event('storage'))
          
          console.log('✅ Notification processed and stored')
          
          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('RiderGo', {
              body: payload.message,
              icon: '/favicon.ico'
            })
          }
          
        } catch (error) {
          console.warn('Failed to handle notification:', error)
        }
      }
    })

    return () => {
      try { socket.disconnect() } catch { /* ignore */ }
      socketRef.current = null
    }
  }, [])

  const handleLogout = () => {
    // Clear all user data from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userPhone')
    localStorage.removeItem('userJoinDate')
    localStorage.removeItem('userBio')
    localStorage.removeItem('userLocation')
    
    // Update state
    setIsLoggedIn(false)
    setUserName('')
    
    // Redirect to home
    navigate('/user/home')
  }

  // Check if current path is active
  const isActive = (path) => {
    return location.pathname === path
  }

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (mobileOpen) document.body.classList.add('mobile-nav-open')
    else document.body.classList.remove('mobile-nav-open')
  }, [mobileOpen])

  return (
    <div className="site-topbar">
      <div className="topbar container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/user/home" className="brand">RiderGo</Link>

          {isLoggedIn && (
            <div className="nav-links" role="navigation" aria-label="Main navigation">
              <Link to="/user/home" className={isActive('/user/home') ? 'nav-link active' : 'nav-link'}>🏠 Home</Link>
              <Link to="/user/rides" className={isActive('/user/rides') ? 'nav-link active' : 'nav-link'}>🚗 My Rides</Link>
              <Link to="/user/accepted-rides" className={isActive('/user/accepted-rides') ? 'nav-link active' : 'nav-link'}>📋 My Bookings</Link>
            </div>
          )}
        </div>

        <div className="top-right">
          <button className="hamburger" aria-label="Toggle navigation" onClick={() => setMobileOpen(v => !v)}>☰</button>
          {!isLoggedIn ? (
            <>
              <Link to="/user/login" className="nav-link">Log in</Link>
              <Link to="/user/signup" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign up</Link>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 14 }}>Welcome, {userName}</span>
              <button className="notif-btn" onClick={() => navigate('/user/notifications')} aria-label="Notifications" title="Notifications">
                <span style={{ fontSize: 18 }}>🔔</span>
                {unreadCount > 0 && (<span className="notif-badge">{unreadCount}</span>)}
              </button>
              <Link to="/user/profile" className={isActive('/user/profile') ? 'btn btn-primary' : 'btn'} style={{ textDecoration: 'none' }}>👤 Profile</Link>
              <button className="btn btn-logout" onClick={handleLogout}>🚪 Logout</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserNavbar
