import React from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

const container = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' }
const section = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }

function osmEmbedSrc(lat, lon) {
  const delta = 0.02
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
}

export default function CaptainHome() {
  const navigate = useNavigate()
  const [online, setOnline] = React.useState(false)
  const [lat, setLat] = React.useState(28.6139) // default: New Delhi
  const [lon, setLon] = React.useState(77.2090)
  const [requests, setRequests] = React.useState([])
  const [activeRide, setActiveRide] = React.useState(null)
  const [continueRideData, setContinueRideData] = React.useState(null)
  const [stats, setStats] = React.useState({ earningsToday: 0, completed: 0, rating: 4.9 })
  const socketRef = React.useRef(null)

  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const [fromQuery, setFromQuery] = React.useState('')
  const [toQuery, setToQuery] = React.useState('')
  const [fromSuggestions, setFromSuggestions] = React.useState([])
  const [toSuggestions, setToSuggestions] = React.useState([])
  const [fromPoint, setFromPoint] = React.useState(null)
  const [toPoint, setToPoint] = React.useState(null)
  const fromTimerRef = React.useRef(null)
  const toTimerRef = React.useRef(null)
  const fromSearchTokenRef = React.useRef(0)
  const toSearchTokenRef = React.useRef(0)

  React.useEffect(() => {
    const id = navigator.geolocation?.watchPosition?.(
      (pos) => {
        setLat(pos.coords.latitude)
        setLon(pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )
    
    // Check for active ride on component mount
    const savedActiveRide = localStorage.getItem('captain_activeRide')
    if (savedActiveRide) {
      try {
        const rideData = JSON.parse(savedActiveRide)
        console.log('🔍 Found active ride on homepage:', rideData)
        setContinueRideData(rideData)
      } catch (error) {
        console.error('❌ Failed to parse active ride data:', error)
        localStorage.removeItem('captain_activeRide')
      }
    }
    
    return () => { if (navigator.geolocation?.clearWatch && id) navigator.geolocation.clearWatch(id) }
  }, [])

  // socket connection
  React.useEffect(() => {
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
  const s = io(SOCKET_URL, { auth: { token } })
    socketRef.current = s
    
    s.on('connect', () => {
      console.log('✅ CaptainHome socket connected')
      // Optionally decode captain id from token on backend; here we only open connection
      s.emit('registerCaptain', { captainId: 'self' })
    })
    
    s.on('connect_error', (error) => {
      console.error('❌ CaptainHome socket connection failed:', error)
    })

    s.on('rideRequest', (payload) => {
      // push incoming request to list
      setRequests((prev) => [...prev, { id: payload.id, pickup: payload.pickup, drop: payload.drop, fare: payload.fare }])
    })

    return () => { s.disconnect() }
  }, [])

  // send location to backend every 10s when online
  React.useEffect(() => {
    if (!online) return
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    if (!token) return
    const send = async () => {
      try {
        await fetch(`${BACKEND}/api/captain/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lat, lng: lon }),
        })
  } catch (e) { console.warn(e) }
    }
    send()
    const interval = setInterval(send, 10000)
    return () => clearInterval(interval)
  }, [online, lat, lon])

  // autocomplete helpers (Nominatim)
  const searchPlaces = async (query) => {
    if (!query || query.trim().length < 3) return []
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`)
      if (!res.ok) return []
      const data = await res.json()
      return data
  } catch (err) { console.warn('searchPlaces failed', err); return [] }
  }

  const handleFromChange = (e) => {
    const v = e.target.value
    setFromQuery(v)
    setFromPoint(null)
    if (fromTimerRef.current) clearTimeout(fromTimerRef.current)
    const token = ++fromSearchTokenRef.current
    fromTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(v)
      if (token === fromSearchTokenRef.current) {
        setFromSuggestions(results)
      }
    }, 300)
  }
  const handleToChange = (e) => {
    const v = e.target.value
    setToQuery(v)
    setToPoint(null)
    if (toTimerRef.current) clearTimeout(toTimerRef.current)
    const token = ++toSearchTokenRef.current
    toTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(v)
      if (token === toSearchTokenRef.current) {
        setToSuggestions(results)
      }
    }, 300)
  }
  const selectFrom = (p) => {
    setFromQuery(p.display_name)
    setFromPoint({ lat: parseFloat(p.lat), lng: parseFloat(p.lon), name: p.display_name })
    setFromSuggestions([])
  }
  const selectTo = (p) => {
    setToQuery(p.display_name)
    setToPoint({ lat: parseFloat(p.lat), lng: parseFloat(p.lon), name: p.display_name })
    setToSuggestions([])
  }
  const useMyLocationForFrom = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    if (fromTimerRef.current) clearTimeout(fromTimerRef.current)
    fromSearchTokenRef.current++
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setFromPoint({ lat: latitude, lng: longitude, name: 'My location' })
        setFromQuery('My location')
        setFromSuggestions([])
      },
      () => alert('Unable to fetch current location'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )
  }
  const useMyLocationForTo = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    if (toTimerRef.current) clearTimeout(toTimerRef.current)
    toSearchTokenRef.current++
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setToPoint({ lat: latitude, lng: longitude, name: 'My location' })
        setToQuery('My location')
        setToSuggestions([])
      },
      () => alert('Unable to fetch current location'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )
  }
  const openRoute = () => {
    const from = fromPoint || { lat, lng: lon, name: fromQuery || 'My location' }
    const to = toPoint
    if (!to) return alert('Please select a destination from suggestions')
    
    // Create ride data and navigate to live page
    const rideData = {
      id: Date.now().toString(),
      pickup: from,
      destination: to,
      fare: Math.floor(80 + Math.random() * 200), // Random fare between 80-280
      status: 'planned'
    }
    
    // Store ride data in sessionStorage for the live page
    sessionStorage.setItem('currentRide', JSON.stringify(rideData))
    
    // Navigate to live page
  const isMongoId = (v) => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v)
  const idToUse = isMongoId(rideData.id) ? rideData.id : rideData.id
  const params = new URLSearchParams({ rideId: idToUse })
  window.location.href = `/captain/live?${params.toString()}`
  }

  React.useEffect(() => {
    if (!online) return
    // mock incoming requests every ~7s
    const interval = setInterval(() => {
      setRequests((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          pickup: 'Sector 62, Noida',
          drop: 'Connaught Place, Delhi',
          fare: Math.floor(120 + Math.random() * 180),
        },
      ])
    }, 7000)
    return () => clearInterval(interval)
  }, [online])

  const acceptRide = async (req) => {
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    try {
  const res = await fetch(`${BACKEND}/api/ride/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: req.id }),
      })
      const data = await res.json()
      const rideId = data?.ride?._id || req.id
      setActiveRide({ ...req, userPhone: '+91-98XXXXXX21', id: rideId })
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
      // Navigate to live page hooked to this ride room
      try {
        const params = new URLSearchParams({ rideId })
        window.location.href = `/captain/live?${params.toString()}`
  } catch (e) { console.warn(e) }
  } catch (e) { console.warn(e) }
  }

  const rejectRide = async (req) => {
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    try {
  await fetch(`${BACKEND}/api/ride/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: req.id }),
      })
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
  } catch (e) { console.warn(e) }
  }

  const endRide = async () => {
    if (!activeRide) return
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    try {
  await fetch(`${BACKEND}/api/ride/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: activeRide.id }),
      })
      setStats((s) => ({ earningsToday: s.earningsToday + activeRide.fare, completed: s.completed + 1, rating: s.rating }))
      setActiveRide(null)
  } catch (err) { console.warn('geolocation clear failed', err) }
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header / Navbar */}
      <div style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ ...container, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 22 }}>RiderGo</div>
            <Link to="/captain/home" style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>Home</Link>
            <Link to="/captain/rides" style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>My Rides</Link>
            <Link to="/captain/ride-history" style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>Ride History</Link>
            <Link to="/captain/earnings" style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>Earnings</Link>
            <Link style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}>Support</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/captain/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#111' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb' }} />
              <span style={{ fontWeight: 600 }}>Profile ▾</span>
            </Link>
          </div>
        </div>
      </div>

      <div style={{ ...container, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, paddingTop: 16, paddingBottom: 24 }}>
        {/* Left column: Status + Map + Active Ride */}
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Status control */}
          <div style={section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Captain status</div>
                <div style={{ color: '#6b7280' }}>{online ? 'Online – receiving requests' : 'Offline – no requests'}</div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <span>{online ? 'Online' : 'Offline'}</span>
                <span
                  onClick={async () => {
                    const next = !online
                    setOnline(next)
                    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
                    if (!token) return
                    try {
                      await fetch(`${BACKEND}/api/captain/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ status: next ? 'online' : 'offline' }),
                      })
                    } catch (err) { console.warn('request reject error', err) }
                  }}
                  style={{
                    position: 'relative', width: 56, height: 30, background: online ? '#16a34a' : '#d1d5db', borderRadius: 999,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'
                  }}
                >
                  <span style={{ position: 'absolute', top: 3, left: online ? 30 : 3, width: 24, height: 24, background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
                </span>
              </label>
            </div>
          </div>

          {/* Map */}
          <div style={{ ...section, padding: 0, overflow: 'hidden' }}>
            <iframe title="map" width="100%" height="420" frameBorder="0" scrolling="no" src={osmEmbedSrc(lat, lon)} />
            <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
              <div><strong>Location:</strong> {lat.toFixed(5)}, {lon.toFixed(5)}</div>
              <button onClick={() => navigator.geolocation?.getCurrentPosition?.((p) => { setLat(p.coords.latitude); setLon(p.coords.longitude) })} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontWeight: 600 }}>Center on me</button>
            </div>
          </div>

          {/* Continue Active Ride */}
          {continueRideData && (
            <div style={{
              ...section,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)',
              border: '2px solid #f59e0b',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#f59e0b',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  🚗
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#92400e' }}>
                    Active Ride in Progress
                  </div>
                  <div style={{ color: '#b45309', fontSize: '14px' }}>
                    You have an ongoing ride that you can continue
                  </div>
                </div>
              </div>
              
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.8)', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '12px' 
              }}>
                <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>
                  <strong>Ride ID:</strong> {continueRideData.rideId}
                </div>
                <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>
                  <strong>Status:</strong> {continueRideData.rideStatus}
                </div>
                <div style={{ fontSize: '14px', color: '#92400e' }}>
                  <strong>Started:</strong> {new Date(continueRideData.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    // Use React Router navigate to avoid page refresh
                    navigate(`/captain/live?rideId=${continueRideData.rideId}`)
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🚀 Continue Ride
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this active ride?')) {
                      localStorage.removeItem('captain_activeRide')
                      setContinueRideData(null)
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ❌
                </button>
              </div>
            </div>
          )}

          {/* Active ride */}
          <div style={section}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Active ride</div>
            {!activeRide ? (
              <div style={{ color: '#6b7280' }}>No active ride. Accept a request to start.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>Pickup:</strong> {activeRide.pickup}</div>
                <div><strong>Drop:</strong> {activeRide.drop}</div>
                <div><strong>Fare:</strong> ₹{activeRide.fare}</div>
                <div><strong>User:</strong> {activeRide.userPhone}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <button style={{ padding: '10px 14px', background: '#000', color: '#fff', border: '1px solid #000', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Navigate</button>
                  <button onClick={endRide} style={{ padding: '10px 14px', background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>End Ride</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Plan route + Requests + Stats */}
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Plan a route */}
          <div style={section}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Plan a route</div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                <span>📍</span>
                <input value={fromQuery} onChange={handleFromChange} placeholder="Start location (or leave empty for current)" style={{ border: 'none', outline: 'none', padding: 6 }} />
                <button onClick={useMyLocationForFrom} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Use my location</button>
              </div>
              {fromSuggestions.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 5, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginTop: 6, maxHeight: 200, overflowY: 'auto', left: 0, right: 0 }}>
                  {fromSuggestions.map((p) => (
                    <div key={p.place_id} onClick={() => selectFrom(p)} style={{ padding: 8, cursor: 'pointer' }}>{p.display_name}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                <span>🏁</span>
                <input value={toQuery} onChange={handleToChange} placeholder="Destination" style={{ border: 'none', outline: 'none', padding: 6 }} />
                <button onClick={useMyLocationForTo} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Use my location</button>
              </div>
              {toSuggestions.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 5, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginTop: 6, maxHeight: 200, overflowY: 'auto', left: 0, right: 0 }}>
                  {toSuggestions.map((p) => (
                    <div key={p.place_id} onClick={() => selectTo(p)} style={{ padding: 8, cursor: 'pointer' }}>{p.display_name}</div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={openRoute} style={{ padding: '10px 14px', background: '#000', color: '#fff', border: '1px solid #000', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Start ride</button>
          </div>
          {/* Incoming requests */}
          <div style={{ ...section, maxHeight: 380, overflowY: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Incoming ride requests</div>
            {!online && requests.length === 0 && (
              <div style={{ color: '#6b7280' }}>Go online to receiv e requests.</div>
            )}
            {requests.map((r) => (
              <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div><strong>Pickup:</strong> {r.pickup}</div>
                <div><strong>Drop:</strong> {r.drop}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div><strong>Est. Fare:</strong> ₹{r.fare}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => acceptRide(r)} style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: '1px solid #16a34a', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => rejectRide(r)} style={{ padding: '8px 12px', background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={section}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Todays snapshot</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#6b7280' }}>Earnings</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>₹{stats.earningsToday}</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#6b7280' }}>Completed rides</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>{stats.completed}</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ color: '#6b7280' }}>Rating</div>
                <div style={{ fontWeight: 800, fontSize: 24 }}>⭐ {stats.rating}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <div>Support • Terms • Privacy</div>
            <div>Contact RiderGo support</div>
          </div>
        </div>
      </div>
    </div>
  )
}