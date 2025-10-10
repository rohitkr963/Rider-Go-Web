import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom'
import { getUserId } from '../utils/userUtils'

export default function UserAcceptedRides() {
  const [acceptedRides, setAcceptedRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingRide, setCancellingRide] = useState(null)
  const [locationSharing, setLocationSharing] = useState({})
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
  // Profile view is handled by dedicated route /captain/:captainId/profile

  // Load accepted rides from localStorage and server
  useEffect(() => {
    loadAcceptedRides()
  }, [])

  // Setup socket connection for real-time updates
  useEffect(() => {
    if (acceptedRides.length === 0) return

    const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
    const socket = io(SOCKET_URL, { auth: { token } })
    
    socket.on('connect', () => {
      console.log('✅ User socket connected for accepted rides')
      
      // Join ride rooms for all accepted rides to receive real-time updates
      acceptedRides.forEach(ride => {
        if (ride.rideId) {
          socket.emit('ride:subscribe', { rideId: ride.rideId })
          console.log('👤 Joined ride room:', `ride:${ride.rideId}`)
        }
      })
    })
    
    // Listen for seat updates
    socket.on('ride-status-updated', (data) => {
      console.log('🪑 Received seat update:', data)
      // Update local state if needed - for now just log
      // In a full implementation, you might want to update ride status in the list
    })
    
    // Listen for ride acceptance events
    socket.on('ride:accepted', (data) => {
      console.log('✅ Ride accepted event received:', data)
      // Refresh the accepted rides list
      loadAcceptedRides()
    })

    // Listen for location sharing requests from captain
    socket.on('start:location-sharing', (data) => {
      console.log('📍 Captain requested location sharing:', data)
      startLocationSharing(data.captainId, data.rideId, socket)
    })
    
    return () => {
      socket.disconnect()
    }
  }, [acceptedRides])


  // Start sharing location with captain
  const startLocationSharing = (captainId, rideId, socket) => {
    const userId = getUserId()
    
    console.log(`📍 Starting location sharing with captain ${captainId} for ride ${rideId}`)
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('❌ Geolocation not supported')
      return
    }
    
    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        
        // Send location to server for captain
        socket.emit('user:location-update', {
          userId: userId,
          rideId: rideId,
          captainId: captainId,
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          timestamp: Date.now()
        })
        
        console.log(`📍 Sent location to captain: ${latitude}, ${longitude}`)
      },
      (error) => {
        console.warn('❌ Geolocation error:', error.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // Cache for 30 seconds
      }
    )
    
    // Store watch ID for cleanup
    setLocationSharing(prev => ({
      ...prev,
      [rideId]: { watchId, captainId, isSharing: true }
    }))
    
    console.log(`✅ Location sharing started for ride ${rideId}`)
  }

  // Stop sharing location
  const stopLocationSharing = (rideId, socket) => {
    const sharing = locationSharing[rideId]
    if (!sharing) return
    
    // Stop watching position
    if (sharing.watchId) {
      navigator.geolocation.clearWatch(sharing.watchId)
    }
    
    // Notify server
    const userId = getUserId()
    socket.emit('stop:location-sharing', {
      userId: userId,
      rideId: rideId,
      captainId: sharing.captainId
    })
    
    // Remove from state
    setLocationSharing(prev => {
      const updated = { ...prev }
      delete updated[rideId]
      return updated
    })
    
    console.log(`🛑 Stopped location sharing for ride ${rideId}`)
  }

  const loadAcceptedRides = async () => {
    try {
      // First load from localStorage for immediate display
      const saved = localStorage.getItem('user_acceptedRides')
      if (saved) {
        const parsed = JSON.parse(saved)
        setAcceptedRides(parsed)
      }

      // Then fetch fresh data from server
      const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
      const userId = getUserId()
      
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const response = await fetch(`${BACKEND}/api/user/${userId}/accepted-rides`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAcceptedRides(data.rides || [])
        localStorage.setItem('user_acceptedRides', JSON.stringify(data.rides || []))
      }
    } catch (error) {
      console.error('Failed to load accepted rides:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelRide = async (rideId, acceptanceId) => {
    setCancellingRide(rideId)
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
      const userId = getUserId()
      
      // Send cancel request to server
  const response = await fetch(`${BACKEND}/api/user/ride/${rideId}/cancel`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          userId,
          acceptanceId,
          reason: 'User cancelled'
        })
      })
      
      if (response.ok) {
        // Remove from local state
        const updatedRides = acceptedRides.filter(ride => ride.rideId !== rideId)
        setAcceptedRides(updatedRides)
        localStorage.setItem('user_acceptedRides', JSON.stringify(updatedRides))
        
        // Clear booking status from localStorage to allow rebooking
        const currentUserEmail = localStorage.getItem('userEmail')
        localStorage.removeItem(`booked_${rideId}_${currentUserEmail}`)
        localStorage.removeItem(`bookingStatus_${rideId}_${currentUserEmail}`)
        
        // Emit socket event for real-time updates
  const socket = io(SOCKET_URL, { auth: { token } })
        socket.emit('ride:cancelled', { 
          rideId, 
          userId: getUserId(), 
          acceptanceId,
          cancelledBy: 'user'
        })
        socket.disconnect()
        
        console.log('✅ Ride cancelled successfully and booking status cleared')
      } else {
        const error = await response.json()
        console.error('Failed to cancel ride:', error)
        alert('Failed to cancel ride. Please try again.')
      }
    } catch (error) {
      console.error('Error cancelling ride:', error)
      alert('Error cancelling ride. Please try again.')
    } finally {
      setCancellingRide(null)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>
          Loading your rides...
        </div>
      </div>
    )
  }

  // Public captain profile view is available at /captain/:captainId/profile

  // Rating submission now handled on profile page if required

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px' }}>
        <div className="container panel">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '700', margin: 0 }}>🎫 My Booked Rides</h1>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px' }}>User ID: {getUserId()}</div>
            </div>
          </div>

          {/* Rides List */}
          <div style={{ width: '100%' }}>
            {acceptedRides.length === 0 ? (
              <div className="ride-card card-anim" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
            <h2 style={{ color: '#374151', marginBottom: '8px' }}>No Booked Rides</h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              You haven't booked any rides yet. Start exploring available rides!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {acceptedRides.map((ride) => (
              <div
                key={ride.rideId}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    {/* Route Info */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          background: '#10b981' 
                        }} />
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>
                          {ride.pickup?.name || 'Pickup Location'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '50%', 
                          background: '#ef4444' 
                        }} />
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>
                          {ride.destination?.name || 'Destination'}
                        </span>
                      </div>
                    </div>

                    {/* Ride Details */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Passengers</span>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>
                          {ride.passengerCount || 1}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Fare</span>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                          ₹{ride.estimatedFare || 0}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Booked At</span>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>
                          {ride.acceptedAt ? formatTime(ride.acceptedAt) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>Status</span>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#10b981',
                          background: '#dcfce7',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {ride.status || 'Accepted'}
                        </div>
                      </div>
                      {ride.captainName && (
                        <div>
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>Captain</span>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#111' }}>
                            👨‍✈️ {ride.captainName}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ride.captainName && (
                      <Link to={`/captain/${ride.captainId}/profile`} style={{ textDecoration: 'none' }}>
                        <button
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            minWidth: '120px'
                          }}
                        >
                          👤 View Profile
                        </button>
                      </Link>
                    )}
                    <button
                    onClick={() => cancelRide(ride.rideId, ride.acceptanceId)}
                    disabled={cancellingRide === ride.rideId}
                    style={{
                      background: cancellingRide === ride.rideId ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: cancellingRide === ride.rideId ? 'not-allowed' : 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    {cancellingRide === ride.rideId ? '⏳ Cancelling...' : '❌ Cancel Ride'}
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Captain Profile Modal */}
      {/* Profile modal removed in favor of dedicated profile page */}
    </div>
  )
}
