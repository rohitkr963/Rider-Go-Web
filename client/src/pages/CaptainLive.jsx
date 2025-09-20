import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Pane, Circle } from 'react-leaflet'
import L from 'leaflet'
import { io } from 'socket.io-client'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Captain marker with text
const captainTextIcon = new L.DivIcon({
  className: 'captain-text-marker',
  html: `<div style="
    background: #2563eb; 
    color: white; 
    padding: 4px 8px; 
    border-radius: 8px; 
    font-weight: bold; 
    font-size: 12px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid white;
  ">CAPTAIN</div>`,
  iconSize: [70, 25],
  iconAnchor: [35, 25]
})

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Inject captain styles (halo, dot, label) once
if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.head && !document.getElementById('captain-live-styles')) {
  const s = document.createElement('style')
  s.id = 'captain-live-styles'
  s.innerHTML = `
    .captain-marker { position: relative; width: 120px; height: 120px; pointer-events: none; }
    .captain-halo { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; transform: translate(-50%, -50%); border-radius: 50%; background: rgba(37,99,235,0.12); border: 3px solid rgba(37,99,235,0.25); box-shadow: 0 6px 18px rgba(37,99,235,0.12); pointer-events: none; }
    .captain-dot { width: 18px; height: 18px; background: rgba(37,99,235,1); border-radius: 50%; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 18px rgba(37,99,235,0.9); border: 3px solid rgba(255,255,255,0.95); }
    .captain-label { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 8px); background: rgba(2,6,23,0.85); color: #fff; padding: 6px 10px; border-radius: 14px; font-size: 12px; font-weight: 700; pointer-events: auto; }
    .captain-pulse { animation: captainPulse 2400ms ease-out infinite; }
    @keyframes captainPulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; } 65% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; } 100% { opacity: 0; } }
  `
  try {
    const head = document.head || document.getElementsByTagName('head')?.[0]
    if (head && typeof head.appendChild === 'function') head.appendChild(s)
    else if (document.body && typeof document.body.appendChild === 'function') document.body.appendChild(s)
  } catch (err) {
    console.warn('Failed to inject captain styles:', err)
  }
}

// DivIcons for captain marker (static and pulsing)
const captainIcon = L.divIcon({
  className: '',
  html: `<div class="captain-marker"><div class="captain-halo"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`,
  iconSize: [120, 120],
  iconAnchor: [60, 60]
})

const captainPulsingIcon = L.divIcon({
  className: '',
  html: `<div class="captain-marker"><div class="captain-halo captain-pulse"></div><div class="captain-dot"></div><div class="captain-label">CAPTAIN</div></div>`,
  iconSize: [120, 120],
  iconAnchor: [60, 60]
})

// Component to handle map updates
function MapUpdater({ center, zoom, fitBounds, preserve }) {
  const map = useMap()

  useEffect(() => {
    if (center) {
      // Smooth zoom/center
      if (zoom) {
        map.flyTo(center, zoom, { animate: true, duration: 0.8 })
      } else {
        map.flyTo(center, map.getZoom(), { animate: true, duration: 0.8 })
      }
    }
  }, [center, zoom, map])

  useEffect(() => {
    if (!preserve && fitBounds && Array.isArray(fitBounds) && fitBounds.length > 0) {
      const bounds = L.latLngBounds(fitBounds)
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [fitBounds, preserve, map])
  
  return null
}

// Component for moving captain marker with smooth animation
function MovingCaptainMarker({ position, isMoving }) {
  const map = useMap()
  const markerRef = useRef()
  const animationRef = useRef()
  const animStartRef = useRef(null)
  const animFromRef = useRef(null)
  const animToRef = useRef(null)
  const pulseIntervalRef = useRef()
  
  useEffect(() => {
    if (!markerRef.current && position) {
      // Initialize marker on first render
      markerRef.current = L.marker(position, { icon: isMoving ? captainPulsingIcon : captainIcon }).addTo(map)
      return
    }
  if (markerRef.current && position) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      const marker = markerRef.current
      const from = marker.getLatLng()
      const to = L.latLng(position)
      animFromRef.current = from
      animToRef.current = to
      animStartRef.current = null
      const durationMs = 800

      const step = (ts) => {
        if (!animStartRef.current) animStartRef.current = ts
        const t = Math.min(1, (ts - animStartRef.current) / durationMs)
        const lat = from.lat + (to.lat - from.lat) * t
        const lng = from.lng + (to.lng - from.lng) * t
        marker.setLatLng([lat, lng])

        // Only recenter if marker moved outside current map bounds, otherwise keep map steady
        try {
          const bounds = map.getBounds()
          if (!bounds.contains([lat, lng]) && isMoving) {
            map.panTo([lat, lng], { animate: true })
          }
        } catch (err) { console.warn('pan check failed', err) }

        if (t < 1) {
          animationRef.current = requestAnimationFrame(step)
        } else {
          // ensure final recenter at animation end if navigating
          if (isMoving) try { map.panTo(to, { animate: true }) } catch (err) { console.warn('final pan failed', err) }
        }
      }
  animationRef.current = requestAnimationFrame(step)
      // Update icon based on moving state
      marker.setIcon(isMoving ? captainPulsingIcon : captainIcon)
    }
  }, [position, isMoving, map])
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      const pid = pulseIntervalRef.current
      if (pid) clearInterval(pid)
    }
  }, [])
  
  return null
}

