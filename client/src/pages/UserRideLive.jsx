import React from 'react'
import { useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getUserId } from '../utils/userUtils'

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

  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const rideId = params.get('rideId') || 'demo'

  const [etaMin, setEtaMin] = React.useState(null)
  const [etaKm, setEtaKm] = React.useState(null)
  const [userStarted, setUserStarted] = React.useState(false)
  const [rideStatus, setRideStatus] = React.useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem(`user_rideStatus_${rideId}`)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.warn('Failed to parse saved ride status:', e)
      }
    }
    return { originalSize: 4, finalSize: 4, occupied: 0 }
  })
  const [showStatusPanel, setShowStatusPanel] = React.useState(false)
    const [isBooking, setIsBooking] = React.useState(false)
  const [bookingStatus, setBookingStatus] = React.useState(null) // 'success', 'error', 'full', 'pending', 'rejected'
  const [hasBookedThisRide, setHasBookedThisRide] = React.useState(false)
  const [passengerCount, setPassengerCount] = React.useState(1)

  const ensureMarkerStyles = React.useCallback(() => {
  if (typeof document === 'undefined') return
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
      // prefer document.head, fallback to querySelector, getElementsByTagName, body, or documentElement
      const head = document.head || document.querySelector('head') || (document.getElementsByTagName && document.getElementsByTagName('head')?.[0]) || null
      if (head && typeof head.appendChild === 'function') {
        try { head.appendChild(s) } catch { /* fallthrough to other append targets */ }
      }
      // ensure we've appended it somewhere; try body and documentElement as last resorts
      if (!document.getElementById('marker-styles')) {
        if (document.body && typeof document.body.appendChild === 'function') {
          try { document.body.appendChild(s) } catch { /* ignore */ }
        } else if (document.documentElement && typeof document.documentElement.appendChild === 'function') {
          try { document.documentElement.appendChild(s) } catch { /* ignore */ }
        }
      }
    } catch (err) {
      // swallow — style injection is non-critical, avoid breaking the app
      console.warn('Failed to inject marker styles:', err)
    }
  }, [])

  const fromLat = parseFloat(params.get('fromLat'))
  const fromLng = parseFloat(params.get('fromLng'))
  const toLat = parseFloat(params.get('toLat'))
  const toLng = parseFloat(params.get('toLng'))
  const fromName = params.get('fromName') || 'Pickup Location'
  const toName = params.get('toName') || 'Destination'


  React.useEffect(() => {
    console.log('🔍 Location names from URL:', { fromName, toName })
    console.log('🔍 URL params:', params.toString())
  }, [])

  // Fetch initial ride data
  const fetchRideData = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
  // This endpoint is public on backend; include Authorization only if token exists
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  // Use relative path so dev proxy and production host work correctly
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const response = await fetch(`${BACKEND}/api/ride/${rideId}`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        const ride = data.ride || data
        
        // Get captain's actual seating capacity
        let size = (typeof ride.size === 'number') ? ride.size : null
        if (ride.captainId) {
          try {
            const captainResponse = await fetch(`${BACKEND}/api/auth/captain/${ride.captainId}/seating`)
            if (captainResponse.ok) {
              const captainData = await captainResponse.json()
              if (typeof captainData.seatingCapacity === 'number') size = captainData.seatingCapacity
              console.log('Fetched captain seating capacity:', size, 'for captain:', captainData.captainName)
            }
          } catch (captainErr) {
            console.warn('Failed to fetch captain seating capacity:', captainErr)
          }
        }
        
        setRideStatus(prev => ({
          originalSize: (typeof ride.size === 'number') ? ride.size : prev.originalSize,
          finalSize: (typeof size === 'number') ? size : prev.finalSize,
          occupied: (typeof ride.occupied === 'number') ? ride.occupied : prev.occupied
        }))

        console.log('Fetched ride data:', {
          originalSize: ride.size,
          finalSize: size,
          occupied: ride.occupied,
          captainId: ride.captainId,
          pickup: ride.pickup,
          from: ride.from,
          captainLocation: ride.captainLocation
        })

        // Create captain start marker if we have captain's location data
        const map = mapRef.current
        if (map) {
          let captainPos = null
          
          // Try different ways to get captain's starting location
          if (ride.pickup && ride.pickup.lat && ride.pickup.lng) {
            captainPos = [ride.pickup.lat, ride.pickup.lng]
          } else if (ride.from && ride.from.lat && ride.from.lng) {
            captainPos = [ride.from.lat, ride.from.lng]
          } else if (ride.captainLocation && ride.captainLocation.lat && ride.captainLocation.lng) {
            captainPos = [ride.captainLocation.lat, ride.captainLocation.lng]
          }
          
          if (captainPos) {
            try {
              ensureMarkerStyles()
              
              // Remove existing start marker
              if (startMarkerRef.current) {
                map.removeLayer(startMarkerRef.current)
              }
              
              const html = `<div class="captain-marker"><div class="captain-halo"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`
              const icon = L.divIcon({ className: '', html, iconSize: [120, 120], iconAnchor: [60, 60] })
              startMarkerRef.current = L.marker(captainPos, { icon, interactive: false }).addTo(map)
              startMarkerRef.current.setZIndexOffset(950)
              startMarkerRef.current.bindTooltip('Captain Location', { permanent: true, direction: 'bottom', className: 'captain-tooltip' })
              startMarkerRef.current.bringToFront()
              
              // Set map view to show captain location first, then fit both locations
              map.setView(captainPos, 14)
              
              // After a short delay, fit bounds to show both captain and user
              setTimeout(() => {
                const userPos = [fromLat, fromLng]
                const bounds = L.latLngBounds([captainPos, userPos])
                map.fitBounds(bounds, { padding: [50, 50] })
              }, 1000)
              
              console.log('✅ Captain marker created from API data at:', captainPos)
            } catch (e) {
              console.warn('Failed to create captain marker:', e)
            }
          }
        }
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
    const mapElement = document.getElementById('user-live')
    if (!mapElement) {
      console.error('Map container element not found')
      return
    }
    
    const map = L.map('user-live', { zoomControl: true })
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map)

    const start = Number.isFinite(fromLat) && Number.isFinite(fromLng) ? [fromLat, fromLng] : [28.61, 77.21]
    const end = Number.isFinite(toLat) && Number.isFinite(toLng) ? [toLat, toLng] : null

    if (end) map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] })

    if (end) {
      // Generate curved route instead of OSRM call
      console.log('🛣️ Generating curved user route (OSRM disabled)')
      
      // Check if map is still valid before proceeding
      if (!map || !map._container) {
        console.warn('Map container not available, skipping route rendering')
        return
      }
      
      // Generate curved route points
      const startLat = Number(fromLat)
      const startLng = Number(fromLng)
      const endLat = Number(toLat)
      const endLng = Number(toLng)
      
      const distance = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2))
      const numPoints = Math.max(12, Math.min(25, Math.floor(distance * 2500)))
      
      const curvePoints = []
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const lat = startLat + (endLat - startLat) * t
        const lng = startLng + (endLng - startLng) * t
        
        // Add curve effects for realistic path
        const mainCurve = Math.sin(t * Math.PI * 1.3) * 0.004
        const roadVariation = Math.sin(t * Math.PI * 2.5) * 0.002
        const perpVariation = Math.cos(t * Math.PI * 3.5) * 0.001
        
        curvePoints.push([
          lat + mainCurve - perpVariation,
          lng - mainCurve + roadVariation
        ])
      }
      
      // Remove existing user route
      if (userRouteRef.current && map.hasLayer(userRouteRef.current)) {
        map.removeLayer(userRouteRef.current)
      }
      
      // Add curved user route
      userRouteRef.current = L.polyline(curvePoints, { 
        color: '#3b82f6', 
        weight: 4,
        opacity: 0.8,
        dashArray: '15, 8',
        className: 'user-route-line'
      }).addTo(map)

      const userIcon = L.divIcon({ className: '', html: `<div class="user-marker"><div class="user-label">USER</div></div>`, iconSize: [100, 28], iconAnchor: [50, 14] })
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([fromLat, fromLng], { icon: userIcon, interactive: false }).addTo(map)
      }

      if (toLat && toLng) {
        L.marker([toLat, toLng]).addTo(map).bindPopup('Destination')
      }
      ensureMarkerStyles()
      console.log('🛣️ ✅ Curved user route added with', curvePoints.length, 'points')
    } else animateCaptain(start)

    return () => {
      if (map && map._container) {
        map.remove()
      }
    }
  }, [fromLat, fromLng, toLat, toLng, animateCaptain, ensureMarkerStyles])

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
  const s = io(SOCKET_URL, { auth: { token } })
    socketRef.current = s
    
    // Join ride room for real-time updates
    s.emit('ride:subscribe', { rideId })
    
    // Also join user-specific room for booking responses
    const userId = getUserId()
    s.emit('join', `user:${userId}`)
    
    console.log('🔌 User socket connected, joining ride room:', rideId)

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

    // Listen for ride accepted event - update from socket data only, don't refetch API
    s.on('ride:accepted', payload => {
      if (payload?.rideId === rideId) {
        console.log('Ride accepted via socket:', payload)
        if (typeof payload.occupied === 'number' && typeof payload.size === 'number') {
          const newStatus = {
            ...rideStatus,
            occupied: payload.occupied,
            finalSize: payload.size
          }
          setRideStatus(newStatus)
          // Persist to localStorage
          localStorage.setItem(`user_rideStatus_${rideId}`, JSON.stringify(newStatus))
        }
      }
    })

    // Listen for ride start event - when captain starts the ride
    s.on('ride:info', payload => {
      if (payload?.rideId === rideId && payload?.status === 'active') {
        console.log('🚗 Captain started the ride:', payload)
        // Check if current user has booked this ride
        const currentUserEmail = localStorage.getItem('userEmail')
        const hasBooked = localStorage.getItem(`booked_${rideId}_${currentUserEmail}`) === 'true'
        
        if (hasBooked) {
          console.log('✅ User has booked this ride - showing already booked message')
          setHasBookedThisRide(true)
        }
      }
    })

    // Listen for ride status updates (occupancy changes)
    s.on('ride-status-updated', payload => {
      console.log('🔄 User received ride-status-updated:', payload)
      if (payload?.rideId === rideId) {
        setRideStatus(prev => {
          // payload.size is authoritative final size when present
          const finalSize = (typeof payload.size === 'number') ? payload.size : (typeof prev.finalSize === 'number' ? prev.finalSize : null)
          const occupied = (typeof payload.occupied === 'number') ? payload.occupied : (typeof prev.occupied === 'number' ? prev.occupied : 0)

          console.log('✅ User socket update received:', {
            rideId: payload.rideId,
            occupied: occupied,
            finalSize: finalSize,
            previousFinal: prev.finalSize,
            previousOccupied: prev.occupied
          })

          const newStatus = {
            ...prev,
            occupied,
            finalSize
          }

          // Persist to localStorage
          localStorage.setItem(`user_rideStatus_${rideId}`, JSON.stringify(newStatus))

          return newStatus
        })
      } else {
        console.log('❌ Ride ID mismatch:', payload?.rideId, 'vs expected:', rideId)
      }
    })

    // Listen for captain accept/reject responses
    s.on('ride:accepted', payload => {
      if (payload?.rideId === rideId) {
        console.log('✅ Received ride:accepted for rideId:', rideId, 'payload:', payload)
        setBookingStatus('success')
        setIsBooking(false)
        setHasBookedThisRide(true)
        // Store booking status in localStorage (user-specific)
        const currentUserEmail = localStorage.getItem('userEmail')
        localStorage.setItem(`booked_${rideId}_${currentUserEmail}`, 'true')
        localStorage.setItem(`bookingStatus_${rideId}_${currentUserEmail}`, 'success')
        // Use the exact occupied count from captain's payload instead of incrementing
        setRideStatus(prev => ({
          ...prev,
          occupied: (typeof payload.occupied === 'number') ? payload.occupied : prev.occupied,
          finalSize: (typeof payload.size === 'number') ? payload.size : prev.finalSize
        }))
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setBookingStatus(null)
          localStorage.removeItem(`bookingStatus_${rideId}_${currentUserEmail}`)
        }, 3000)
      }
    })

    s.on('ride:rejected', payload => {
      if (payload?.rideId === rideId) {
        setBookingStatus('rejected')
        setIsBooking(false)
        // Auto-hide rejection message after 5 seconds
        setTimeout(() => setBookingStatus(null), 5000)
      }
    })

    // Listen for booking errors (full auto, etc)
    s.on('ride:booking-error', payload => {
      if (payload?.rideId === rideId) {
        setBookingStatus(payload.reason === 'full' ? 'full' : 'error')
        setIsBooking(false)
        // Auto-hide error message after 5 seconds
        setTimeout(() => setBookingStatus(null), 5000)
      }
    })

    return () => {
      s.disconnect()
      cancelAnimationFrame(animRef.current)
      if (remainDashAnimRef.current) cancelAnimationFrame(remainDashAnimRef.current)
      remainDashAnimRef.current = null
      remainDashLastRef.current = null
    }
  }, [rideId, animateCaptain, ensureMarkerStyles, fromLat, fromLng, fetchRideData])


  // Fetch initial ride data on mount and check booking status
  React.useEffect(() => {
    fetchRideData()
    // Check if current user has already booked this ride (user-specific)
    const currentUserEmail = localStorage.getItem('userEmail')
    const hasBooked = localStorage.getItem(`booked_${rideId}_${currentUserEmail}`) === 'true'
    setHasBookedThisRide(hasBooked)
    
    // Also check booking status from localStorage
    const savedBookingStatus = localStorage.getItem(`bookingStatus_${rideId}_${currentUserEmail}`)
    if (savedBookingStatus && hasBooked) {
      setBookingStatus(savedBookingStatus)
    }
  }, [fetchRideData, rideId])

  // Book Auto function - now waits for captain accept/reject
  const handleBookAuto = React.useCallback(async () => {
    if (isBooking) return
    
    console.log('🚀 handleBookAuto called with passengerCount:', passengerCount)
    
    // Validate seat availability before booking
    const availableSeats = rideStatus.finalSize - rideStatus.occupied
    if (passengerCount > availableSeats) {
      alert(`❌ Only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available. Please select ${availableSeats} or fewer passengers.`)
      return
    }
    
    setIsBooking(true)
    setBookingStatus('pending')
    
    try {
      const token = localStorage.getItem('token')
      const userId = getUserId()
      
      // Send booking request via socket instead of API
      if (socketRef.current) {
        // Ensure we have proper location names
        const actualFromName = fromName && fromName !== 'Pickup Location' ? fromName : `Location (${fromLat?.toFixed(4)}, ${fromLng?.toFixed(4)})`
        const actualToName = toName && toName !== 'Destination' ? toName : `Location (${toLat?.toFixed(4)}, ${toLng?.toFixed(4)})`
        
        const requestData = {
          rideId,
          userId,
          pickup: { lat: fromLat, lng: fromLng, name: actualFromName },
          destination: { lat: toLat, lng: toLng, name: actualToName },
          passengerCount: passengerCount,
          pickupName: actualFromName,
          destinationName: actualToName
        }
        
        console.log('🚀 Sending request with location names:', { 
          pickup: actualFromName, 
          destination: actualToName 
        })
        socketRef.current.emit('ride:request', requestData)
        console.log('🚀 User sending ride request:', requestData)
        console.log('🔌 User socket ID:', socketRef.current.id)
        console.log('👥 Passenger count being sent:', passengerCount)
        alert(`Booking request sent for ${passengerCount} passenger${passengerCount > 1 ? 's' : ''}! RideId: ${rideId}, UserId: ${userId}, PassengerCount: ${passengerCount}`)
      } else {
        // Fallback to API if socket not available
        const response = await fetch(`/api/ride/${rideId}/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          },
          body: JSON.stringify({ rideId })
        })
        
        const data = await response.json()
        if (!response.ok) {
          setBookingStatus(data.message === 'Seat not available' ? 'full' : 'error')
          setIsBooking(false)
        }
      }
    } catch (error) {
      console.error('Booking error:', error)
      setBookingStatus('error')
      setIsBooking(false)
    }
  }, [isBooking, passengerCount, rideStatus.finalSize, rideStatus.occupied, rideId, fromLat, fromLng, toLat, toLng])

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

  // Seat calculations for UI with proper fallbacks
  // finalSize is authoritative when present, otherwise fall back to originalSize, then default to 4
  const seats = (typeof rideStatus.finalSize === 'number' && rideStatus.finalSize > 0) ? rideStatus.finalSize : 
               (typeof rideStatus.originalSize === 'number' && rideStatus.originalSize > 0) ? rideStatus.originalSize : 4
  const occupied = (typeof rideStatus.occupied === 'number' && rideStatus.occupied >= 0) ? rideStatus.occupied : 0
  // Always show proper seat count, never null
  const seatCount = seats
  const availableCount = Math.max(0, seats - occupied)

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ padding: '16px' }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, marginBottom: '16px' }}>Ride tracking</h2>
          <div style={{ marginBottom: '16px' }}>            
            {(etaKm != null || etaMin != null) && (
              <div style={{ fontSize: 'clamp(12px, 3vw, 14px)', color: '#111', marginBottom: '12px' }}>
                {etaKm != null ? `${etaKm.toFixed(1)} km` : '--'} • {etaMin != null ? `${etaMin} min` : '--'}
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center', 
              flexWrap: 'wrap'
            }}>
              {!userStarted && (
                <button 
                  onClick={onStartClick} 
                  style={{ 
                    background: '#2563eb', 
                    color: 'white', 
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)', 
                    borderRadius: 8, 
                    border: 'none', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    fontSize: 'clamp(12px, 3vw, 14px)',
                    flex: '1 1 auto',
                    minWidth: '120px'
                  }}
                >
                  Start tracking
                </button>
              )}
              <button 
                onClick={() => setShowStatusPanel(!showStatusPanel)}
                style={{ 
                  background: showStatusPanel ? '#16a34a' : '#f3f4f6', 
                  color: showStatusPanel ? 'white' : '#374151',
                  padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)', 
                  borderRadius: 8, 
                  border: '1px solid #d1d5db', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'clamp(12px, 3vw, 14px)',
                  flex: '1 1 auto',
                  minWidth: '120px',
                  justifyContent: 'center'
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
              padding: 'clamp(16px, 4vw, 20px)',
              marginBottom: '16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              maxWidth: '100%',
              width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '24px' }}>🚖</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>Auto Status</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Live seat availability</p>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                gap: 'clamp(12px, 3vw, 16px)',
                marginBottom: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 'bold', color: '#1f2937' }}>{seats}</div>
                  <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seats</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 'bold', color: '#ef4444' }}>{occupied}</div>
                  <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Occupied</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 'bold', color: '#16a34a' }}>{availableCount}</div>
                  <div style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available</div>
                </div>
              </div>

              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: (availableCount > 0) ? '#f0fdf4' : (availableCount === 0 ? '#fef2f2' : '#fffaf0'),
                border: `1px solid ${ (availableCount > 0) ? '#bbf7d0' : (availableCount === 0 ? '#fecaca' : '#f5e1a4') }`,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: (availableCount > 0) ? '#166534' : '#b45309'
                }}>
                  {availableCount > 0 
                    ? `✅ ${availableCount} seat${availableCount > 1 ? 's' : ''} available`
                    : '❌ Auto is full'
                  }
                </div>
              </div>

              {/* Passenger Count Selector */}
              {!hasBookedThisRide && availableCount > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    👥 Number of Passengers: (Max {availableCount} available)
                  </label>
                  <select
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      background: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {Array.from({ length: Math.max(1, availableCount) }, (_, i) => i + 1).map(count => (
                      <option key={count} value={count}>
                        {count} passenger{count > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Book Auto Button */}
              <div style={{ marginTop: '16px' }}>
                {hasBookedThisRide ? (
                  <div style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    ✅ You have already booked this auto
                  </div>
                ) : availableCount !== null && availableCount > 0 ? (
                  <button
                    onClick={handleBookAuto}
                    disabled={isBooking}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: isBooking ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: isBooking ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isBooking ? '⏳ Booking...' : `🚖 Book Auto (${passengerCount} passenger${passengerCount > 1 ? 's' : ''})`}
                  </button>
                ) : availableCount === 0 ? (
                  <div style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ❌ Seat not available, please wait some time or see another auto
                  </div>
                ) : (
                  <div style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#fffaf0',
                    color: '#b45309',
                    border: '1px solid #f5e1a4',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    ⚠️ Checking availability...
                  </div>
                )}
              </div>

              {/* Booking Status Messages */}
              {bookingStatus && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center',
                  background: bookingStatus === 'success' ? '#f0fdf4' : bookingStatus === 'pending' ? '#fffaf0' : '#fef2f2',
                  color: bookingStatus === 'success' ? '#166534' : bookingStatus === 'pending' ? '#b45309' : '#dc2626',
                  border: `1px solid ${bookingStatus === 'success' ? '#bbf7d0' : bookingStatus === 'pending' ? '#f5e1a4' : '#fecaca'}`
                }}>
                  {bookingStatus === 'success' && '✅ Booking confirmed! You have reserved a seat.'}
                  {bookingStatus === 'pending' && '⏳ Waiting for captain response...'}
                  {bookingStatus === 'rejected' && '❌ Captain rejected your request. Please try another auto.'}
                  {bookingStatus === 'full' && '❌ Auto is full! Please try another auto.'}
                  {bookingStatus === 'error' && '❌ Booking failed. Please try again.'}
                </div>
              )}

              {/* Visual seat grid: if size unknown show black seats (placeholder) */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {Array.from({ length: seatCount }).map((_, i) => {
                  // default unknown state: black
                  let color = 'black'
                  if (seats !== null) {
                    // known seats: occupied -> red, free -> green
                    color = (i < occupied) ? '#ef4444' : '#16a34a'
                  }
                  return (
                    <div key={i} style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: color, border: '1px solid rgba(0,0,0,0.08)' }} />
                  )
                })}
              </div>

              {/* My Booked Rides Button */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/user/accepted-rides')
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🎫 My Booked Rides
                </button>
              </div>
            </div>
          )}
          
          <div 
            className="map-container" 
            id="user-live" 
            style={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: 12,
              width: '100%',
              height: 'clamp(300px, 50vh, 600px)',
              minHeight: '300px'
            }} 
          />
        </div>
      </div>
    </div>
  )
}