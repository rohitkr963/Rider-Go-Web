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
    } catch { return [] }
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
    <div style={{ 
      minHeight: '100vh', 
      background: '#f9fafb', 
      paddingTop: 'clamp(12px, 3vw, 20px)',
      padding: 'clamp(12px, 3vw, 20px)'
    }}>
      <div className="container panel" style={{ 
        maxWidth: '100%',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 24px)'
      }}>
        <h2 style={{ 
          fontSize: 'clamp(24px, 6vw, 28px)', 
          fontWeight: 700, 
          color: '#111', 
          marginBottom: 'clamp(16px, 4vw, 24px)' 
        }}>
          🔔 Notifications
        </h2>
        <div style={{ 
          marginTop: 'clamp(8px, 2vw, 12px)', 
          marginBottom: 'clamp(8px, 2vw, 12px)' 
        }}>
          <button 
            onClick={clearAll} 
            className="btn btn-anim" 
            style={{ 
              background: '#ef4444',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 20px)',
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              fontWeight: 600
            }}
          >
            Clear all
          </button>
        </div>

        <div>
          {items.length === 0 ? (
            <div className="panel" style={{ 
              padding: 'clamp(24px, 6vw, 40px)', 
              textAlign: 'center',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12
            }}>
              <div style={{ fontSize: 'clamp(32px, 8vw, 48px)', marginBottom: 'clamp(12px, 3vw, 16px)' }}>🔔</div>
              <h3 style={{ 
                color: '#374151', 
                marginBottom: 'clamp(6px, 1.5vw, 8px)',
                fontSize: 'clamp(18px, 4vw, 20px)',
                fontWeight: 600
              }}>
                No notifications yet
              </h3>
              <p style={{ 
                color: '#6b7280', 
                margin: 0,
                fontSize: 'clamp(14px, 3vw, 16px)',
                lineHeight: 1.5
              }}>
                You'll see ride updates and important messages here
              </p>
            </div>
          ) : (
            <div className="panel" style={{ 
              overflow: 'hidden',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12
            }}>
              {items.map((n, idx) => (
                <div key={idx} className="ride-card card-anim" style={{ 
                  borderBottom: idx < items.length - 1 ? '1px solid #e5e7eb' : 'none', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  gap: 'clamp(12px, 3vw, 16px)',
                  padding: 'clamp(12px, 3vw, 16px)',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ 
                      fontWeight: 600, 
                      color: '#111', 
                      marginBottom: 'clamp(2px, 0.5vw, 4px)', 
                      lineHeight: 1.4,
                      fontSize: 'clamp(14px, 3vw, 16px)'
                    }}>
                      {n.message}
                    </div>
                    <div style={{ 
                      fontSize: 'clamp(10px, 2.5vw, 12px)', 
                      color: '#6b7280', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'clamp(6px, 1.5vw, 8px)',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        background: getTypeColor(n.type), 
                        color: 'white', 
                        padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)', 
                        borderRadius: 4, 
                        fontSize: 'clamp(8px, 2vw, 10px)', 
                        fontWeight: 600, 
                        textTransform: 'uppercase' 
                      }}>
                        {getTypeLabel(n.type)}
                      </span>
                      <span style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}>
                        {new Date(n.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {n.data && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', background: '#f9fafb', padding: 8, borderRadius: 6 }}>
                        {n.data.pickup && <div>📍 From: {n.data.pickup}</div>}
                        {n.data.destination && <div>🏁 To: {n.data.destination}</div>}
                        {n.data.captainName && <div>👨‍✈️ Captain: {n.data.captainName}</div>}
                        {n.data.passengerCount && <div>👥 Passengers: {n.data.passengerCount}</div>}
                        {n.data.estimatedFare && <div>💰 Fare: {n.data.estimatedFare}</div>}
                        {n.data.occupiedSeats && n.data.totalSeats && <div>🪑 Seats: {n.data.occupiedSeats}/{n.data.totalSeats}</div>}
                      </div>
                    )}
                  </div>
                  {n.rideId && (
                    <div style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>#{n.rideId.slice(-8)}</div>
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