export default function CaptainLive() {
  const [rideData, setRideData] = useState(() => {
    // Check if we're continuing a ride from homepage
    const activeRide = localStorage.getItem('captain_activeRide')
    if (activeRide) {
      try {
        const parsed = JSON.parse(activeRide)
        console.log('🔄 Restoring ride data from homepage continue:', parsed.rideData)
        return parsed.rideData
      } catch (error) {
        console.error('❌ Failed to parse active ride data:', error)
      }
    }
    return null
  })
  const [captainPosition, setCaptainPosition] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeDistanceKm, setRouteDistanceKm] = useState(null)
  const [routeDurationMin, setRouteDurationMin] = useState(null)
  const routeStepsRef = useRef([])
  const [rideStatus, setRideStatus] = useState(() => {
    // Check if we're continuing a ride from homepage first
    const activeRide = localStorage.getItem('captain_activeRide')
    if (activeRide) {
      try {
        const parsed = JSON.parse(activeRide)
        console.log('🔄 Restoring ride status from homepage continue:', parsed.rideStatus)
        return parsed.rideStatus || 'planning'
      } catch (error) {
        console.error('❌ Failed to parse active ride status:', error)
      }
    }
    
    // Load ride status from localStorage to persist across navigation
    const saved = localStorage.getItem('captain_rideStatus')
    console.log('🔍 Initial rideStatus from localStorage:', saved)
    // Force reset to planning if completed to show buttons again
    if (saved === 'completed') {
      localStorage.setItem('captain_rideStatus', 'planning')
      return 'planning'
    }
    return saved || 'planning'
  }) // planning, started, completed
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isNavigating, setIsNavigating] = useState(() => {
    // Load navigation state from localStorage
    const saved = localStorage.getItem('captain_isNavigating')
    return saved === 'true'
  })
  const [simulatedPosition, setSimulatedPosition] = useState(null)
  const [mapFocus, setMapFocus] = useState(null)
  const [mapZoomLevel, setMapZoomLevel] = useState(13)
  const [pickupQuery, setPickupQuery] = useState('')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [pickupSuggestions, setPickupSuggestions] = useState([])
  const [destinationSuggestions, setDestinationSuggestions] = useState([])
  const socketRef = useRef(null)
  const rideIdRef = useRef(null)
  const watchIdRef = useRef(null)
  const routeIndexRef = useRef(0)
  const simulationIntervalRef = useRef(null)
  const recalcTimerRef = useRef(null)
  const lastRecalcFromRef = useRef(null)
  const searchDebounceRef = useRef(null)
  const lastEtaUpdateRef = useRef(0)
  const [occupied, setOccupied] = useState(() => {
    // Always start with 0 for fresh rides, only restore if continuing active ride
    const activeRide = localStorage.getItem('captain_activeRide')
    if (activeRide) {
      try {
        const parsed = JSON.parse(activeRide)
        // Only restore occupied count if ride status is 'started' (active ride)
        if (parsed.rideStatus === 'started' && typeof parsed.occupied === 'number') {
          return parsed.occupied
        }
      } catch (e) { /* ignore */ }
    }
    // Default to 0 for fresh rides
    return 0
  })
  const [vehicleSize, setVehicleSize] = useState(() => {
    const saved = localStorage.getItem('captain_vehicleSize')
    return saved ? parseInt(saved) : 4
  })
  const [bookingNotifications, setBookingNotifications] = useState([])
  const [showBookingPanel, setShowBookingPanel] = useState(false)
  const [userPickupLocations, setUserPickupLocations] = useState([]) // User pickup locations
  const [incomingRideRequest, setIncomingRideRequest] = useState(null)
  const [showAcceptRejectModal, setShowAcceptRejectModal] = useState(false)
  const [acceptedRides, setAcceptedRides] = useState(() => {
    try {
      const saved = localStorage.getItem('captain_acceptedRides')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Load pickup locations from accepted rides (only once on mount)
  useEffect(() => {
    const pickupLocations = acceptedRides
      .filter(ride => ride.pickup && ride.pickup.lat && ride.pickup.lng)
      .map(ride => ({
        id: `pickup-${ride.userId}-${ride.rideId}`,
        userId: ride.userId,
        userEmail: ride.userEmail || 'User',
        lat: ride.pickup.lat,
        lng: ride.pickup.lng,
        name: ride.pickup.name || 'User Pickup Location',
        fare: ride.fare || 50,
        timestamp: new Date(ride.acceptedAt || Date.now()),
        rideId: ride.rideId
      }))
    
    if (pickupLocations.length > 0) {
      // Replace existing locations completely to avoid duplicates
      setUserPickupLocations(pickupLocations)
      console.log('📍 Loaded pickup locations from accepted rides:', pickupLocations)
    }
  }, []) // Only run once on mount, not on acceptedRides changes

  const isMongoId = (v) => typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v)

  // get current rideId from URL
  const getRideIdFromUrl = () => new URLSearchParams(window.location.search).get('rideId')
  const setRideIdInUrl = (id) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('rideId', id)
      window.history.replaceState({}, '', url.toString())
    } catch (_) {}
  }

  // Ensure a DB Ride exists; if not, create one using pickup/destination
  const ensureRideExists = async () => {
    try {
      const currentId = (rideData && rideData.id) || getRideIdFromUrl()
      if (isMongoId(currentId)) return currentId
      if (!rideData?.pickup || !rideData?.destination) return null
      const body = {
        fromLat: rideData.pickup.lat,
        fromLng: rideData.pickup.lng,
        toLat: rideData.destination.lat,
        toLng: rideData.destination.lng,
        fromName: rideData.pickup.name,
        toName: rideData.destination.name,
        fare: rideData.fare || 150,
      }
      const res = await fetch('http://localhost:3000/api/ride/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) return null
      const data = await res.json()
      const newId = data?.rideId
      if (isMongoId(newId)) {
        setRideData(prev => ({ ...prev, id: newId }))
        setRideIdInUrl(newId)
        return newId
      }
      return null
  } catch (err) { console.warn('ensureRideExists failed', err); return null }
  }

  // Get ride data from URL params and sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const rideId = urlParams.get('rideId')
    
    if (rideId) {
      // Try to get ride data from sessionStorage first
      const storedRide = sessionStorage.getItem('currentRide')
      let rideData
      
      if (storedRide) {
        rideData = JSON.parse(storedRide)
        // Keep stored ride so refresh retains state
      } else {
        // Try restoring from localStorage (set on homepage)
        const storedPickup = localStorage.getItem('pickup')
        const storedDestination = localStorage.getItem('destination')
        if (storedPickup && storedDestination) {
          const pickup = JSON.parse(storedPickup)
          const destination = JSON.parse(storedDestination)
          rideData = {
            id: rideId,
            pickup,
            destination,
            fare: 150,
            status: 'planned'
          }
        } else {
          // Fallback to mock data if nothing stored
          rideData = {
            id: rideId,
            pickup: { lat: 28.6139, lng: 77.2090, name: 'Delhi Gate' },
            destination: { lat: 28.6304, lng: 77.2177, name: 'Connaught Place' },
            fare: 150,
            status: 'planned'
          }
        }
      }
      
      setRideData(rideData)
      // Persist for future reloads
      if (rideData?.pickup) localStorage.setItem('pickup', JSON.stringify(rideData.pickup))
      if (rideData?.destination) localStorage.setItem('destination', JSON.stringify(rideData.destination))
      setCaptainPosition([rideData.pickup.lat, rideData.pickup.lng])
      setMapFocus([rideData.pickup.lat, rideData.pickup.lng])
      setMapZoomLevel(13)
      if (rideData.pickup && rideData.destination) {
        calculateRoute(rideData.pickup, rideData.destination)
      }
      // Pull existing ride occupancy/size if available (only if valid ObjectId)
      ;(async () => {
        const rid = rideId
        if (!isMongoId(rid)) return
        try {
          const res = await fetch(`http://localhost:3000/api/ride/${rid}`)
          if (res.ok) {
            const data = await res.json()
            const r = data?.ride
            if (r) {
              if (typeof r.occupied === 'number') setOccupied(r.occupied)
              if (typeof r.size === 'number') setVehicleSize(r.size)
            }
          }
        } catch (_) {}
      })()
    }
  }, [])

  // Geocode helper using Nominatim
  const geocode = async (query) => {
    if (!query || query.trim().length < 3) return []
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      const data = await res.json()
      return (data || []).map(item => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }))
    } catch (e) {
      console.error('Geocode error', e)
      return []
    }
  }

  // Debounced search for pickup
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      const results = await geocode(pickupQuery)
      setPickupSuggestions(results)
    }, 350)
    return () => searchDebounceRef.current && clearTimeout(searchDebounceRef.current)
  }, [pickupQuery])

  // Debounced search for destination
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      const results = await geocode(destinationQuery)
      setDestinationSuggestions(results)
    }, 350)
    return () => searchDebounceRef.current && clearTimeout(searchDebounceRef.current)
  }, [destinationQuery])

  const applySelection = (type, place) => {
    if (!place) return
    setRideData(prev => {
      const updated = {
        ...(prev || {}),
        id: (prev && prev.id) || new URLSearchParams(window.location.search).get('rideId') || 'manual',
        pickup: type === 'pickup' ? { lat: place.lat, lng: place.lng, name: place.displayName } : (prev?.pickup || null),
        destination: type === 'destination' ? { lat: place.lat, lng: place.lng, name: place.displayName } : (prev?.destination || null),
        fare: prev?.fare || 150,
        status: prev?.status || 'planned'
      }
      // Persist
      if (updated.pickup) localStorage.setItem('pickup', JSON.stringify(updated.pickup))
      if (updated.destination) localStorage.setItem('destination', JSON.stringify(updated.destination))
      // Recalc route if both present
      if (updated.pickup && updated.destination) {
        calculateRoute(updated.pickup, updated.destination)
        setCaptainPosition([updated.pickup.lat, updated.pickup.lng])
      }
      return updated
    })
  }

  // Calculate route using OSRM API
  const calculateRoute = async (start, end) => {
    try {
      const startLat = Array.isArray(start) ? start[0] : start.lat
      const startLng = Array.isArray(start) ? start[1] : start.lng
      const endLat = Array.isArray(end) ? end[0] : end.lat
      const endLng = Array.isArray(end) ? end[1] : end.lng

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
      )
      const data = await response.json()
      
      if (data.routes && data.routes[0]) {
        const route = data.routes[0]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]])
        setRouteCoordinates(coordinates)
        if (typeof route.distance === 'number') {
          setRouteDistanceKm((route.distance / 1000).toFixed(2))
        }
        if (typeof route.duration === 'number') {
          const minutes = Math.max(1, Math.round(route.duration / 60))
          setRouteDurationMin(minutes)
        }
        const steps = (route.legs || []).flatMap(l => l.steps || [])
        const stepsWithFlags = steps.map(s => ({ ...s, _announced: false }))
        routeStepsRef.current = stepsWithFlags
      }
    } catch (error) {
      console.error('Error calculating route:', error)
    }
  }

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCurrentLocation([latitude, longitude])
          if (!captainPosition) {
            setCaptainPosition([latitude, longitude])
          }
        },
        (error) => console.error('Error getting location:', error),
        { enableHighAccuracy: true }
      )
    }
  }, [])

  // Start ride
  const startRide = () => {
    console.log('🚀 Starting ride, current status:', rideStatus)
    setRideStatus('started')
    setIsNavigating(true)
    
    // Reset seat count to 0 when starting a new ride
    setOccupied(0)
    localStorage.setItem('captain_occupied', '0')
    
    // Clear previous user pickup locations for fresh start
    setUserPickupLocations([])
    setAcceptedRides([])
    localStorage.removeItem('captain_acceptedRides')
    console.log('🧹 Cleared previous pickup locations and accepted rides')
    
    // Persist ride status to localStorage
    localStorage.setItem('captain_rideStatus', 'started')
    localStorage.setItem('captain_isNavigating', 'true')
    console.log('✅ Ride status set to started, seat count reset to 0, localStorage updated')
    startLocationTracking()
    // Zoom to starting point (pickup or current) like Google Maps
    const startPoint = captainPosition || (rideData?.pickup ? [rideData.pickup.lat, rideData.pickup.lng] : null)
    if (startPoint) {
      setMapFocus([...startPoint])
      setMapZoomLevel(25)
    }
    // Ensure a real ride exists in DB before broadcasting/patching
    ;(async () => {
      const realId = await ensureRideExists()
      const effectiveId = realId || rideData?.id
      // store canonical ride id (Mongo ObjectId) when available
      if (realId && isMongoId(realId)) {
        rideIdRef.current = realId
        setRideData(prev => ({ ...prev, id: realId }))
      } else if (isMongoId(effectiveId)) {
        rideIdRef.current = effectiveId
      }
      // Announce to server this ride is discoverable for users with complete route data
      if (socketRef.current && effectiveId && rideData?.pickup && rideData?.destination) {
        const routeData = {
          rideId: effectiveId,
          captainId: rideData.captainId || 'captain_' + Date.now(),
          captainName: 'Captain',
          pickup: rideData.pickup,
          destination: rideData.destination,
          route: routeCoordinates,
          distance: routeDistanceKm,
          duration: routeDurationMin,
          status: 'active',
          startTime: new Date().toISOString()
        }
        console.log('🚗 Captain starting ride with route data:', routeData)
  socketRef.current.emit('ride:start', routeData)
      }
      // Recalculate route from current/live position to destination at start
      if (captainPosition && rideData?.destination) {
        calculateRoute(captainPosition, rideData.destination)
      }
    })()
  }

  // Removed auto-simulation; movement depends on real GPS updates only

  // Start location tracking
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const newPosition = [latitude, longitude]
          setCaptainPosition(newPosition)
          setCurrentLocation(newPosition)
          if (isNavigating) {
            setMapFocus([...newPosition])
            setMapZoomLevel(25)
          }
          
          // Send location to backend via WebSocket (server expects 'location:update')
          if (socketRef.current) {
            // Prefer canonical Mongo id; avoid sending fake numeric ids (timestamps)
            const emitRideId = rideIdRef.current || (isMongoId(rideData?.id) ? rideData.id : null)
            if (!emitRideId) {
              console.warn('Skipping location emit: no valid rideId yet', rideData?.id)
            } else {
              socketRef.current.emit('location:update', {
                rideId: emitRideId,
                lat: latitude,
                lng: longitude
              })
            }
          }

          // Throttled ETA update (OSRM lightweight request without overview)
          const now = Date.now()
          if (rideData?.destination && now - lastEtaUpdateRef.current > 1200) {
            lastEtaUpdateRef.current = now
            const dest = rideData.destination
            const url = `https://router.project-osrm.org/route/v1/driving/${newPosition[1]},${newPosition[0]};${dest.lng},${dest.lat}?overview=false`
            fetch(url)
              .then(res => res.json())
              .then(data => {
                if (data && data.routes && data.routes[0]) {
                  const r = data.routes[0]
                  if (typeof r.distance === 'number') {
                    const km = (r.distance / 1000)
                    setRouteDistanceKm(km.toFixed(km >= 10 ? 0 : 1))
                  }
                  if (typeof r.duration === 'number') {
                    setRouteDurationMin(Math.max(1, Math.round(r.duration / 60)))
                  }
                }
              })
              .catch(() => {})
          }

          // Voice instruction proximity check (after updating position)
          try {
            const here = L.latLng(latitude, longitude)
            if (here) {
              // Check upcoming maneuvers if available
              if (routeStepsRef.current && routeStepsRef.current.length) {
                for (let i = 0; i < routeStepsRef.current.length; i++) {
                  const step = routeStepsRef.current[i]
                  if (step._announced) continue
                  const loc = L.latLng(step?.maneuver?.location?.[1], step?.maneuver?.location?.[0])
                  if (!loc) continue
                  const d = here.distanceTo(loc)
                  if (d < 60) {
                    const instruction = step?.maneuver?.instruction || 'Continue straight'
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      const en = new SpeechSynthesisUtterance(instruction)
                      en.lang = 'en-US'
                      const hi = new SpeechSynthesisUtterance(
                        instruction.includes('left') ? 'बाईं ओर मुड़ें' : instruction.includes('right') ? 'दाईं ओर मुड़ें' : 'सीधे चलते रहें'
                      )
                      hi.lang = 'hi-IN'
                      window.speechSynthesis.speak(en)
                      setTimeout(() => window.speechSynthesis.speak(hi), 1200)
                    }
                    step._announced = true
                    break
                  }
                }
              }
            }
          } catch (err) { console.warn('maneuver check failed', err) }
        },
        (error) => console.error('Error tracking location:', error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      )
    }
  }

  // End ride
  const endRide = () => {
    setRideStatus('completed')
    setIsNavigating(false)
    // Persist ride status to localStorage
    localStorage.setItem('captain_rideStatus', 'completed')
    localStorage.setItem('captain_isNavigating', 'false')
    
    // Clear active ride data so continue ride option disappears from homepage
    localStorage.removeItem('captain_activeRide')
    
    // Clear user pickup locations and accepted rides when ending ride
    setUserPickupLocations([])
    setAcceptedRides([])
    localStorage.removeItem('captain_acceptedRides')
    console.log('🧹 Cleared active ride data and pickup locations - fresh start for next ride')
    
    // Clear all intervals and watchers
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    
  const simId = simulationIntervalRef.current
  if (simId) { clearInterval(simId) }
    if (recalcTimerRef.current) {
      clearTimeout(recalcTimerRef.current)
    }
    
    // Navigate to home with full page refresh to clear all state
    setTimeout(() => {
      window.location.href = '/captain/home'
    }, 2000)
    // Inform server ride is ended
    if (socketRef.current && rideData?.id) {
  // End ride: prefer canonical Mongo id
  const endRideId = rideIdRef.current || (isMongoId(rideData?.id) ? rideData.id : null)
  if (!endRideId) console.warn('Skipping ride:end emit: no valid rideId', rideData?.id)
  else socketRef.current.emit('ride:end', { rideId: endRideId })
    }
  }

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    const socket = io('http://localhost:3000', { auth: { token } })
    socketRef.current = socket
    
    socket.on('connect', () => {
      console.log('✅ Captain socket connected, ID:', socket.id)
    })
    
    // Listen for ALL socket events for debugging
    socket.onAny((eventName, ...args) => {
      console.log('📡 Captain received event:', eventName, args)
    })
    
    // Listen for ride requests from users
    socket.on('ride:request', (payload) => {
      console.log('🔔 Captain received ride request:', payload)
      console.log('👥 Received passenger count:', payload.passengerCount)
      console.log('🔍 Full payload:', JSON.stringify(payload, null, 2))
      alert(`New ride request from user: ${payload.userId} for ${payload.passengerCount || 1} passenger${(payload.passengerCount || 1) > 1 ? 's' : ''}`)
      setIncomingRideRequest(payload)
      setShowAcceptRejectModal(true)
    })

    // Listen for ride acceptance events - Add pickup location to map
    socket.on('ride:accepted', (data) => {
      console.log('✅ Ride accepted:', data)
      console.log('🔍 Pickup data:', data.pickup)
      console.log('🔍 User data:', { userId: data.userId, userEmail: data.userEmail })
      
      // Add user pickup location to map when captain accepts
      if (data.pickup && data.pickup.lat && data.pickup.lng) {
        const userLocation = {
          id: `pickup-${data.userId}-${data.rideId}`,
          userId: data.userId,
          userEmail: data.userEmail || 'User',
          lat: data.pickup.lat,
          lng: data.pickup.lng,
          name: data.pickup.name || 'User Pickup Location',
          fare: data.fare || 50,
          timestamp: new Date(),
          rideId: data.rideId
        }
        
        setUserPickupLocations(prev => {
          // More strict duplicate checking - check by userId AND rideId
          const exists = prev.some(loc => 
            (loc.userId === userLocation.userId && loc.rideId === data.rideId) ||
            (Math.abs(loc.lat - userLocation.lat) < 0.0001 && Math.abs(loc.lng - userLocation.lng) < 0.0001)
          )
          
          if (!exists) {
            console.log('📍 Added user pickup location to captain map:', userLocation)
            return [...prev, userLocation]
          } else {
            console.log('📍 Pickup location already exists, skipping duplicate:', {
              userId: userLocation.userId,
              rideId: data.rideId,
              existingCount: prev.length
            })
            return prev
          }
        })
      } else {
        console.warn('❌ No pickup location data in ride:accepted event:', data)
      }
    })
    
    // Listen for booking notifications
    socket.on('ride:booking', (payload) => {
      console.log('New booking notification:', payload)
      const notification = {
        id: Date.now(),
        rideId: payload.rideId,
        occupied: payload.occupied,
        size: payload.size,
        timestamp: new Date().toISOString()
      }
      setBookingNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep last 5
      setShowBookingPanel(true)
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setBookingNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 10000)
    })
    
    // Listen for accepted rides list updates
    socket.on('ride:accepted-list', (rides) => {
      console.log('📋 Accepted rides list updated:', rides)
      setAcceptedRides(rides)
      // Persist to localStorage
      localStorage.setItem('captain_acceptedRides', JSON.stringify(rides))
    })
    
    // Sync occupancy via socket (ignore on captain view to avoid overriding local UI)
    socket.on('ride-status-updated', (payload) => {
      try {
        const rid = String(payload?.rideId || '')
        if (rideData?.id && String(rideData.id) === rid) {
          // Update occupancy from socket for real-time sync
          if (typeof payload.occupied === 'number') {
            setOccupied(payload.occupied)
            // Persist to localStorage
            localStorage.setItem('captain_occupied', payload.occupied.toString())
          }
          if (typeof payload.size === 'number') {
            setVehicleSize(payload.size)
            // Persist to localStorage
            localStorage.setItem('captain_vehicleSize', payload.size.toString())
          }
        }

    // Listen for ride cancellations
    socket.on('ride:cancelled', payload => {
      console.log('🚫 Captain received ride cancellation:', payload)
      if (payload?.rideId === rideId) {
        // Remove cancelled ride from accepted rides list
        setAcceptedRides(prev => {
          const updated = prev.filter(ride => ride.acceptanceId !== payload.acceptanceId)
          localStorage.setItem('captain_acceptedRides', JSON.stringify(updated))
          return updated
        })
        
        // Show notification
        setBookingNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'cancellation',
          message: `User cancelled their booking (${payload.passengerCount || 1} seat${payload.passengerCount > 1 ? 's' : ''} freed)`,
          timestamp: Date.now()
        }])
      }
    })
  } catch (err) { console.warn('restore ride data failed', err) }
    })
    
    return () => {
      socket.disconnect()
    }
  }, [])

  // Prefer captain profile seating capacity as vehicle size
  useEffect(() => {
    // Check if we're continuing a ride and restore all saved state
    const activeRide = localStorage.getItem('captain_activeRide')
    if (activeRide) {
      try {
        const parsed = JSON.parse(activeRide)
        console.log('🔄 Restoring complete ride state from homepage continue:', parsed)
        
        // Restore all saved state without overriding existing state
        if (parsed.rideData && !rideData) {
          setRideData(parsed.rideData)
        }
        if (parsed.rideStatus && rideStatus === 'planning') {
          setRideStatus(parsed.rideStatus)
          // Also update localStorage to maintain consistency
          localStorage.setItem('captain_rideStatus', parsed.rideStatus)
        }
        if (parsed.captainPosition) {
          setCaptainPosition(parsed.captainPosition)
        }
        if (parsed.routeCoordinates) {
          setRouteCoordinates(parsed.routeCoordinates)
        }
        if (parsed.routeDistanceKm) {
          setRouteDistanceKm(parsed.routeDistanceKm)
        }
        if (parsed.routeDurationMin) {
          setRouteDurationMin(parsed.routeDurationMin)
        }
        
        // Restore seat count and vehicle size from saved state
        // Only restore occupied seats if ride status is 'started' (continuing active ride)
        // For 'planning' status, keep seats at 0 for fresh start
        if (typeof parsed.occupied === 'number' && parsed.rideStatus === 'started') {
          setOccupied(parsed.occupied)
          localStorage.setItem('captain_occupied', parsed.occupied.toString())
          console.log('🪑 Restored occupied seats for active ride:', parsed.occupied)
        } else if (parsed.rideStatus === 'planning') {
          // Reset to 0 for planning status (fresh ride)
          setOccupied(0)
          localStorage.setItem('captain_occupied', '0')
          console.log('🪑 Reset occupied seats to 0 for fresh ride')
        }
        if (typeof parsed.vehicleSize === 'number') {
          setVehicleSize(parsed.vehicleSize)
          localStorage.setItem('captain_vehicleSize', parsed.vehicleSize.toString())
          console.log('🚗 Restored vehicle size:', parsed.vehicleSize)
        }
        
        // Set the rideId in URL to maintain consistency
        if (parsed.rideId) {
          setRideIdInUrl(parsed.rideId)
          rideIdRef.current = parsed.rideId
        }
        
        // Clear the active ride data after restoring to prevent re-restoration
        localStorage.removeItem('captain_activeRide')
        console.log('✅ Successfully restored ride state from continue and cleared active ride data')
      } catch (error) {
        console.error('❌ Failed to restore active ride state:', error)
      }
    }

    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/auth/captain/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const sc = data?.profile?.seatingCapacity
          // Only set vehicle size from profile if not already restored from active ride
          if (typeof sc === 'number' && sc > 0 && !activeRide) {
            setVehicleSize(sc)
          }
        }
  } catch (err) { console.warn('map pan tooltip failed', err) }
    })()

    // Load accepted rides from localStorage and server
    const loadAcceptedRides = async () => {
      try {
        // First load from localStorage for immediate display
        const saved = localStorage.getItem('captain_acceptedRides')
        if (saved) {
          const parsed = JSON.parse(saved)
          setAcceptedRides(parsed)
        }

        // Then fetch fresh data from server with captain-specific filtering
        const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
        const captainId = localStorage.getItem('captainId') || localStorage.getItem('captain_id') || 'unknown'
        
        const response = await fetch(`http://localhost:3000/api/accepted-rides?captainId=${captainId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          setAcceptedRides(data.rides || [])
          localStorage.setItem('captain_acceptedRides', JSON.stringify(data.rides || []))
        }
      } catch (error) {
        console.error('Failed to load accepted rides:', error)
      }
    }
  }, [])

  // While ride is started, keep the route highlighted from current position to destination (debounced)
  useEffect(() => {
    if (rideStatus !== 'started') return
    if (!captainPosition || !rideData?.destination) return
    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)

    // Only recalc if moved a meaningful distance (~30m)
    const movedEnough = (() => {
      const last = lastRecalcFromRef.current
      if (!last) return true
      const toRad = (d) => (d * Math.PI) / 180
      const R = 6371000
      const dLat = toRad(captainPosition[0] - last[0])
      const dLon = toRad(captainPosition[1] - last[1])
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(last[0])) * Math.cos(toRad(captainPosition[0])) * Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const dist = R * c
      return dist > 30
    })()

    recalcTimerRef.current = setTimeout(() => {
      if (movedEnough) {
        lastRecalcFromRef.current = captainPosition
        calculateRoute(captainPosition, rideData.destination)
        // keep map focused on the captain while started
        setMapFocus([...captainPosition])
        setMapZoomLevel(18)
      }
    }, 3000)
    return () => {
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current)
    }
  }, [rideStatus, captainPosition, rideData?.destination])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
  const sid = simulationIntervalRef.current
  if (sid) clearInterval(sid)
    }
  }, [])

  if (!rideData) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666',
        gap: '20px'
      }}>
        <div>Loading ride data...</div>
        
        {/* Always show Start/End buttons */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          minWidth: '300px'
        }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', padding: '4px 8px', background: '#f5f5f5', borderRadius: '4px' }}>
            Status: {rideStatus} | localStorage: {localStorage.getItem('captain_rideStatus')}
          </div>
          
          <button
            onClick={() => {
              console.log('🚀 Force Start clicked, current status:', rideStatus)
              setRideStatus('planning')
              localStorage.setItem('captain_rideStatus', 'planning')
            }}
            style={{
              width: '100%',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            🔄 Reset to Planning
          </button>
          
          {rideStatus === 'planning' && (
            <button
              onClick={startRide}
              style={{
                width: '100%',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Start Ride
            </button>
          )}
          
          {rideStatus === 'started' && (
            <button
              onClick={endRide}
              style={{
                width: '100%',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              End Ride
            </button>
          )}
          
        </div>
      </div>
    )
  }

  // Occupancy handlers
  const updateOccupied = async (next) => {
    const size = vehicleSize || 0
    const bounded = Math.max(0, Math.min(size, next))
    // Use rideIdRef.current first (canonical Mongo ID), then fallback to other sources
    let rideIdForPatch = rideIdRef.current || rideData?.id || rideData?._id || getRideIdFromUrl()
    if (!isMongoId(rideIdForPatch)) {
      const ensured = await ensureRideExists()
      if (ensured) {
        rideIdForPatch = ensured
        rideIdRef.current = ensured // Update ref with canonical ID
      }
    }
    if (!rideIdForPatch) {
      setOccupied(bounded)
      return
    }
    try {
      const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
      console.debug('updateOccupied: sending PATCH', { rideIdForPatch, vehicleSize, occupied, next, bounded })
      const res = await fetch(`http://localhost:3000/api/ride/${rideIdForPatch}/occupancy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ occupied: bounded })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 404) console.warn('PATCH /occupancy 404 - route not found or ride missing', { rideIdForPatch, status: res.status, body: data })
        console.debug('updateOccupied: non-ok response', { rideIdForPatch, status: res.status, body: data })
      } else {
        console.log('✅ Seat update successful:', { rideId: rideIdForPatch, occupied: bounded })
        
        // Emit socket event for real-time updates to users
        if (socketRef.current) {
          socketRef.current.emit('ride:seat-update', {
            rideId: rideIdForPatch,
            occupied: bounded,
            size: vehicleSize,
            captainId: rideData?.captainId || localStorage.getItem('captainId')
          })
          console.log('📡 Emitted seat update to users:', { rideId: rideIdForPatch, occupied: bounded, size: vehicleSize })
        }
      }
      // Always reflect bounded value locally to match UI intent
      setOccupied(bounded)
      // Update localStorage to persist the change
      localStorage.setItem('captain_occupied', bounded.toString())
    } catch (e) {
      console.warn('updateOccupied failed', e)
      setOccupied(bounded)
      localStorage.setItem('captain_occupied', bounded.toString())
    }
  }
  const onAddPassenger = () => {
    console.log('onAddPassenger: current occupied =', occupied, 'vehicleSize =', vehicleSize, 'next =', occupied + 1)
    updateOccupied(occupied + 1)
  }
  const onRemovePassenger = () => {
    console.log('onRemovePassenger: current occupied =', occupied, 'vehicleSize =', vehicleSize, 'next =', occupied - 1)
    updateOccupied(occupied - 1)
  }

  // Handle ride request accept/reject
  const handleRideRequestResponse = (action) => {
    if (socketRef.current && incomingRideRequest) {
      if (action === 'accept') {
        const requestedSeats = incomingRideRequest.passengerCount || 1
        const availableSeats = vehicleSize - occupied
        
        // Check if enough seats available
        if (requestedSeats > availableSeats) {
          alert(`❌ Only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available, but ${requestedSeats} requested. Cannot accept this booking.`)
          setShowAcceptRejectModal(false)
          return
        }
        
        // Accept the ride
        socketRef.current.emit('ride:accept', {
          rideId: incomingRideRequest.rideId,
          userId: incomingRideRequest.userId,
          userEmail: incomingRideRequest.userEmail,
          captainId: rideData?.captainId || 'captain_' + Date.now(),
          passengerCount: requestedSeats,
          pickup: incomingRideRequest.pickup,
          destination: incomingRideRequest.destination,
          fare: incomingRideRequest.fare,
          distance: incomingRideRequest.distance,
          duration: incomingRideRequest.duration
        })
      } else {
        // Reject the ride
        socketRef.current.emit('ride:reject', {
          rideId: incomingRideRequest.rideId,
          userId: incomingRideRequest.userId,
          captainId: rideData?.captainId || 'captain_' + Date.now()
        })
      }
      
      setShowAcceptRejectModal(false)
      setIncomingRideRequest(null)
    }
  }

  // Handle booking accept/reject (legacy)
  const handleBookingResponse = (rideId, action) => {
    if (socketRef.current) {
      socketRef.current.emit(`booking:${action}`, {
        rideId,
        captainId: rideData?.captainId || 'captain_' + Date.now()
      })
      
      // Remove the notification after responding
      setBookingNotifications(prev => prev.filter(n => n.rideId !== rideId))
      
      console.log(`${action === 'accept' ? 'Accepted' : 'Rejected'} booking for ride ${rideId}`)
    }
  }

  const mapCenter = captainPosition || rideData.pickup
  const mapZoom = mapZoomLevel

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Ride in Progress</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            {rideData.pickup.name} → {rideData.destination.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Pickup Locations Info */}
          {userPickupLocations.length > 0 && (
            <button
              onClick={() => {
                setUserPickupLocations([])
                console.log('🧹 Manually cleared pickup locations')
              }}
              style={{
                background: '#10b981',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
              title="Click to clear pickup locations"
            >
              📍 {userPickupLocations.length} Pickup{userPickupLocations.length > 1 ? 's' : ''} ✕
            </button>
          )}
          
          {/* Booking Notifications Button */}
          {bookingNotifications.length > 0 && (
            <button
              onClick={() => setShowBookingPanel(!showBookingPanel)}
              style={{
                position: 'relative',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔔 {bookingNotifications.length} New Booking{bookingNotifications.length > 1 ? 's' : ''}
              {bookingNotifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {bookingNotifications.length}
                </span>
              )}
            </button>
          )}
          
          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {/* Home Button */}
            <button
              onClick={() => {
                // Save complete active ride state for homepage continue functionality
                const activeRideState = {
                  rideId: rideIdRef.current,
                  rideData: rideData,
                  rideStatus: rideStatus,
                  captainPosition: captainPosition,
                  routeCoordinates: routeCoordinates,
                  routeDistanceKm: routeDistanceKm,
                  routeDurationMin: routeDurationMin,
                  occupied: occupied,
                  vehicleSize: vehicleSize,
                  timestamp: new Date().toISOString()
                }
                localStorage.setItem('captain_activeRide', JSON.stringify(activeRideState))
                console.log('💾 Saved complete active ride state for homepage continue:', activeRideState)
                window.history.pushState({}, '', '/captain/home')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              🏠 Home
            </button>

            {/* View Accepted Rides Button */}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/accepted-rides')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              📋 Rides ({acceptedRides.length})
            </button>
          </div>

          {/* Auto Status Update: Occupancy controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e5e7eb', padding: '8px 10px', borderRadius: '10px' }}>
            <button onClick={onRemovePassenger} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>−1</button>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Occupied: {occupied} / Size: {vehicleSize}</div>
            <button onClick={onAddPassenger} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>+1</button>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{rideData.fare}</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Estimated Fare</div>
          </div>
          
          {/* Debug: Show current rideStatus */}
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', padding: '4px 8px', background: '#f5f5f5', borderRadius: '4px' }}>
            Status: {rideStatus} | localStorage: {localStorage.getItem('captain_rideStatus')}
          </div>
          
          {rideStatus === 'planning' && (
            <button
              onClick={startRide}
              style={{
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Start
            </button>
          )}
          {rideStatus === 'started' && (
            <button
              onClick={endRide}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              End Ride
            </button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Search like Google Maps - only in planning state */}
        {rideStatus === 'planning' && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 1000, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, maxWidth: '420px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', padding: '8px 12px' }}>
                <input
                  value={pickupQuery}
                  onChange={(e) => setPickupQuery(e.target.value)}
                  placeholder={rideData?.pickup?.name || 'Search pickup'}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                />
              </div>
              {pickupSuggestions && pickupSuggestions.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '8px', marginTop: '6px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto' }}>
                  {pickupSuggestions.map((s, idx) => (
                    <div key={`p-${idx}`} onClick={() => { applySelection('pickup', s); setPickupQuery(s.displayName); setPickupSuggestions([]) }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', color: '#111' }}>{s.displayName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Lat {s.lat.toFixed(5)}, Lng {s.lng.toFixed(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, maxWidth: '420px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', padding: '8px 12px' }}>
                <input
                  value={destinationQuery}
                  onChange={(e) => setDestinationQuery(e.target.value)}
                  placeholder={rideData?.destination?.name || 'Search destination'}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                />
              </div>
              {destinationSuggestions && destinationSuggestions.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '8px', marginTop: '6px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto' }}>
                  {destinationSuggestions.map((s, idx) => (
                    <div key={`d-${idx}`} onClick={() => { applySelection('destination', s); setDestinationQuery(s.displayName); setDestinationSuggestions([]) }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '13px', color: '#111' }}>{s.displayName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Lat {s.lat.toFixed(5)}, Lng {s.lng.toFixed(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapUpdater 
            center={mapFocus || mapCenter} 
            zoom={mapZoom} 
            fitBounds={rideStatus === 'planning' ? routeCoordinates : null} 
            preserve={rideStatus === 'started'}
          />
          
          {/* Pickup Marker */}
          <Marker
            position={[rideData.pickup.lat, rideData.pickup.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <div>
                <strong>Pickup Location</strong><br />
                {rideData.pickup.name}
              </div>
            </Popup>
          </Marker>
          
          {/* Destination Marker */}
          <Marker
            position={[rideData.destination.lat, rideData.destination.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <div>
                <strong>Destination</strong><br />
                {rideData.destination.name}
              </div>
            </Popup>
          </Marker>
          
          {/* User Pickup Locations - Show when captain accepts ride */}
          {userPickupLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={pickupIcon}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <strong style={{ color: '#10b981', fontSize: '16px' }}>📍 USER PICKUP</strong><br />
                  <strong>User:</strong> {location.userEmail}<br />
                  <strong>Location:</strong> {location.name}<br />
                  <strong>Fare:</strong> ₹{location.fare}<br />
                  <strong>Time:</strong> {location.timestamp.toLocaleTimeString()}<br />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    📍 Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                  </div>
                  <button
                    onClick={() => {
                      // Remove pickup location when picked up
                      setUserPickupLocations(prev => prev.filter(loc => loc.id !== location.id))
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✅ Picked Up
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Captain Text Marker */}
          {captainPosition && (
            <Marker
              position={captainPosition}
              icon={captainTextIcon}
            />
          )}

          {/* Captain Marker + Blue accuracy circle */}
          {captainPosition && (
            <>
              <MovingCaptainMarker 
                position={captainPosition} 
                isMoving={isNavigating}
              />
              <Circle
                center={captainPosition}
                radius={30}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
              />
            </>
          )}
          
          {/* Route Polyline (with animated dash class) */}
          <Pane name="route-pane" style={{ zIndex: 650 }}>
            {routeCoordinates.length > 0 && (
              <Polyline
                pane="route-pane"
                positions={routeCoordinates}
                color="#2563eb"
                weight={6}
                opacity={0.95}
                lineCap="round"
                lineJoin="round"
                className="leaflet-routing-line"
              />
            )}
          </Pane>
        </MapContainer>
        
        {/* Booking Notifications Panel */}
        {showBookingPanel && bookingNotifications.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1001,
            maxWidth: '350px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#111' }}>🔔 Booking Notifications</h3>
              <button
                onClick={() => setShowBookingPanel(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            {bookingNotifications.map((notification) => (
              <div key={notification.id} style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '4px' }}>
                  {notification.message}
                </div>
                <div style={{ fontSize: '12px', color: '#16a34a', marginBottom: '6px' }}>
                  Seats: {notification.occupied}/{notification.size} • {notification.timestamp}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                  Ride ID: {notification.rideId}
                </div>
                
                {/* Accept/Reject Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleBookingResponse(notification.rideId, 'accept')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={() => handleBookingResponse(notification.rideId, 'reject')}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setBookingNotifications([])}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#374151',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Clear All Notifications
            </button>
          </div>
        )}
        
        {/* Accept/Reject Modal */}
        {showAcceptRejectModal && incomingRideRequest && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}>
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
                🚖 New Ride Request
              </h3>
              <div style={{ marginBottom: '20px', color: '#374151' }}>
                <p style={{ margin: '8px 0' }}>
                  <strong>User ID:</strong> {incomingRideRequest.userId}
                </p>
                <p style={{ margin: '8px 0' }}>
                  <strong>Passengers:</strong> {incomingRideRequest.passengerCount || 1} passenger{(incomingRideRequest.passengerCount || 1) > 1 ? 's' : ''}
                </p>
                <p style={{ margin: '8px 0' }}>
                  <strong>Pickup:</strong> {incomingRideRequest.pickup?.lat?.toFixed(4)}, {incomingRideRequest.pickup?.lng?.toFixed(4)}
                </p>
                <p style={{ margin: '8px 0' }}>
                  <strong>Destination:</strong> {incomingRideRequest.destination?.lat?.toFixed(4)}, {incomingRideRequest.destination?.lng?.toFixed(4)}
                </p>
                {/* Occupancy Controls */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      👥 Passengers: {occupied}/{vehicleSize}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={onRemovePassenger}
                        disabled={occupied <= 0}
                        style={{
                          padding: '6px 12px',
                          background: occupied <= 0 ? '#e5e7eb' : '#ef4444',
                          color: occupied <= 0 ? '#9ca3af' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: occupied <= 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ➖
                      </button>
                      <button
                        onClick={onAddPassenger}
                        disabled={occupied >= vehicleSize}
                        style={{
                          padding: '6px 12px',
                          background: occupied >= vehicleSize ? '#e5e7eb' : '#22c55e',
                          color: occupied >= vehicleSize ? '#9ca3af' : 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: occupied >= vehicleSize ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ➕
                      </button>
                    </div>
                  </div>
                </div>


              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleRideRequestResponse('accept')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✅ Accept
                </button>
                <button
                  onClick={() => handleRideRequestResponse('reject')}
                  style={{
                    flex: 1,
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
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '220px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {rideStatus === 'planning' && '🟡 Ready to Start'}
            {rideStatus === 'started' && '🟢 Ride in Progress'}
            {rideStatus === 'completed' && '✅ Ride Completed'}
          </div>
          {(routeDistanceKm || routeDurationMin) && (
            <div style={{ fontSize: '15px', color: '#111', marginBottom: '8px', fontWeight: 600 }}>
              {routeDistanceKm ? `${routeDistanceKm} km` : '--'} • {routeDurationMin ? `${routeDurationMin} min` : '--'}
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
            {isNavigating ? '📍 Tracking location...' : '⏸️ Location tracking stopped'}
          </div>
          {captainPosition && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              Lat: {captainPosition[0]?.toFixed(6)}, Lng: {captainPosition[1]?.toFixed(6)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
  