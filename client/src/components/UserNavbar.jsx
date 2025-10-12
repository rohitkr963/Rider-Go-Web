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

          {/* Desktop Navigation - Hidden on mobile */}
          {isLoggedIn && (
            <div className="nav-links desktop-nav" role="navigation" aria-label="Main navigation">
              <Link to="/user/home" className={isActive('/user/home') ? 'nav-link active' : 'nav-link'}>🏠 Home</Link>
              <Link to="/user/rides" className={isActive('/user/rides') ? 'nav-link active' : 'nav-link'}>🚗 My Rides</Link>
              <Link to="/user/accepted-rides" className={isActive('/user/accepted-rides') ? 'nav-link active' : 'nav-link'}>📋 My Bookings</Link>
            </div>
          )}
        </div>

        <div className="top-right">
          {/* Desktop Auth Buttons - Hidden on mobile */}
          <div className="desktop-auth">
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

          {/* Hamburger Menu Button - Always visible */}
          <button 
            className="hamburger" 
            aria-label="Toggle navigation" 
            onClick={() => setMobileOpen(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              color: '#374151'
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998
          }}
        />
      )}

      {/* Mobile Menu */}
      <div 
        className={`mobile-menu ${mobileOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '280px',
          background: '#fff',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#111', fontSize: '18px', fontWeight: '700' }}>Menu</h3>
          <button 
            onClick={() => setMobileOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Links */}
        {isLoggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link 
              to="/user/home" 
              className={isActive('/user/home') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/user/home') ? '#3b82f6' : '#374151',
                background: isActive('/user/home') ? '#eff6ff' : 'transparent',
                fontWeight: isActive('/user/home') ? '600' : '500',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🏠 Home
            </Link>
            <Link 
              to="/user/rides" 
              className={isActive('/user/rides') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/user/rides') ? '#3b82f6' : '#374151',
                background: isActive('/user/rides') ? '#eff6ff' : 'transparent',
                fontWeight: isActive('/user/rides') ? '600' : '500',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🚗 My Rides
            </Link>
            <Link 
              to="/user/accepted-rides" 
              className={isActive('/user/accepted-rides') ? 'mobile-nav-link active' : 'mobile-nav-link'}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive('/user/accepted-rides') ? '#3b82f6' : '#374151',
                background: isActive('/user/accepted-rides') ? '#eff6ff' : 'transparent',
                fontWeight: isActive('/user/accepted-rides') ? '600' : '500',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📋 My Bookings
            </Link>
          </div>
        )}

        {/* Auth Section */}
        <div style={{ 
          marginTop: '0',
          paddingTop: isLoggedIn ? '20px' : '0', 
          borderTop: isLoggedIn ? '1px solid #e5e7eb' : 'none'
        }}>
          {!isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '16px',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Account Options
              </div>
              <Link 
                to="/user/login" 
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#374151',
                  background: '#f8fafc',
                  fontWeight: '600',
                  fontSize: '16px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9'
                  e.target.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8fafc'
                  e.target.style.borderColor = '#e5e7eb'
                }}
              >
                🔑 Log in
              </Link>
              <Link 
                to="/user/signup" 
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  fontWeight: '700',
                  fontSize: '16px',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                ✨ Sign up
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '16px',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Account Actions
              </div>
              
              <div style={{ 
                padding: '12px 16px', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', 
                borderRadius: '10px',
                textAlign: 'center',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '600',
                border: '1px solid #e5e7eb'
              }}>
                👋 Welcome, {userName}
              </div>
              
              <button 
                onClick={() => {
                  navigate('/user/notifications')
                  setMobileOpen(false)
                }}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#374151',
                  background: '#f8fafc',
                  fontWeight: '600',
                  fontSize: '16px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9'
                  e.target.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8fafc'
                  e.target.style.borderColor = '#e5e7eb'
                }}
              >
                🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
              </button>
              
              <Link 
                to="/user/profile" 
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#374151',
                  background: '#f8fafc',
                  fontWeight: '600',
                  fontSize: '16px',
                  textAlign: 'center',
                  border: '2px solid #e5e7eb',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9'
                  e.target.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8fafc'
                  e.target.style.borderColor = '#e5e7eb'
                }}
              >
                👤 Profile
              </Link>
              
              <button 
                onClick={() => {
                  handleLogout()
                  setMobileOpen(false)
                }}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  fontWeight: '700',
                  fontSize: '16px',
                  textAlign: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserNavbar
