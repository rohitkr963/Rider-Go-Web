import React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import { useLocation } from 'react-router-dom'

export default function UserRideLive() {
  const mapRef = React.useRef(null)
  const captainMarkerRef = React.useRef(null)
  const userMarkerRef = React.useRef(null)
  const animRef = React.useRef(null)
  const prevRef = React.useRef(null)
  const socketRef = React.useRef(null)

  // missing refs used elsewhere
  const startMarkerRef = React.useRef(null)
  const routeDoneRef = React.useRef(null)
  const routeRemainRef = React.useRef(null)

  const userRouteRef = React.useRef(null)
  const captainRouteRef = React.useRef(null)
  const captainTrailRef = React.useRef(null)
  const etaLineRef = React.useRef(null)
  const trailPointsRef = React.useRef([])
  const remainDashOffsetRef = React.useRef(0)
  const remainDashAnimRef = React.useRef(null)
  const remainDashLastRef = React.useRef(null)
  const remainDashDirRef = React.useRef(1)
  const lastProgressIdxRef = React.useRef(-1)

  const [etaMin, setEtaMin] = React.useState(null)
  const [etaKm, setEtaKm] = React.useState(null)
  const [userStarted, setUserStarted] = React.useState(false)
  const [rideStatus, setRideStatus] = React.useState({ size: null, occupied: 0 })
  const [showStatusPanel, setShowStatusPanel] = React.useState(false)

  const ensureMarkerStyles = React.useCallback(() => {
  if (typeof document === 'undefined' || !document.head) return
  if (document.getElementById('marker-styles')) return
  const s = document.createElement('style')
  s.id = 'marker-styles'
    s.innerHTML = `
  .captain-marker { position: relative; width: 140px; height: 140px; pointer-events: none; }
  .captain-halo { position: absolute; left: 50%; top: 50%; width: 140px; height: 140px; transform: translate(-50%, -50%); border-radius: 50%; background: rgba(59,130,246,0.12); border: 4px solid rgba(59,130,246,0.18); box-shadow: 0 8px 28px rgba(59,130,246,0.14); animation: captainPulse 2200ms ease-out infinite; }
  .captain-dot { width: 22px; height: 22px; background: rgba(59,130,246,1); border-radius: 50%; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 20px rgba(59,130,246,0.95); border: 3px solid rgba(255,255,255,0.95); }
      @keyframes captainPulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; } 65% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; } 100% { opacity: 0; } }
  .captain-label { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 10px); background: rgba(2,6,23,0.95); color: #fff; padding: 8px 12px; border-radius: 18px; font-size: 13px; font-weight: 800; letter-spacing: 0.6px; pointer-events: auto; box-shadow: 0 6px 14px rgba(2,6,23,0.18); }
  .captain-tooltip { background: rgba(0,0,0,0.85); color: white; padding: 6px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
  .user-label { display: inline-block; background: #10b981; color: white; padding: 6px 10px; border-radius: 10px; font-size: 12px; font-weight: 800; box-shadow: 0 4px 10px rgba(16,185,129,0.12); }
      .user-marker { position: relative; width: 100px; height: 28px; pointer-events: none; }
    `
    // defensive: try multiple fallbacks for where to append the style
    try {
      const head = document.head || document.getElementsByTagName('head')?.[0]
      if (head && typeof head.appendChild === 'function') {
        head.appendChild(s)
      } else if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(s)
      }
    } catch (err) {
      // swallow — style injection is non-critical, avoid breaking the app
      console.warn('Failed to inject marker styles:', err)
    }
  }, [])

  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const rideId = params.get('rideId') || 'demo'
  const fromLat = parseFloat(params.get('fromLat'))
  const fromLng = parseFloat(params.get('fromLng'))
  const toLat = parseFloat(params.get('toLat'))
  const toLng = parseFloat(params.get('toLng'))

  // Fetch initial ride data
  const fetchRideData = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
  // This endpoint is public on backend; include Authorization only if token exists
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  // Use relative path so dev proxy and production host work correctly
  const response = await fetch(`/api/ride/${rideId}`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        const ride = data.ride || data
        
        // Get captain's actual seating capacity
        let size = (typeof ride.size === 'number') ? ride.size : null
        if (ride.captainId) {
          try {
            const captainResponse = await fetch(`/api/captain/${ride.captainId}/seating`)
            if (captainResponse.ok) {
              const captainData = await captainResponse.json()
              if (typeof captainData.seatingCapacity === 'number') size = captainData.seatingCapacity
              console.log('Fetched captain seating capacity:', size, 'for captain:', captainData.captainName)
            }
          } catch (captainErr) {
            console.warn('Failed to fetch captain seating capacity:', captainErr)
          }
        }
        
        setRideStatus({
          size: size,
          occupied: ride.occupied || 0
        })
        
        console.log('Fetched ride data:', { 
          originalSize: ride.size,
          finalSize: size,
          occupied: ride.occupied, 
          captainId: ride.captainId
        })
      }
    } catch (error) {
      console.warn('Failed to fetch ride data:', error)
    }
  }, [rideId])

  const haversine = (a, b) => {
    const R = 6371e3
    const toRad = x => (x * Math.PI) / 180
    const dLat = toRad(b[0] - a[0])
    const dLng = toRad(b[1] - a[1])
    const lat1 = toRad(a[0])
    const lat2 = toRad(b[0])
    const s1 = Math.sin(dLat / 2)
    const s2 = Math.sin(dLng / 2)
    return 2 * R * Math.asin(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2))
  }

  const updateCaptainTrail = React.useCallback(pos => {
    trailPointsRef.current.push(pos)
    if (!captainTrailRef.current) {
      captainTrailRef.current = L.polyline(trailPointsRef.current, { color: '#2563eb', weight: 6, opacity: 0.6 }).addTo(mapRef.current)
    } else {
      captainTrailRef.current.setLatLngs(trailPointsRef.current)
    }

    // ETA line
    if (userMarkerRef.current) {
      const userPos = userMarkerRef.current.getLatLng()
      if (!etaLineRef.current) {
        etaLineRef.current = L.polyline([userPos, pos], { color: '#f59e0b', weight: 3, dashArray: '6 6', opacity: 0.7 }).addTo(mapRef.current)
      } else {
        etaLineRef.current.setLatLngs([userPos, pos])
      }
    }
  }, [])

  const animateCaptain = React.useCallback((target, heading) => {
    const from = prevRef.current || target
    const duration = 1000
    const start = performance.now()
    cancelAnimationFrame(animRef.current)
    const map = mapRef.current
    ensureMarkerStyles()

    function frame(now) {
      const t = Math.min(1, (now - start) / duration)
      const lat = from[0] + (target[0] - from[0]) * t
      const lng = from[1] + (target[1] - from[1]) * t
      const pos = [lat, lng]

      if (!captainMarkerRef.current) {
        const html = `<div class="captain-marker"><div class="captain-halo"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`
        const icon = L.divIcon({ className: '', html, iconSize: [120, 120], iconAnchor: [60, 60] })
        captainMarkerRef.current = L.marker(pos, { icon, interactive: false }).addTo(map)
        captainMarkerRef.current.setZIndexOffset(1000)
        captainMarkerRef.current.bindTooltip('CAPTAIN', { permanent: true, direction: 'bottom', className: 'captain-tooltip' })
        captainMarkerRef.current.bringToFront?.()
        map.panTo(pos)
      } else {
        captainMarkerRef.current.setLatLng(pos)
        if (heading != null && captainMarkerRef.current.getElement?.()) {
          const el = captainMarkerRef.current.getElement()
          const dot = el.querySelector('.captain-dot')
          if (dot) dot.style.transform = `translate(-50%, -50%) rotate(${heading}deg)`
        }
      }

      updateCaptainTrail(pos)
      // update route progress visuals (done vs remaining)
      try {
        const route = captainRouteRef.current
        if (route && route.getLatLngs) {
          const latlngs = route.getLatLngs()
          if (latlngs && latlngs.length) {
            // find nearest vertex index
            let bestIdx = 0
            let bestDist = Infinity
            for (let i = 0; i < latlngs.length; i++) {
              const p = latlngs[i]
              const d = haversine([pos[0], pos[1]], [p.lat, p.lng])
              if (d < bestDist) { bestDist = d; bestIdx = i }
            }
            const prevIdx = lastProgressIdxRef.current
            if (bestIdx !== prevIdx) {
              // set dash flow direction so dashes move away from captain side
              remainDashDirRef.current = prevIdx === -1 ? 1 : (bestIdx > prevIdx ? 1 : -1)
              lastProgressIdxRef.current = bestIdx
              const done = latlngs.slice(0, bestIdx + 1).map(p => [p.lat, p.lng])
              const remain = latlngs.slice(bestIdx).map(p => [p.lat, p.lng])
              if (routeDoneRef.current) mapRef.current.removeLayer(routeDoneRef.current)
              if (routeRemainRef.current) mapRef.current.removeLayer(routeRemainRef.current)
              if (done.length) routeDoneRef.current = L.polyline(done, { color: '#2563eb', weight: 6, opacity: 0.98 }).addTo(mapRef.current)
              if (remain.length) routeRemainRef.current = L.polyline(remain, { color: '#2563eb', weight: 6, dashArray: '12 10', opacity: 0.95 }).addTo(mapRef.current)
              // start dash RAF if not running
              if (!remainDashAnimRef.current) {
                // timestamp-based dash animation: slower, frame-rate independent
                const pxPerSec = 18 // slower speed (px per second)
        const step = (now) => {
                  try {
                    if (routeRemainRef.current && routeRemainRef.current.setStyle) {
                      const last = remainDashLastRef.current || now
                      const delta = Math.max(0, (now - last) / 1000)
          // apply direction so dashes flow from captain outward along the route
          remainDashOffsetRef.current = (remainDashOffsetRef.current + pxPerSec * delta * remainDashDirRef.current) % 10000
                      routeRemainRef.current.setStyle({ dashOffset: `${remainDashOffsetRef.current}px` })
                      remainDashLastRef.current = now
                    }
                  } catch (err) { console.warn('dash style update failed', err) }
                  remainDashAnimRef.current = requestAnimationFrame(step)
                }
                remainDashLastRef.current = performance.now()
                remainDashAnimRef.current = requestAnimationFrame(step)
              }
            }
          }
        }
      } catch (e) { console.warn('route progress update failed', e) }

      // Dynamic Zoom & Pan
      if (userMarkerRef.current) {
        const userPos = userMarkerRef.current.getLatLng()
        const distance = haversine([pos[0], pos[1]], [userPos.lat, userPos.lng])
        let mapZoom = 13
        if (distance < 500) mapZoom = 17
        else if (distance < 1500) mapZoom = 15
        map.setZoom(mapZoom)
        map.panTo(pos, { animate: true })
      } else {
        map.panTo(pos, { animate: true })
      }

      if (t < 1) animRef.current = requestAnimationFrame(frame)
      else prevRef.current = target
    }
    animRef.current = requestAnimationFrame(frame)
  }, [ensureMarkerStyles, updateCaptainTrail])

  // alias for older name used by other code
  const animateTo = animateCaptain

  React.useEffect(() => {
    const map = L.map('user-live', { zoomControl: true })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map)

    const start = Number.isFinite(fromLat) && Number.isFinite(fromLng) ? [fromLat, fromLng] : [28.61, 77.21]
    const end = Number.isFinite(toLat) && Number.isFinite(toLng) ? [toLat, toLng] : null

    if (end) map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] })

    if (end) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`)
        .then(r => r.json())
        .then(json => {
          const coords = json?.routes?.[0]?.geometry?.coordinates || []
          const latlngs = coords.map(c => [c[1], c[0]])
          if (userRouteRef.current) map.removeLayer(userRouteRef.current)
          userRouteRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 4 }).addTo(map)

          const userIcon = L.divIcon({ className: '', html: `<div class="user-marker"><div class="user-label">USER</div></div>`, iconSize: [100, 28], iconAnchor: [50, 14] })
          if (!userMarkerRef.current) userMarkerRef.current = L.marker([fromLat, fromLng], { icon: userIcon, interactive: false }).addTo(map)

          if (toLat && toLng) L.marker([toLat, toLng]).addTo(map).bindPopup('Destination')
          ensureMarkerStyles()
        })
    } else animateCaptain(start)

    return () => map.remove()
  }, [fromLat, fromLng, toLat, toLng, animateCaptain, ensureMarkerStyles])

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
    const s = io('http://localhost:3000', { auth: { token } })
    socketRef.current = s
    s.emit('ride:subscribe', { rideId })

    // Create a temporary placeholder CAPTAIN marker so user sees captain immediately
    try {
      ensureMarkerStyles()
      const map = mapRef.current
      const seedPos = (Number.isFinite(fromLat) && Number.isFinite(fromLng)) ? [fromLat, fromLng] : (map && map.getCenter ? [map.getCenter().lat, map.getCenter().lng] : [28.61, 77.21])
      if (!captainMarkerRef.current && map) {
        const html = `<div class="captain-marker"><div class="captain-halo"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`
        const icon = L.divIcon({ className: '', html, iconSize: [120, 120], iconAnchor: [60, 60] })
        captainMarkerRef.current = L.marker(seedPos, { icon, interactive: false }).addTo(map)
  try { captainMarkerRef.current.setZIndexOffset && captainMarkerRef.current.setZIndexOffset(900); captainMarkerRef.current.bindTooltip && captainMarkerRef.current.bindTooltip('CAPTAIN', { permanent: true, direction: 'bottom', className: 'captain-tooltip' }); captainMarkerRef.current.bringToFront && captainMarkerRef.current.bringToFront() } catch { console.warn('captain placeholder tooltip failed') }
      }
  } catch { /* ignore */ }

    s.on('ride:info', info => {
      const route = info?.route?.map(p => Array.isArray(p) ? p : [p.lat, p.lng]) || []
      const map = mapRef.current
      if (!map) return
      if (route.length > 0) {
  if (captainRouteRef.current) map.removeLayer(captainRouteRef.current)
  captainRouteRef.current = L.polyline(route, { color: '#3b82f6', weight: 4, opacity: 0.95 }).addTo(map)
        map.fitBounds(L.latLngBounds(route), { padding: [40, 40] })
        const captainStart = captainRouteRef.current.getLatLngs()[0]
        // place a start marker (so user sees CAPTAIN label even before live updates)
        try {
          ensureMarkerStyles()
          const startPos = [captainStart.lat, captainStart.lng]
          if (!startMarkerRef.current) {
            const html = `<div class="captain-marker"><div class="captain-halo"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`
            const icon = L.divIcon({ className: '', html, iconSize: [120, 120], iconAnchor: [60, 60] })
            startMarkerRef.current = L.marker(startPos, { icon, interactive: false }).addTo(map)
            try { startMarkerRef.current.setZIndexOffset && startMarkerRef.current.setZIndexOffset(950); startMarkerRef.current.bindTooltip && startMarkerRef.current.bindTooltip('CAPTAIN', { permanent: true, direction: 'bottom', className: 'captain-tooltip' }); startMarkerRef.current.bringToFront && startMarkerRef.current.bringToFront() } catch (e) { console.warn('start marker tooltip failed', e) }
          } else {
            startMarkerRef.current.setLatLng(startPos)
          }
      } catch { console.warn('start marker creation failed') }
        animateCaptain([captainStart.lat, captainStart.lng])
      }
    })

    s.on('ride:location', payload => {
      // Debug incoming location events
      console.debug && console.debug('ride:location', payload)
      animateCaptain([payload.lat, payload.lng], payload.heading)
    })

    s.on('ride:eta', payload => {
      setEtaKm((payload?.distance || 0)/1000)
      setEtaMin(Math.max(1, Math.round((payload?.duration || 0)/60)))
    })

    // Listen for ride accepted event to refresh data
    s.on('ride:accepted', payload => {
      if (payload?.rideId === rideId) {
        console.log('Ride accepted, refreshing data...')
        fetchRideData()
      }
    })

    // Listen for ride status updates (occupancy changes)
    s.on('ride-status-updated', payload => {
      if (payload?.rideId === rideId) {
        setRideStatus(prev => {
          // Prefer numeric values from the server payload. Fall back to previous state's numeric values.
          const size = (typeof payload.size === 'number') ? payload.size : (typeof prev.size === 'number' ? prev.size : null)
          const occupied = (typeof payload.occupied === 'number') ? payload.occupied : (typeof prev.occupied === 'number' ? prev.occupied : 0)

          console.log('Socket update received:', {
            occupied: occupied,
            size: size,
            previousSize: prev.size
          })

          return {
            ...prev,
            occupied,
            size
          }
        })
      }
    })

    return () => {
      s.disconnect()
      cancelAnimationFrame(animRef.current)
      if (remainDashAnimRef.current) cancelAnimationFrame(remainDashAnimRef.current)
      remainDashAnimRef.current = null
      remainDashLastRef.current = null
    }
  }, [rideId, animateCaptain, ensureMarkerStyles, fromLat, fromLng, fetchRideData, rideStatus.size])

  // Fetch initial ride data on mount
  React.useEffect(() => {
    fetchRideData()
  }, [fetchRideData])

  const onStartClick = React.useCallback(() => {
    const map = mapRef.current
    if (!map) return

    // Prefer captain route bounds, fallback to user route
    let bounds = null
    if (captainRouteRef.current && typeof captainRouteRef.current.getLatLngs === 'function') {
      const latlngs = captainRouteRef.current.getLatLngs()
      if (latlngs && latlngs.length) bounds = L.latLngBounds(latlngs)
    }
    if (!bounds && userRouteRef.current && typeof userRouteRef.current.getLatLngs === 'function') {
      const latlngs = userRouteRef.current.getLatLngs()
      if (latlngs && latlngs.length) bounds = L.latLngBounds(latlngs)
    }
    if (bounds) {
      try { map.fitBounds(bounds, { padding: [40, 40], animate: true }) } catch (err) { console.warn('fitBounds failed', err) }
    }

    // Determine a start position to fly to (prefer startMarker, then captain route start, then user route start)
    const startPos = (startMarkerRef.current && startMarkerRef.current.getLatLng && startMarkerRef.current.getLatLng()) ||
      (captainRouteRef.current && captainRouteRef.current.getLatLngs && captainRouteRef.current.getLatLngs()[0]) ||
      (userRouteRef.current && userRouteRef.current.getLatLngs && userRouteRef.current.getLatLngs()[0]) || null

    if (startPos) {
      const lat = startPos.lat ?? startPos[0]
      const lng = startPos.lng ?? startPos[1]
      try { map.flyTo([lat, lng], 15, { animate: true, duration: 0.8 }) } catch (err) { console.warn('flyTo failed', err) }

      // Highlight captain route: done segment + dashed remaining
      try {
        if (captainRouteRef.current && typeof captainRouteRef.current.getLatLngs === 'function') {
          const latlngs = captainRouteRef.current.getLatLngs()
          if (latlngs && latlngs.length) {
            if (routeDoneRef.current) map.removeLayer(routeDoneRef.current)
            if (routeRemainRef.current) map.removeLayer(routeRemainRef.current)
            routeDoneRef.current = L.polyline([latlngs[0]], { color: '#2563eb', weight: 6, opacity: 0.95 }).addTo(map)
            routeRemainRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 6, dashArray: '12 10', opacity: 0.95 }).addTo(map)
          }
        }
      } catch (err) { console.warn('route highlight failed', err) }

      // Ensure captain marker exists and is visible (pulsing)
      try {
        ensureMarkerStyles()
        const posLatLng = [lat, lng]
        if (!captainMarkerRef.current) {
          const haloClass = 'captain-halo captain-pulse'
          const html = `<div class="captain-marker"><div class="${haloClass}"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`
          const icon = L.divIcon({ className: '', html, iconSize: [120, 120], iconAnchor: [60, 60] })
          captainMarkerRef.current = L.marker(posLatLng, { icon, interactive: false }).addTo(map)
          try { captainMarkerRef.current.setZIndexOffset && captainMarkerRef.current.setZIndexOffset(1000); captainMarkerRef.current.bindTooltip && captainMarkerRef.current.bindTooltip('CAPTAIN', { permanent: true, direction: 'bottom', className: 'captain-tooltip' }); captainMarkerRef.current.bringToFront && captainMarkerRef.current.bringToFront() } catch (e) { console.warn('marker tooltip failed', e) }
        } else {
          captainMarkerRef.current.setLatLng(posLatLng)
        }
        // animateTo will smoothly place the marker and update progress overlays
        animateTo([lat, lng])
      } catch (err) { console.warn('ensure captain marker failed', err) }
    }

    setUserStarted(true)
  }, [ensureMarkerStyles, animateTo])

  // Seat calculations for UI (totalSeats null means unknown)
  const totalSeats = (typeof rideStatus.size === 'number') ? rideStatus.size : null
  const seatsForRender = totalSeats ?? 4 // render 4 placeholder seats when unknown
  const occupiedCount = (typeof rideStatus.occupied === 'number') ? rideStatus.occupied : 0
  const availableCount = (totalSeats !== null) ? (totalSeats - occupiedCount) : null

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Ride tracking</h2>
          <div style={{ marginTop: 8, marginBottom: 12 }}>            
            {(etaKm != null || etaMin != null) && (
              <div style={{ fontSize: 14, color: '#111' }}>
                {etaKm != null ? `${etaKm.toFixed(1)} km` : '--'} • {etaMin != null ? `${etaMin} min` : '--'}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '10px' }}>
              {!userStarted && (
                <button onClick={onStartClick} style={{ background: '#2563eb', color: 'white', padding: '10px 16px', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer' }}>Start tracking</button>
              )}
              <button 
                onClick={() => setShowStatusPanel(!showStatusPanel)}
                style={{ 
                  background: showStatusPanel ? '#16a34a' : '#f3f4f6', 
                  color: showStatusPanel ? 'white' : '#374151',
                  padding: '10px 16px', 
                  borderRadius: 8, 
                  border: '1px solid #d1d5db', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🚖 View Status
              </button>
            </div>
          </div>
          
          {/* Status Panel */}
          {showStatusPanel && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              maxWidth: '400px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>🚖</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Auto Status</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Live seat availability</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{totalSeats !== null ? totalSeats : '—'}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seats</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>{occupiedCount}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupied</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{availableCount !== null ? availableCount : '—'}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</div>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: (availableCount !== null && availableCount > 0) ? '#f0fdf4' : (availableCount === 0 ? '#fef2f2' : '#fffaf0'),
                border: `1px solid ${ (availableCount !== null && availableCount > 0) ? '#bbf7d0' : (availableCount === 0 ? '#fecaca' : '#f5e1a4') }`,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: (availableCount !== null && availableCount > 0) ? '#166534' : '#b45309'
                }}>
                  {availableCount !== null 
                    ? (availableCount > 0 ? `✅ ${availableCount} seat${availableCount > 1 ? 's' : ''} available` : '❌ Auto is full')
                    : '⚠️ Seat info unavailable'
                  }
                </div>
              </div>

              {/* Visual seat grid: if size unknown show black seats (placeholder) */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {Array.from({ length: seatsForRender }).map((_, i) => {
                  const known = totalSeats !== null
                  const color = !known ? 'black' : (i < occupiedCount ? '#16a34a' : '#9ca3af')
                  return (
                    <div key={i} style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: color, border: '1px solid rgba(0,0,0,0.08)' }} />
                  )
                })}
              </div>
            </div>
          )}
          
          <div id="user-live" style={{ width: '75vw', maxWidth: 1100, height: '85vh', border: '1px solid #e5e7eb', borderRadius: 12 }} />
        </div>
      </div>
    </div>
  )
}