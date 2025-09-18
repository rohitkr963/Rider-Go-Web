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

    const socket = io('http://localhost:3000', { auth: { token } })
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

  // Styles
  const container = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' }
  const topbar = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }
  const brand = { fontWeight: 800, fontSize: 22, color: '#000', textDecoration: 'none' }
  const topRight = { display: 'flex', alignItems: 'center', gap: 20 }
  const navLink = { 
    color: '#111', 
    textDecoration: 'none', 
    fontWeight: 600,
    padding: '8px 12px',
    borderRadius: 8,
    transition: 'all 0.2s ease'
  }
  const activeNavLink = { 
    ...navLink, 
    background: '#f3f4f6',
    color: '#000'
  }
  const topBtn = { 
    padding: '10px 16px', 
    borderRadius: 999, 
    fontWeight: 600, 
    cursor: 'pointer', 
    border: '1px solid #e5e7eb', 
    background: '#fff',
    textDecoration: 'none',
    display: 'inline-block'
  }
  const topPrimary = { 
    ...topBtn, 
    background: '#000', 
    color: '#fff', 
    borderColor: '#000' 
  }
  const logoutBtn = {
    ...topBtn,
    background: '#ef4444',
    color: '#fff',
    borderColor: '#ef4444',
    marginLeft: 12
  }

  return (
    <div style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ ...container, ...topbar }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/user/home" style={brand}>RiderGo</Link>
          {isLoggedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link 
                to="/user/home" 
                style={isActive('/user/home') ? activeNavLink : navLink}
              >
                🏠 Home
              </Link>
              <Link 
                to="/user/rides" 
                style={isActive('/user/rides') ? activeNavLink : navLink}
              >
                🚗 My Rides
              </Link>
              <Link 
                to="/user/accepted-rides" 
                style={isActive('/user/accepted-rides') ? activeNavLink : navLink}
              >
                📋 My Bookings
              </Link>
            </div>
          )}
        </div>
        
        <div style={topRight}>
          {!isLoggedIn ? (
            <>
              <Link to="/user/login" style={navLink}>Log in</Link>
              <Link to="/user/signup" style={{ textDecoration: 'none' }}>
                <button style={topPrimary}>Sign up</button>
              </Link>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#6b7280', fontSize: 14 }}>Welcome, {userName}</span>
              {/* Notification bell */}
              <button
                onClick={() => navigate('/user/notifications')}
                aria-label="Notifications"
                title="Notifications"
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: 'none',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: 18 }}>🔔</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    minWidth: 18,
                    height: 18,
                    padding: '0 4px',
                    borderRadius: 9,
                    background: '#ef4444',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>{unreadCount}</span>
                )}
              </button>
              <Link 
                to="/user/profile" 
                style={isActive('/user/profile') ? { ...topPrimary, textDecoration: 'none' } : { ...topBtn, textDecoration: 'none' }}
              >
                👤 Profile
              </Link>
              <button style={logoutBtn} onClick={handleLogout}>
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
