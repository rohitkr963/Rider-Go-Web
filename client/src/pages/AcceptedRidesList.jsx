import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
// Use a conservative average speed (traffic) of 25 km/h if not provided
const estimateDurationMin = (distanceKm, avgSpeedKmh = 25) => {
  if (!distanceKm || distanceKm <= 0) return null
  const hours = distanceKm / avgSpeedKmh
  const mins = Math.round(hours * 60)
  // Ensure at least 1 minute for any non-zero distance to make UI responsive
  return mins < 1 ? 1 : mins
}

const AcceptedRidesList = () => {
  const [acceptedRides, setAcceptedRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [ridesWithAddresses, setRidesWithAddresses] = useState([])
  // Profile view available via /captain/:captainId/profile
  // ...existing code...


  // Convert rides coordinates to readable addresses
  const convertRidesToAddresses = useCallback(async (rides) => {
    console.log('🔄 Converting rides to addresses:', rides)
    const ridesWithAddr = await Promise.all(
      rides.map(async (ride) => {
        console.log('📍 Processing ride:', ride.rideId, 'Pickup:', ride.pickup, 'Destination:', ride.destination)
        
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
          console.warn('Failed to compute distance/duration for ride', ride.rideId, err)
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
    console.log('✅ Rides with addresses:', ridesWithAddr)
    setRidesWithAddresses(ridesWithAddr)
  }, [])

  // Helper to fetch accepted rides from server. If captainId is falsy, call endpoint without query param
  const fetchServerRides = async (captainIdParam) => {
    try {
      const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
      const base = 'http://localhost:3000/api/accepted-rides'
      const url = captainIdParam ? `${base}?captainId=${encodeURIComponent(captainIdParam)}` : base
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(url, { headers })
      if (!res.ok) {
        // If we tried with captainId and server returned 400/empty, try without captainId if token is present
        if (captainIdParam && token) {
          const res2 = await fetch(base, { headers })
          if (res2.ok) {
            const j2 = await res2.json()
            return j2?.rides || []
          }
        }
        return []
      }
      const json = await res.json()
      return json?.rides || []
    } catch (err) {
      console.warn('Failed to fetch server accepted rides:', err)
      return []
    }
  }

  useEffect(() => {
    // Load existing rides from localStorage on component mount
    const saved = localStorage.getItem('captain_acceptedRides')
    if (saved) {
      try {
        const savedRides = JSON.parse(saved)
        console.log('📋 Loading saved rides from localStorage:', savedRides)
        setAcceptedRides(savedRides)
        convertRidesToAddresses(savedRides)
      } catch (error) {
        console.error('Error parsing saved rides:', error)
      }
    }

    // Connect to socket for real-time updates
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000')

    socket.on('connect', async () => {
      console.log('✅ AcceptedRidesList socket connected, ID:', socket.id)
      // expose socket for other modules/debugging
  try { window.socket = socket } catch { /* ignore */ }
      try {
        // Try to register this socket to the captain room so server emits reach us
        let captainId = localStorage.getItem('captain_id')
        const token = localStorage.getItem('captain_token') || localStorage.getItem('token')

        if (!captainId && token) {
          try {
            const res = await fetch('http://localhost:3000/api/auth/captain/profile', { headers: { Authorization: `Bearer ${token}` } })
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

        // After registering, fetch authoritative accepted rides from API (server persisted)
        try {
          const serverRides = await fetchServerRides(captainId)
          console.log('📥 Loaded accepted rides from server via helper:', serverRides && serverRides.length)

          // Merge/fallback logic:
          // - If server returns non-empty array, prefer it (authoritative)
          // - If server returns empty BUT we had saved rides in localStorage, keep the saved rides
          const saved = localStorage.getItem('captain_acceptedRides')
          let savedRides = null
          if (saved) {
            try { savedRides = JSON.parse(saved) } catch { savedRides = null }
          }

          if (Array.isArray(serverRides) && serverRides.length > 0) {
            setAcceptedRides(serverRides)
            localStorage.setItem('captain_acceptedRides', JSON.stringify(serverRides))
            convertRidesToAddresses(serverRides)
          } else if ((serverRides === null || (Array.isArray(serverRides) && serverRides.length === 0)) && Array.isArray(savedRides) && savedRides.length > 0) {
            // Server returned empty or failed; fall back to local saved rides so UI doesn't vanish unexpectedly
            console.warn('Server returned no rides; falling back to saved local rides')
            setAcceptedRides(savedRides)
            // localStorage already has them; re-run conversion to ensure addresses are shown
            convertRidesToAddresses(savedRides)
          } else {
            // No server rides and no saved rides — ensure state is cleared
            setAcceptedRides([])
            localStorage.setItem('captain_acceptedRides', JSON.stringify([]))
            setRidesWithAddresses([])
          }
        } catch (err) {
          console.warn('Failed to load accepted rides from server', err)
          // keep whatever is already in local state / localStorage
        }
      } catch (err) {
        console.warn('AcceptedRidesList connect handler failed', err)
      } finally {
        setLoading(false)
      }
    })

    // Listen for accepted rides list updates
    socket.on('ride:accepted-list', (rides) => {
      console.log('📋 AcceptedRidesList received updated rides:', rides)
      setAcceptedRides(rides)
      // Persist to localStorage
      localStorage.setItem('captain_acceptedRides', JSON.stringify(rides))
      // Convert coordinates to addresses
      convertRidesToAddresses(rides)
    })

    // Listen for ride accepted events — server may emit either a full list or a single ride payload
    socket.on('ride:accepted', (payload) => {
      console.log('✅ Ride accepted event received (socket):', payload)
      // If server emits full list, update authoritative state
      if (Array.isArray(payload)) {
        setAcceptedRides(payload)
        localStorage.setItem('captain_acceptedRides', JSON.stringify(payload))
        convertRidesToAddresses(payload)
        return
      }

      // If server emitted a single ride object, append/merge it into current state
      if (payload && payload.rideId) {
        setAcceptedRides(prev => {
          // avoid duplicates
          const exists = prev.some(r => r.rideId === payload.rideId)
          const updated = exists ? prev.map(r => r.rideId === payload.rideId ? { ...r, ...payload } : r) : [payload, ...prev]
          localStorage.setItem('captain_acceptedRides', JSON.stringify(updated))
          // kick off address conversion for the updated list
          try { convertRidesToAddresses(updated) } catch (e) { console.warn('Conversion failed after ride:accepted', e) }
          return updated
        })
      }
      // else: malformed payload — ignore
    })

    // Listen for ride cancellations by user
    socket.on('ride:cancelled', (payload) => {
      console.log('❌ Ride cancelled by user:', payload)
      setAcceptedRides(prev => {
        const updated = prev.filter(ride => ride.rideId !== payload.rideId)
        localStorage.setItem('captain_acceptedRides', JSON.stringify(updated))
        return updated
      })
    })

    // Listen for ride status updates (seat changes, location/distance/duration updates, completions)
    socket.on('ride-status-updated', (payload) => {
      console.log('🔄 Ride status updated:', payload)
      setAcceptedRides(prev => {
        const updated = prev.map(ride => {
          if (ride.rideId !== payload.rideId) return ride

          // Merge available fields from payload into the ride
          const merged = {
            ...ride,
            occupied: typeof payload.occupied === 'number' ? payload.occupied : ride.occupied,
            totalSeats: typeof payload.size === 'number' ? payload.size : ride.totalSeats,
            // merge pickup/destination if present
            pickup: payload.pickup ? payload.pickup : ride.pickup,
            destination: payload.destination ? payload.destination : ride.destination,
            // prefer server-provided distance/duration if available
            distance: (typeof payload.distance === 'number') ? payload.distance : ride.distance,
            duration: (typeof payload.duration === 'number') ? payload.duration : ride.duration
          }

          // If pickup and destination coords are present, recompute distance/duration locally
          try {
            const p = merged.pickup
            const d = merged.destination
            if (p && d && p.lat && p.lng && d.lat && d.lng) {
              const km = haversineKm(p.lat, p.lng, d.lat, d.lng)
              merged.distance = Number(km.toFixed(2))
              const mins = estimateDurationMin(merged.distance)
              merged.duration = mins
            }
          } catch (err) { console.warn('Failed to recompute distance/duration:', err) }

          return merged
        })

        // persist and refresh addresses for updated rides
        localStorage.setItem('captain_acceptedRides', JSON.stringify(updated))
        try { convertRidesToAddresses(updated) } catch (e) { console.warn('Failed to convert addresses after status update', e) }
        return updated
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [convertRidesToAddresses])

  // Convert initial rides to addresses on mount / when acceptedRides changes
  useEffect(() => {
    if (acceptedRides.length > 0) {
      convertRidesToAddresses(acceptedRides)
    } else {
      // Keep ridesWithAddresses in sync: clear when there are no accepted rides
      setRidesWithAddresses([])
    }
  }, [acceptedRides, convertRidesToAddresses])

  const goBackToCaptainLive = () => {
    window.history.back()
  }

  // Note: Public profile view is handled by dedicated route /captain/:captainId/profile

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
            📋 Accepted Rides
          </h1>
          <button
            onClick={goBackToCaptainLive}
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
            ← Back to Live
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
            <div>Loading accepted rides...</div>
          </div>
        )}

        {/* Debug Info */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}>
          <div><strong>Debug Info:</strong></div>
          <div>Accepted Rides Count: {acceptedRides.length}</div>
          <div>Rides with Addresses Count: {ridesWithAddresses.length}</div>
          <div>Loading: {loading ? 'true' : 'false'}</div>
          <div>Socket Connected: {loading ? 'Connecting...' : 'Connected'}</div>
          <div>LocalStorage Key: captain_acceptedRides</div>
          <button 
            onClick={async () => {
              console.log('Current acceptedRides:', acceptedRides)
              console.log('Current ridesWithAddresses:', ridesWithAddresses)
              console.log('LocalStorage data:', localStorage.getItem('captain_acceptedRides'))
              
              // Test API endpoint
              try {
                console.log('🧪 Testing API endpoint...')
                const testResponse = await fetch('http://localhost:3000/test-accepted-rides')
                const testResult = await testResponse.json()
                console.log('🧪 API Test Result:', testResult)
                
                // Test database connection by fetching existing rides
                const dbResponse = await fetch('http://localhost:3000/api/accepted-rides')
                const dbResult = await dbResponse.json()
                console.log('🗄️ Database Test Result:', dbResult)
              } catch (error) {
                console.error('🧪 API Test Failed:', error)
              }
            }}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Log Debug Data
          </button>
        </div>

        {/* Empty State */}
        {!loading && ridesWithAddresses.length === 0 && acceptedRides.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              No Accepted Rides Yet
            </h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              When you accept ride requests, they will appear here
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
                Total: {ridesWithAddresses.length} ride{ridesWithAddresses.length !== 1 ? 's' : ''}
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
                        background: '#3b82f6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}>
                        👤
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
                          {ride.timestamp ? new Date(ride.timestamp).toLocaleString() : 'Just now'}
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
                      <div style={{ fontSize: '12px', color: '#78350f' }}>Estimated Fare</div>
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



                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <button
                      onClick={async () => {
                        try {
                          console.log('Marking ride complete:', ride.rideId)
                          
                          // Prepare ride data for history
                          const rideHistoryData = {
                            rideId: ride.rideId,
                            originalRideId: ride.originalRideId || ride.rideId,
                            userId: ride.userId || 'Unknown User',
                            userEmail: ride.userEmail || 'user@example.com',
                            captainId: ride.captainId || localStorage.getItem('captain_id') || 'unknown',
                            passengerCount: ride.passengerCount || 1,
                            pickup: {
                              lat: ride.pickup?.lat || 0,
                              lng: ride.pickup?.lng || 0,
                              name: ride.pickupAddress || ride.pickup?.name || 'Unknown pickup location'
                            },
                            destination: {
                              lat: ride.destination?.lat || 0,
                              lng: ride.destination?.lng || 0,
                              name: ride.destinationAddress || ride.destination?.name || 'Unknown destination'
                            },
                            fare: ride.fare || 50,
                            distance: ride.distance || 0,
                            duration: ride.duration || 0,
                            occupied: ride.occupied || 1,
                            totalSeats: ride.totalSeats || 4,
                            acceptedAt: ride.timestamp || ride.acceptedAt || new Date().toISOString(),
                            completedAt: new Date().toISOString()
                          }
                          
                          console.log('📋 Saving ride to history:', rideHistoryData)
                          
                          // Save ride to history
                          const historyResponse = await fetch('http://localhost:3000/api/ride-history', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(rideHistoryData)
                          })
                          
                          if (historyResponse.ok) {
                            console.log('✅ Ride saved to history')
                            
                            // Now delete ride from accepted rides database
                            const deleteResponse = await fetch(`http://localhost:3000/api/accepted-rides/${ride.rideId}`, {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json'
                              }
                            })
                            
                            if (deleteResponse.ok) {
                              console.log('✅ Ride removed from accepted rides')
                              
                              // Update seat count - reduce by passenger count
                              const passengerCount = ride.passengerCount || 1
                              const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
                              
                              try {
                                // Get current ride data to update seat count
                                const rideResponse = await fetch(`http://localhost:3000/api/ride/${ride.originalRideId || ride.rideId}`)
                                if (rideResponse.ok) {
                                  const rideData = await rideResponse.json()
                                  const currentOccupied = rideData.occupied || 0
                                  const newOccupied = Math.max(0, currentOccupied - passengerCount)
                                  
                                  // Update seat count
                                  const updateResponse = await fetch(`http://localhost:3000/api/ride/${ride.originalRideId || ride.rideId}/occupancy`, {
                                    method: 'PATCH',
                                    headers: { 
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ occupied: newOccupied })
                                  })
                                  
                                  if (updateResponse.ok) {
                                    console.log(`✅ Seat count updated: reduced by ${passengerCount}, new count: ${newOccupied}`)
                                  }
                                }
                              } catch (seatError) {
                                console.warn('Failed to update seat count:', seatError)
                              }
                              
                              // Remove ride from local state and localStorage
                              setAcceptedRides(prev => {
                                const updated = prev.filter(r => r.rideId !== ride.rideId)
                                localStorage.setItem('captain_acceptedRides', JSON.stringify(updated))
                                return updated
                              })
                              
                              // Emit socket event for real-time updates
                              if (window.socket) {
                                window.socket.emit('ride:completed', {
                                  rideId: ride.rideId,
                                  captainId: ride.captainId || localStorage.getItem('captain_id'),
                                  completedAt: new Date().toISOString(),
                                  rideData: rideHistoryData
                                })
                              }
                              
                              // Show success message
                              alert('✅ Ride completed and moved to history!')
                              
                            } else {
                              console.error('❌ Failed to remove ride from accepted rides')
                              alert('❌ Ride saved to history but failed to remove from active rides. Please refresh.')
                            }
                            
                          } else {
                            console.error('❌ Failed to save ride to history')
                            alert('❌ Failed to save ride to history. Please try again.')
                          }
                          
                        } catch (error) {
                          console.error('❌ Error completing ride:', error)
                          alert('❌ Error occurred while completing ride. Please try again.')
                        }
                      }}  
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      ✅ Mark Complete
                    </button>
                    
                    <button
                      onClick={() => {
                        // Navigate to live tracking for this ride
                        window.location.href = `/captain/live?rideId=${ride.rideId}`
                      }}
                      style={{
                        padding: '10px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📍 Track
                    </button>
                    
                    {/* Navigate to public captain profile view */}
                    <Link to={`/captain/${ride.captainId}/profile`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: '#8b5cf6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        👤 View Profile
                      </button>
                    </Link>
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

        {/* Captain profile modal removed; use /captain/:captainId/profile instead */}
      </div>
    </div>
  )
}

export default AcceptedRidesList
