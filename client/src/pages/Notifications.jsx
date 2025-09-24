import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getUserId } from '../utils/userUtils'

// Helper functions for notification styling
const getTypeColor = (type) => {
  switch (type) {
    case 'rideAccepted': return '#10b981'
    case 'rideRequested': return '#3b82f6'
    case 'newBooking': return '#f59e0b'
    case 'rideCompleted': return '#8b5cf6'
    case 'rideCancelled': return '#ef4444'
    default: return '#6b7280'
  }
}

const getTypeLabel = (type) => {
  switch (type) {
    case 'rideAccepted': return 'Accepted'
    case 'rideRequested': return 'Requested'
    case 'newBooking': return 'Booking'
    case 'rideCompleted': return 'Completed'
    case 'rideCancelled': return 'Cancelled'
    default: return type || 'Info'
  }
}

export default function Notifications() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('notifications')
      return raw ? JSON.parse(raw) : []
    } catch (e) { return [] }
  })

  useEffect(() => {
    // When opening the page, try to fetch persisted notifications from server and sync localStorage
    const syncFromServer = async () => {
      try {
        const token = localStorage.getItem('token')
        const userId = getUserId()
        if (!token || !userId) return
        const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
        const res = await fetch(`${BACKEND}/api/notifications?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const notifs = (data.notifications || []).map(n => ({ ...n, timestamp: new Date(n.timestamp).getTime() }))
        localStorage.setItem('notifications', JSON.stringify(notifs))
        setItems(notifs)
      } catch {
        // fallback: rely on localStorage's copy
      } finally {
        // mark as read when opening notifications
        localStorage.setItem('notifications_cleared_at', String(Date.now()))
        // reset unread badge for other tabs
        window.dispatchEvent(new Event('storage'))
      }
    }

    syncFromServer()
  }, [])

  const clearAll = () => {
    setItems([])
    localStorage.removeItem('notifications')
    localStorage.setItem('notifications_cleared_at', String(Date.now()))
    window.dispatchEvent(new Event('storage'))
  }


  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingTop: 20 }}>
      <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111', marginBottom: 24 }}>🔔 Notifications</h2>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <button onClick={clearAll} style={{ padding: '8px 12px', borderRadius: 8, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}>Clear all</button>
      </div>
      <div>
        {items.length === 0 ? (
          <div style={{ 
            padding: 40, 
            background: 'white', 
            borderRadius: 12, 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
            <h3 style={{ color: '#374151', marginBottom: 8 }}>No notifications yet</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>You'll see ride updates and important messages here</p>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {items.map((n, idx) => (
              <div key={idx} style={{ 
                padding: 16, 
                borderBottom: idx < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                gap: 16
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    color: '#111', 
                    marginBottom: 4,
                    lineHeight: 1.4
                  }}>
                    {n.message}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{
                      background: getTypeColor(n.type),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {getTypeLabel(n.type)}
                    </span>
                    <span>{new Date(n.timestamp).toLocaleString()}</span>
                  </div>
                  {n.data && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 12, 
                      color: '#6b7280',
                      background: '#f9fafb',
                      padding: 8,
                      borderRadius: 6
                    }}>
                      {n.data.pickup && <div>📍 From: {n.data.pickup}</div>}
                      {n.data.destination && <div>🏁 To: {n.data.destination}</div>}
                      {n.data.captainName && <div>👨‍✈️ Captain: {n.data.captainName}</div>}
                      {n.data.passengerCount && <div>👥 Passengers: {n.data.passengerCount}</div>}
                      {n.data.estimatedFare && <div>💰 Fare: ₹{n.data.estimatedFare}</div>}
                      {n.data.occupiedSeats && n.data.totalSeats && <div>🪑 Seats: {n.data.occupiedSeats}/{n.data.totalSeats}</div>}
                    </div>
                  )}
                </div>
                {n.rideId && (
                  <div style={{ 
                    fontSize: 11, 
                    color: '#9ca3af',
                    background: '#f3f4f6',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontFamily: 'monospace'
                  }}>
                    #{n.rideId.slice(-8)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
