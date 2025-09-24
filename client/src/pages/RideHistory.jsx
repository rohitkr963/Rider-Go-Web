import React, { useState, useEffect, useCallback } from 'react'
import io from 'socket.io-client'

// Function to get readable address from coordinates
const getAddressFromCoords = async (lat, lng) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
    const data = await response.json()
    
    if (data && data.display_name) {
      // Extract meaningful parts of the address
      const address = data.address || {}
      const parts = []
  
      if (address.house_number && address.road) {
        parts.push(`${address.house_number} ${address.road}`)
      } else if (address.road) {
        parts.push(address.road)
      }
      
      if (address.neighbourhood || address.suburb) {
        parts.push(address.neighbourhood || address.suburb)
      }
      
      if (address.city || address.town || address.village) {
        parts.push(address.city || address.town || address.village)
      }
      
      return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',')
    }
  } catch (error) {
    console.warn('Failed to get address:', error)
  }
   
  // Fallback to coordinates if geocoding fails
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// Helper: haversine distance in kilometers
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => v * Math.PI / 180
  const R = 6371 // Earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper: estimate duration in minutes given distance (km) and rough average speed (km/h)
const estimateDurationMin = (distanceKm, avgSpeedKmh = 25) => {
  if (!distanceKm || distanceKm <= 0) return null
  const hours = distanceKm / avgSpeedKmh
  const mins = Math.round(hours * 60)
  // Ensure at least 1 minute for any non-zero distance to make UI responsive
  return mins < 1 ? 1 : mins
}

const RideHistory = () => {
  const [completedRides, setCompletedRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [ridesWithAddresses, setRidesWithAddresses] = useState([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [totalRides, setTotalRides] = useState(0)

  // Convert rides coordinates to readable addresses
  const convertRidesToAddresses = useCallback(async (rides) => {
    console.log('🔄 Converting completed rides to addresses:', rides)
    const ridesWithAddr = await Promise.all(
      rides.map(async (ride) => {
        console.log('📍 Processing completed ride:', ride.rideId, 'Pickup:', ride.pickup, 'Destination:', ride.destination)
        
        // compute distance/duration if possible
        let computedDistance = ride.distance
        let computedDuration = ride.duration
        try {
          const p = ride.pickup
          const d = ride.destination
          if (p && d && p.lat && p.lng && d.lat && d.lng) {
            const km = haversineKm(p.lat, p.lng, d.lat, d.lng)
            computedDistance = Number(km.toFixed(2))
            computedDuration = estimateDurationMin(computedDistance)
          }
        } catch (err) {
          console.warn('Failed to compute distance/duration for completed ride', ride.rideId, err)
        }

        let pickupAddress = 'Loading pickup address...'
        let destinationAddress = 'Loading destination address...'
        
        // Handle pickup location
        if (ride.pickup) {
          if (ride.pickup.name) {
            pickupAddress = ride.pickup.name
          } else if (ride.pickup.lat && ride.pickup.lng) {
            try {
              pickupAddress = await getAddressFromCoords(ride.pickup.lat, ride.pickup.lng)
              console.log('✅ Pickup address resolved:', pickupAddress)
            } catch (error) {
              console.error('❌ Failed to get pickup address:', error)
              pickupAddress = `${ride.pickup.lat.toFixed(4)}, ${ride.pickup.lng.toFixed(4)}`
            }
          } else {
            pickupAddress = 'Invalid pickup coordinates'
          }
        }
        
        // Handle destination location
        if (ride.destination) {
          if (ride.destination.name) {
            destinationAddress = ride.destination.name
          } else if (ride.destination.lat && ride.destination.lng) {
            try {
              destinationAddress = await getAddressFromCoords(ride.destination.lat, ride.destination.lng)
              console.log('✅ Destination address resolved:', destinationAddress)
            } catch (error) {
              console.error('❌ Failed to get destination address:', error)
              destinationAddress = `${ride.destination.lat.toFixed(4)}, ${ride.destination.lng.toFixed(4)}`
            }
          } else {
            destinationAddress = 'Invalid destination coordinates'
          }
        }
        
        return {
          ...ride,
          pickupAddress,
          destinationAddress,
          distance: computedDistance,
          duration: computedDuration
        }
      })
    )
    console.log('✅ Completed rides with addresses:', ridesWithAddr)
    setRidesWithAddresses(ridesWithAddr)
    
    // Calculate total earnings and rides
    const earnings = ridesWithAddr.reduce((sum, ride) => sum + (ride.fare || 0), 0)
    setTotalEarnings(earnings)
    setTotalRides(ridesWithAddr.length)
  }, [])

  useEffect(() => {
    // Load completed rides from localStorage on component mount
    const saved = localStorage.getItem('captain_completedRides')
    if (saved) {
      try {
        const savedRides = JSON.parse(saved)
        console.log('📋 Loading completed rides from localStorage:', savedRides)
        setCompletedRides(savedRides)
        convertRidesToAddresses(savedRides)
      } catch (error) {
        console.error('Error parsing completed rides:', error)
      }
    }

    // Connect to socket for real-time updates
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000')

    socket.on('connect', async () => {
      console.log('✅ RideHistory socket connected, ID:', socket.id)
      try {
        // Try to register this socket to the captain room
        let captainId = localStorage.getItem('captain_id')
        const token = localStorage.getItem('captain_token') || localStorage.getItem('token')

        if (!captainId && token) {
          try {
            const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
            const res = await fetch(`${BACKEND}/api/captain/profile`, { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) {
              const data = await res.json()
              captainId = data?.profile?._id || data?.profile?.id || data?.id
              if (captainId) localStorage.setItem('captain_id', captainId)
            }
          } catch (err) {
            console.warn('Failed to fetch captain profile for registration', err)
          }
        }

        if (captainId) socket.emit('registerCaptain', { captainId })

        // Fetch completed rides from API
        try {
          const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
          const listRes = await fetch(`${BACKEND}/api/ride-history`)
          if (listRes.ok) {
            const listJson = await listRes.json()
            const serverRides = listJson?.rides || []
            console.log('📥 Loaded completed rides from server:', serverRides.length)
            setCompletedRides(serverRides)
            localStorage.setItem('captain_completedRides', JSON.stringify(serverRides))
            convertRidesToAddresses(serverRides)
          }
        } catch (err) {
          console.warn('Failed to load completed rides from server', err)
        }
      } catch (err) {
        console.warn('RideHistory connect handler failed', err)
      } finally {
        setLoading(false)
      }
    })

    // Listen for ride completion events
    socket.on('ride:completed', (payload) => {
      console.log('✅ Ride completed event received:', payload)
      setCompletedRides(prev => {
        const updated = [...prev, payload]
        localStorage.setItem('captain_completedRides', JSON.stringify(updated))
        convertRidesToAddresses(updated)
        return updated
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [convertRidesToAddresses])

  const goBackToCaptainHome = () => {
    window.location.href = '/captain/home'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '16px'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📚 Ride History
          </h1>
          <button
            onClick={goBackToCaptainHome}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            ← Back to Home
          </button>
        </div>

        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: '#fef3c7',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
              ₹{totalEarnings}
            </div>
            <div style={{ fontSize: '14px', color: '#78350f' }}>Total Earnings</div>
          </div>
          
          <div style={{
            background: '#dbeafe',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
              {totalRides}
            </div>
            <div style={{ fontSize: '14px', color: '#1e3a8a' }}>Total Rides</div>
          </div>
          
          <div style={{
            background: '#dcfce7',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>
              {totalRides > 0 ? (totalEarnings / totalRides).toFixed(0) : 0}
            </div>
            <div style={{ fontSize: '14px', color: '#15803d' }}>Avg per Ride</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
            <div>Loading ride history...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && ridesWithAddresses.length === 0 && completedRides.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              No Completed Rides Yet
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Your completed rides will appear here once you mark them as done
            </p>
          </div>
        )}

        {/* Rides List */}
        {!loading && ridesWithAddresses.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '16px', color: '#6b7280' }}>
                Completed: {ridesWithAddresses.length} ride{ridesWithAddresses.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ridesWithAddresses.map((ride, index) => (
                <div
                  key={index}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '20px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = 'none'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Ride Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: '#16a34a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        ✅
                      </div>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#111827'
                        }}>
                          User: {ride.userId}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Completed: {ride.completedAt ? new Date(ride.completedAt).toLocaleString() : 
                                     ride.timestamp ? new Date(ride.timestamp).toLocaleString() : 'Recently'}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {ride.passengerCount || 1} passenger{(ride.passengerCount || 1) > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Ride Details */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    {/* Pickup */}
                    <div style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '16px' }}>📍</span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Pickup Location
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#374151',
                        lineHeight: '1.4'
                      }}>
                        {ride.pickupAddress || ride.pickup?.name || 
                         (ride.pickup?.lat && ride.pickup?.lng ? 
                           `${ride.pickup.lat.toFixed(4)}, ${ride.pickup.lng.toFixed(4)}` : 
                           'Loading pickup address...')}
                      </div>
                    </div>

                    {/* Destination */}
                    <div style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '16px' }}>🎯</span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#374151'
                        }}>
                          Destination
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#374151',
                        lineHeight: '1.4'
                      }}>
                        {ride.destinationAddress || ride.destination?.name || 
                         (ride.destination?.lat && ride.destination?.lng ? 
                           `${ride.destination.lat.toFixed(4)}, ${ride.destination.lng.toFixed(4)}` : 
                           'Loading destination address...')}
                      </div>
                    </div>
                  </div>

                  {/* Fare & Distance Info */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      background: '#fef3c7',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#92400e' }}>
                        ₹{ride.fare || '50'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350f' }}>Earned</div>
                    </div>
                    
                    <div style={{
                      background: '#dbeafe',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                        {ride.distance ?? '5.2'} km
                      </div>
                      <div style={{ fontSize: '12px', color: '#1e3a8a' }}>Distance</div>
                    </div>
                    
                    <div style={{
                      background: '#f3e8ff',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#7c3aed' }}>
                        {ride.duration ?? '12'} min
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b21a8' }}>Duration</div>
                    </div>
                  </div>

                  {/* Ride ID */}
                  <div style={{
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#64748b',
                    fontFamily: 'monospace'
                  }}>
                    Ride ID: {ride.rideId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RideHistory
