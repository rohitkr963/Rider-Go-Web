import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

export default function UserRideList() {
  const [loading, setLoading] = React.useState(false)
  const [rides, setRides] = React.useState([])
  const [emptyMsg, setEmptyMsg] = React.useState('')
  const [mapCenter, setMapCenter] = React.useState(null)
  const [currentTime, setCurrentTime] = React.useState(Date.now())
  const socketRef = React.useRef(null)
  const mapRef = React.useRef(null)
  const markersRef = React.useRef([])
  const trackingLinesRef = React.useRef([])
  const captainTrailsRef = React.useRef(new Map()) // Store captain movement trails
  const loc = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(loc.search)
  const fromLat = params.get('fromLat')
  const fromLng = params.get('fromLng')
  const toLat = params.get('toLat')
  const toLng = params.get('toLng')
  const fromName = params.get('fromName') || 'Pickup'
  const toName = params.get('toName') || 'Destination'

  // Initialize map center based on pickup location
  React.useEffect(() => {
    if (fromLat && fromLng && !mapCenter) {
      setMapCenter([Number(fromLat), Number(fromLng)])
    }
  }, [fromLat, fromLng, mapCenter])

  // Update timestamps every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Initialize Leaflet map
  React.useEffect(() => {
    if (!mapCenter) return

    // Load Leaflet CSS and JS dynamically
    const loadLeaflet = async () => {
      if (window.L) return // Already loaded

      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      // Load JS
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        initializeMap()
      }
      document.head.appendChild(script)
    }

    const initializeMap = () => {
      if (mapRef.current && window.L) {
        const map = window.L.map(mapRef.current, {
          center: mapCenter,
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          touchZoom: true,
          dragging: true,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
          maxBounds: null, // No bounds restriction
          maxBoundsViscosity: 0.0 // Allow free movement
        })
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map)

        // Add pickup and destination markers for route reference
        if (fromLat && fromLng) {
          const pickupIcon = window.L.divIcon({
            html: '📍',
            iconSize: [25, 25],
            className: 'pickup-marker'
          })
          window.L.marker([Number(fromLat), Number(fromLng)], { icon: pickupIcon })
            .addTo(map)
            .bindPopup(`📍 Pickup: ${fromName}`)
        }
        
        if (toLat && toLng) {
          const destinationIcon = window.L.divIcon({
            html: '🎯',
            iconSize: [25, 25],
            className: 'destination-marker'
          })
          window.L.marker([Number(toLat), Number(toLng)], { icon: destinationIcon })
            .addTo(map)
            .bindPopup(`🎯 Destination: ${toName}`)
        }

        // Add zoom event listener for debugging
        map.on('zoomstart', function(e) {
          console.log('🔍 Zoom started - current level:', map.getZoom())
        })
        
        map.on('zoomend', function(e) {
          console.log('🔍 Zoom ended - new level:', map.getZoom())
        })
        
        map.on('movestart', function(e) {
          console.log('🗺️ Map move started')
        })
        
        map.on('moveend', function(e) {
          console.log('🗺️ Map move ended - center:', map.getCenter())
        })
        
        // Store map reference for captain markers
        mapRef.current.leafletMap = map
        console.log('🗺️ Map initialized with zoom/move debugging enabled')
      }
    }

    if (window.L) {
      initializeMap()
    } else {
      loadLeaflet()
    }
  }, [mapCenter, fromLat, fromLng, toLat, toLng, fromName, toName])

  // Update captain markers on map
  React.useEffect(() => {
    console.log('🗺️ Map effect triggered with rides:', rides.length, 'rides')
    console.log('🗺️ Rides data:', rides)
    console.log('🗺️ Map ref:', mapRef.current)
    console.log('🗺️ Leaflet map:', mapRef.current?.leafletMap)
    console.log('🗺️ Window.L:', window.L)
    
    if (!mapRef.current?.leafletMap || !window.L) {
      console.log('🗺️ ❌ Map or Leaflet not ready - cannot add markers')
      console.log('🗺️ Map ready:', !!mapRef.current?.leafletMap)
      console.log('🗺️ Leaflet ready:', !!window.L)
      return
    }

    const map = mapRef.current.leafletMap

    // Clear existing captain markers and tracking lines
    console.log('🗺️ Clearing existing captain markers:', markersRef.current.length)
    markersRef.current.forEach(marker => {
      try {
        map.removeLayer(marker)
      } catch (e) {
        console.warn('Failed to remove marker:', e)
      }
    })
    markersRef.current = []
    
    // Clear existing tracking lines
    console.log('🗺️ Clearing existing tracking lines:', trackingLinesRef.current.length)
    trackingLinesRef.current.forEach(line => {
      try {
        map.removeLayer(line)
      } catch (e) {
        console.warn('Failed to remove tracking line:', e)
      }
    })
    trackingLinesRef.current = []

    // Add captain markers ONLY (no pickup/destination)
    let addedMarkers = 0
    console.log('🗺️ Total rides to process:', rides.length)
    console.log('🗺️ All rides data:', rides)
    
    rides.forEach((ride, index) => {
      console.log(`🗺️ Processing ride ${index}:`, {
        id: ride.id,
        name: ride.captainName || ride.captainEmail,
        lat: ride.lat,
        lng: ride.lng,
        hasLocation: !!(ride.lat && ride.lng),
        isActive: ride.isActive,
        isNearby: ride.isNearby,
        isDebug: ride.isDebug,
        isExpanded: ride.isExpanded
      })
      
      if (ride.lat != null && ride.lng != null) {
        console.log(`🗺️ ✅ Adding captain marker: ${ride.captainName || ride.captainEmail} at [${ride.lat}, ${ride.lng}]`)
        
        // Different colors and status based on captain type
        let bgColor = '#10B981' // Green for live
        let borderColor = '#059669'
        let statusText = 'Live Captain'
        
        if (ride.isStarting) {
          bgColor = '#EF4444' // Red for just started
          borderColor = '#DC2626'
          statusText = 'Just Started'
        } else if (ride.isNearby) {
          bgColor = '#3B82F6' // Blue for nearby
          borderColor = '#2563EB'
          statusText = 'Nearby Captain'
        } else if (ride.isExpanded) {
          bgColor = '#8B5CF6' // Purple for expanded search
          borderColor = '#7C3AED'
          statusText = 'Extended Search'
        } else if (ride.isDebug) {
          bgColor = '#F59E0B' // Orange for debug
          borderColor = '#D97706'
          statusText = 'Debug Captain'
        } else if (ride.isActive) {
          bgColor = '#10B981' // Green for active
          borderColor = '#059669'
          statusText = 'Active on Route'
        }
        
        try {
          // Create a proper auto rickshaw icon with dynamic colors
          const autoIconSvg = `
            <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15" cy="15" r="14" fill="${bgColor}" stroke="${borderColor}" stroke-width="2"/>
              <g transform="translate(7,9)">
                <!-- Auto body -->
                <rect x="1" y="4" width="12" height="6" rx="1" fill="#FFF" opacity="0.9"/>
                <!-- Wheels -->
                <circle cx="3" cy="12" r="1.5" fill="#333"/>
                <circle cx="11" cy="12" r="1.5" fill="#333"/>
                <!-- Roof -->
                <path d="M2 4 L4 1 L10 1 L12 4 Z" fill="#FFF" opacity="0.8"/>
                <!-- Window -->
                <rect x="4" y="5" width="4" height="2.5" fill="#87CEEB" opacity="0.6"/>
                <!-- Driver -->
                <circle cx="6" cy="6" r="0.8" fill="#FFB366"/>
              </g>
            </svg>
          `
          
          const captainIcon = window.L.divIcon({
            html: autoIconSvg,
            iconSize: [30, 30],
            className: 'auto-rickshaw-marker',
            iconAnchor: [15, 15]
          })

          const liveStatus = ride.lastUpdate ? 
            `<br/><small style="color: #10b981;">🟢 Live ${Math.round((currentTime - ride.lastUpdate) / 1000)}s ago</small>` : 
            ''
          
          const popupContent = `
            🛺 <strong>${ride.captainName || ride.captainEmail}</strong><br/>
            <small>${statusText}</small>${liveStatus}<br/>
            <button onclick="window.trackCaptain('${ride.id}')" style="margin-top: 4px; padding: 4px 8px; background: ${bgColor}; color: white; border: none; border-radius: 4px; cursor: pointer;">Track This Auto</button>
          `

          // Add captain current location marker
          const marker = window.L.marker([ride.lat, ride.lng], { icon: captainIcon })
            .addTo(map)
            .bindPopup(popupContent)
          
          markersRef.current.push(marker)
          addedMarkers++
          console.log(`🗺️ ✅ Successfully added marker ${addedMarkers} for ${ride.captainName}`)
          
          // Add captain starting point marker if available
          if (ride.startLat && ride.startLng) {
            console.log(`🏁 Adding starting point auto for ${ride.captainName} at [${ride.startLat}, ${ride.startLng}]`)
            
            // Create starting point auto rickshaw icon (same as current but different color)
            const startAutoIconSvg = `
              <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="14" fill="#FF6B6B" stroke="#E53E3E" stroke-width="2"/>
                <g transform="translate(7, 8)">
                  <rect x="2" y="6" width="12" height="8" rx="2" fill="white"/>
                  <rect x="0" y="8" width="16" height="4" rx="1" fill="white"/>
                  <circle cx="4" cy="13" r="2" fill="#E53E3E"/>
                  <circle cx="12" cy="13" r="2" fill="#E53E3E"/>
                  <rect x="6" y="2" width="4" height="6" rx="1" fill="white"/>
                  <rect x="7" y="0" width="2" height="4" fill="white"/>
                </g>
                <text x="15" y="25" text-anchor="middle" fill="white" font-size="8" font-weight="bold">START</text>
              </svg>
            `
            
            const startAutoIcon = window.L.divIcon({
              html: startAutoIconSvg,
              iconSize: [30, 30],
              className: 'captain-start-auto-marker',
              iconAnchor: [15, 15]
            })
            
            const startPopupContent = `
              🏁 <strong>Starting Point Auto</strong><br/>
              <small>Captain: ${ride.captainName || ride.captainEmail}</small><br/>
              <small style="color: #FF6B6B;">Auto started from here</small><br/>
              <button onclick="window.trackCaptain('${ride.id}')" style="margin-top: 4px; padding: 4px 8px; background: #FF6B6B; color: white; border: none; border-radius: 4px; cursor: pointer;">Track From Start</button>
            `
            
            const startAutoMarker = window.L.marker([ride.startLat, ride.startLng], { icon: startAutoIcon })
              .addTo(map)
              .bindPopup(startPopupContent)
            
            markersRef.current.push(startAutoMarker)
            console.log(`🏁 ✅ Starting point auto marker added for ${ride.captainName}`)
            
            // Add trail line from starting point to current location
            if (ride.lat && ride.lng) {
              const trailLine = window.L.polyline([
                [ride.startLat, ride.startLng], // Starting point
                [ride.lat, ride.lng] // Current location
              ], {
                color: '#FF6600', // Orange trail
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 10',
                className: 'captain-trail-line'
              }).addTo(map)
              
              trackingLinesRef.current.push(trailLine)
              console.log(`🛤️ ✅ Trail line added from start to current location for ${ride.captainName}`)
            }
          } else {
            console.log(`🏁 No starting point data for ${ride.captainName}, using current location as start`)
            
            // If no starting point, add a smaller auto marker at current location to indicate this captain is available
            const availableAutoIconSvg = `
              <svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="12" fill="#10B981" stroke="#059669" stroke-width="2"/>
                <g transform="translate(5, 6)">
                  <rect x="2" y="5" width="10" height="6" rx="1.5" fill="white"/>
                  <rect x="0" y="6.5" width="14" height="3" rx="1" fill="white"/>
                  <circle cx="3.5" cy="10.5" r="1.5" fill="#059669"/>
                  <circle cx="10.5" cy="10.5" r="1.5" fill="#059669"/>
                  <rect x="5" y="2" width="4" height="5" rx="1" fill="white"/>
                  <rect x="6" y="0.5" width="2" height="3" fill="white"/>
                </g>
                <text x="12.5" y="22" text-anchor="middle" fill="white" font-size="6" font-weight="bold">READY</text>
              </svg>
            `
            
            const availableAutoIcon = window.L.divIcon({
              html: availableAutoIconSvg,
              iconSize: [25, 25],
              className: 'captain-available-auto-marker',
              iconAnchor: [12.5, 12.5]
            })
            
            const availablePopupContent = `
              🚗 <strong>Available Auto</strong><br/>
              <small>Captain: ${ride.captainName || ride.captainEmail}</small><br/>
              <small style="color: #10B981;">Ready for ride</small><br/>
              <button onclick="window.trackCaptain('${ride.id}')" style="margin-top: 4px; padding: 4px 8px; background: #10B981; color: white; border: none; border-radius: 4px; cursor: pointer;">Track This Auto</button>
            `
            
            const availableAutoMarker = window.L.marker([ride.lat, ride.lng], { icon: availableAutoIcon })
              .addTo(map)
              .bindPopup(availablePopupContent)
            
            markersRef.current.push(availableAutoMarker)
            console.log(`🚗 ✅ Available auto marker added for ${ride.captainName}`)
          }
          
          // Add proper road route from captain to user's route
          if (fromLat && fromLng && toLat && toLng) {
            try {
              console.log(`🛣️ Fetching proper road route for ${ride.captainName}`)
              
              // Try OSRM first, fallback to curves if it fails
              console.log(`🛣️ Attempting OSRM route for ${ride.captainName}`)
              
              const startLat = ride.lat
              const startLng = ride.lng
              const endLat = Number(fromLat)
              const endLng = Number(fromLng)
              
              // OSRM API call for real road routing (direct call)
              const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
              console.log(`🛣️ OSRM URL:`, osrmUrl)
              
              // Add immediate curved fallback
              const createCurvedFallback = () => {
                const distance = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2))
                const numPoints = Math.max(8, Math.min(20, Math.floor(distance * 2000)))
                
                const curvePoints = []
                for (let i = 0; i <= numPoints; i++) {
                  const t = i / numPoints
                  const lat = startLat + (endLat - startLat) * t
                  const lng = startLng + (endLng - startLng) * t
                  
                  // More complex curve simulation
                  const mainCurve = Math.sin(t * Math.PI) * 0.003
                  const roadVariation = Math.sin(t * Math.PI * 3) * 0.001
                  const perpVariation = Math.cos(t * Math.PI * 4) * 0.0008
                  
                  curvePoints.push([
                    lat + mainCurve + roadVariation,
                    lng + mainCurve - perpVariation
                  ])
                }
                
                return window.L.polyline(curvePoints, {
                  color: '#FF0000',
                  weight: 4,
                  opacity: 0.9,
                  dashArray: '10, 5',
                  className: 'captain-route-connection'
                }).addTo(map)
              }
              
              // Create immediate fallback route first (so user always sees something)
              console.log(`🛣️ Creating immediate fallback route for ${ride.captainName}`)
              const distance = Math.sqrt(Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2))
              const numPoints = Math.max(10, Math.min(20, Math.floor(distance * 2500)))
              
              const immediateCurvePoints = []
              for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints
                const lat = startLat + (endLat - startLat) * t
                const lng = startLng + (endLng - startLng) * t
                
                // Realistic curve simulation
                const primaryCurve = Math.sin(t * Math.PI * 1.2) * 0.003
                const secondaryCurve = Math.sin(t * Math.PI * 2.8) * 0.0015
                const roadNoise = Math.sin(t * Math.PI * 6) * 0.0005
                
                immediateCurvePoints.push([
                  lat + primaryCurve + roadNoise,
                  lng + primaryCurve - secondaryCurve
                ])
              }
              
              // Add immediate route (will be replaced by OSRM if successful)
              const immediateRoute = window.L.polyline(immediateCurvePoints, {
                color: bgColor, // Match captain status color
                weight: 4,
                opacity: 0.7,
                dashArray: '8, 4',
                className: 'captain-route-connection'
              }).addTo(map)
              
              trackingLinesRef.current.push(immediateRoute)
              console.log(`🛣️ ✅ Immediate curved route added for ${ride.captainName}`)
              
              // Skip OSRM calls for now due to connection issues - use curved routes only
              console.log(`🛣️ Using curved route for ${ride.captainName} (OSRM disabled)`)
              // Immediate route is already added above, no need for OSRM enhancement
              
              // Create user route ONCE per captain (pickup to destination) - only for first captain to avoid duplicates
              if (index === 0) {
                console.log(`🛣️ Creating user route from pickup to destination (once)`)
                
                const userStartLat = Number(fromLat)
                const userStartLng = Number(fromLng)
                const userEndLat = Number(toLat)
                const userEndLng = Number(toLng)
                
                // Create immediate user route first
                const userDistance = Math.sqrt(Math.pow(userEndLat - userStartLat, 2) + Math.pow(userEndLng - userStartLng, 2))
                const userNumPoints = Math.max(12, Math.min(25, Math.floor(userDistance * 2500)))
                
                const immediateUserCurvePoints = []
                for (let i = 0; i <= userNumPoints; i++) {
                  const t = i / userNumPoints
                  const lat = userStartLat + (userEndLat - userStartLat) * t
                  const lng = userStartLng + (userEndLng - userStartLng) * t
                  
                  // User route curve pattern
                  const mainCurve = Math.sin(t * Math.PI * 1.3) * 0.004
                  const roadVariation = Math.sin(t * Math.PI * 2.5) * 0.002
                  const perpVariation = Math.cos(t * Math.PI * 3.5) * 0.001
                  
                  immediateUserCurvePoints.push([
                    lat + mainCurve - perpVariation,
                    lng - mainCurve + roadVariation
                  ])
                }
                
                // Add immediate user route
                const immediateUserRoute = window.L.polyline(immediateUserCurvePoints, {
                  color: '#0066FF', // Blue for user route
                  weight: 5,
                  opacity: 0.8,
                  dashArray: '15, 8',
                  className: 'user-route-line'
                }).addTo(map)
                
                trackingLinesRef.current.push(immediateUserRoute)
                console.log(`🛣️ ✅ User curved route added (OSRM disabled)`)
                
                // Skip user OSRM calls for now due to connection issues - use curved routes only
                // Immediate user route is already added above, no need for OSRM enhancement
              }
              
            } catch (error) {
              console.error('🛣️ ❌ Failed to create route connection:', error)
            }
          }
          
          // Add animated tracking line if captain has trail
          if (ride.trail && ride.trail.length > 1) {
            try {
              console.log(`🛤️ Adding tracking line for ${ride.captainName}, points:`, ride.trail.length)
              
              // Create animated polyline for captain trail
              const trackingLine = window.L.polyline(ride.trail, {
                color: bgColor,
                weight: 4,
                opacity: 0.8,
                smoothFactor: 1,
                dashArray: '10, 5',
                className: 'captain-tracking-line'
              }).addTo(map)
              
              // Add animated arrow markers along the path
              const arrowIcon = window.L.divIcon({
                html: `<div style="color: ${bgColor}; font-size: 12px; transform: rotate(45deg);">➤</div>`,
                iconSize: [12, 12],
                className: 'tracking-arrow'
              })
              
              // Add arrows at intervals along the trail
              if (ride.trail.length >= 3) {
                const arrowInterval = Math.max(1, Math.floor(ride.trail.length / 5))
                for (let i = arrowInterval; i < ride.trail.length - 1; i += arrowInterval) {
                  const arrowMarker = window.L.marker(ride.trail[i], { 
                    icon: arrowIcon,
                    interactive: false
                  }).addTo(map)
                  trackingLinesRef.current.push(arrowMarker)
                }
              }
              
              trackingLinesRef.current.push(trackingLine)
              console.log(`🛤️ ✅ Added tracking line for ${ride.captainName}`)
            } catch (error) {
              console.error('🛤️ ❌ Failed to create tracking line:', error)
            }
          }
          
        } catch (error) {
          console.error('🗺️ ❌ Failed to create marker:', error)
        }
      } else {
        // No current coordinates — still show starting point if available
        if (ride.startLat != null && ride.startLng != null) {
          try {
            console.log(`🏁 Adding starting point (no live loc) for ${ride.captainName} at [${ride.startLat}, ${ride.startLng}]`)
            const startIconSvg = `
              <svg width="25" height="25" viewBox="0 0 25 25" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="12" fill="#FF4444" stroke="#CC0000" stroke-width="2"/>
                <text x="12.5" y="17" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
              </svg>
            `
            const startIcon = window.L.divIcon({
              html: startIconSvg,
              iconSize: [25, 25],
              className: 'captain-start-marker',
              iconAnchor: [12.5, 12.5]
            })
            const startPopupContent = `
              🏁 <strong>Starting Point</strong><br/>
              <small>Captain: ${ride.captainName || ride.captainEmail}</small><br/>
              <small style="color: #FF4444;">Ride started from here</small>
            `
            const startMarker = window.L.marker([ride.startLat, ride.startLng], { icon: startIcon }).addTo(map).bindPopup(startPopupContent)
            try { startMarker.__rideId = ride.id } catch { /* ignore */ }
            markersRef.current.push(startMarker)
            console.log(`🏁 ✅ Starting point marker added for ${ride.captainName} (no current loc)`)
          } catch (err) {
            console.error('🏁 ❌ Failed to add starting point for ride without current location:', err)
          }
        } else {
          console.log(`🗺️ ❌ Skipping ride ${index} - no valid coordinates or starting point`)
        }
      }
    })
    
    console.log(`🗺️ Final result: ${addedMarkers} captain markers added to map`)
    console.log(`🗺️ Total markers in markersRef:`, markersRef.current.length)
    console.log(`🗺️ Map object:`, map)
    console.log(`🗺️ Map container:`, map._container)
    
    // Focus map on captains if any exist
    if (addedMarkers > 0 && markersRef.current.length > 0) {
      console.log(`🗺️ ${addedMarkers} captain markers added - keeping your zoom level`)
      console.log(`🗺️ ✅ Captain locations should be visible on map now!`)
    } else {
      console.log(`🗺️ ❌ No captain markers added - check captain data:`)
      console.log(`🗺️ Rides with coordinates:`, rides.filter(r => r.lat && r.lng))
      console.log(`🗺️ Rides without coordinates:`, rides.filter(r => !r.lat || !r.lng))
    }

    // Global function for tracking captain from map popup (builds same query as the UI 'Track Ride')
    window.trackCaptain = (rideId) => {
      const selected = rides.find(r => r.id === rideId)
      const extra = selected && selected.lat != null && selected.lng != null ? { capLat: String(selected.lat), capLng: String(selected.lng) } : {}
      const q = new URLSearchParams({ 
        rideId, 
        fromLat, 
        fromLng, 
        toLat, 
        toLng, 
        fromName, 
        toName, 
        ...extra 
      }).toString()
      navigate(`/user/ride-live?${q}`)
    }
  }, [rides, currentTime])

  React.useEffect(() => {
    let cancelled = false
    async function planAndListen() {
      if (!fromLat || !fromLng || !toLat || !toLng) return
      try {
        setLoading(true)
        const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
        const res = await fetch(`${BACKEND}/api/ride/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromLat: Number(fromLat), fromLng: Number(fromLng), toLat: Number(toLat), toLng: Number(toLng), fromName, toName })
        })
        await res.json()
        if (!cancelled && res.ok) {
          // Initial placeholder to show route context if needed
          setRides([])
          // Start real-time search for captains on this route
          const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
          const s = io(SOCKET_URL, { auth: { token } })
          socketRef.current = s
          console.log('🔍 Sending route search request:', { fromLat, fromLng, toLat, toLng })
          s.emit('user:route:search', { fromLat, fromLng, toLat, toLng })
          
          s.on('user:route:results', (payload) => {
            console.log('🔍 ✅ Received captain data from server:', payload)
            console.log('🔍 Number of captains:', payload?.items?.length)
            
            const items = (payload?.items || []).map((m, index) => {
              console.log(`🔍 Processing captain ${index}:`, m)
              return {
                id: String(m.rideId),
                captainEmail: m.captainEmail || 'Captain',
                captainName: m.captainName || '',
                lat: m.lat != null ? Number(m.lat) : undefined,
                lng: m.lng != null ? Number(m.lng) : undefined,
                isActive: m.isActive || false,
                isNearby: m.isNearby || false,
                isDebug: m.isDebug || false,
                isExpanded: m.isExpanded || false,
                isStarting: m.isStarting || false,
                startLat: m.startLat != null ? Number(m.startLat) : undefined,
                startLng: m.startLng != null ? Number(m.startLng) : undefined
              }
            })
            
            console.log('🔍 Final processed rides:', items)
            console.log('🔍 Rides with valid locations:', items.filter(r => r.lat && r.lng))
            
            // Join ride rooms for live location updates
            items.forEach(ride => {
              if (ride.id) {
                console.log('🔗 Joining ride room for live updates:', `ride:${ride.id}`)
                s.emit('join', `ride:${ride.id}`)
              }
            })
            
            setRides(items)
            setEmptyMsg('')
          })
          
          // Listen for live location updates from captains
          s.on('ride:location', (payload) => {
            console.log('📍 Live location update received:', payload)
            const { rideId, lat, lng } = payload || {}
            
            if (rideId && typeof lat === 'number' && typeof lng === 'number') {
              // Store captain trail for tracking line
              const currentTrail = captainTrailsRef.current.get(rideId) || []
              const newPoint = [lat, lng]
              
              // Add new point to trail (keep last 20 points for smooth animation)
              const updatedTrail = [...currentTrail, newPoint].slice(-20)
              captainTrailsRef.current.set(rideId, updatedTrail)
              
              console.log('🛤️ Updated captain trail:', rideId, 'points:', updatedTrail.length)
              console.log('🛤️ Trail data:', updatedTrail)
              
              // Update the specific captain's location in rides state
              setRides(prevRides => {
                return prevRides.map(ride => {
                  if (ride.id === rideId) {
                    console.log('📍 Updating captain location:', ride.captainName, lat, lng)
                    return {
                      ...ride,
                      lat: lat,
                      lng: lng,
                      lastUpdate: Date.now(),
                      trail: updatedTrail // Add trail to ride data
                    }
                  }
                  return ride
                })
              })
            }
          })
          
          // Listen for ride end events to immediately remove ended rides
          s.on('ride:ended', (payload) => {
            console.log('🏁 Ride ended event received:', payload)
            const { rideId } = payload || {}
            
            if (rideId) {
              // Clean up captain trail
              captainTrailsRef.current.delete(rideId)
              console.log('🛤️ Cleaned up trail for ended ride:', rideId)
              
              // Remove the ended ride from the list immediately
              setRides(prevRides => {
                const filteredRides = prevRides.filter(ride => ride.id !== rideId)
                console.log('🏁 Removed ended ride from list:', rideId)
                console.log('🏁 Remaining rides:', filteredRides.length)
                return filteredRides
              })
            }
          })
          s.on('user:route:empty', (payload) => {
            setRides([])
            setEmptyMsg(payload?.message || 'Wait some time, autos are coming soon...')
          })
        }
      } catch {
        if (!cancelled) setEmptyMsg('Unable to load rides right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    planAndListen()
    return () => {
      cancelled = true
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [fromLat, fromLng, toLat, toLng, fromName, toName, navigate])

  const onTrack = (rideId) => {
    const selected = rides.find(r => r.id === rideId)
    const extra = selected && selected.lat != null && selected.lng != null ? { capLat: String(selected.lat), capLng: String(selected.lng) } : {}
    const q = new URLSearchParams({ 
      rideId, 
      fromLat, 
      fromLng, 
      toLat, 
      toLng, 
      fromName, 
      toName, 
      ...extra 
    }).toString()
    navigate(`/user/ride-live?${q}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      
      <div className="container" style={{ paddingTop: 'clamp(16px, 4vw, 24px)', paddingBottom: 'clamp(16px, 4vw, 24px)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 'clamp(16px, 4vw, 20px)',
          flexWrap: 'wrap',
          gap: 'clamp(8px, 2vw, 12px)'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#1f2937',
            fontSize: 'clamp(20px, 5vw, 24px)',
            fontWeight: 700
          }}>Available Rides on Your Route</h2>
          <Link 
            to="/user/home" 
            style={{ 
              textDecoration: 'none', 
              color: '#3b82f6', 
              fontWeight: 500,
              fontSize: 'clamp(14px, 3vw, 16px)',
              padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.2)'
              e.target.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(59, 130, 246, 0.1)'
              e.target.style.transform = 'translateY(0)'
            }}
          >← Change Route</Link>
        </div>
        
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(16px, 4vw, 24px)',
          alignItems: 'flex-start'
        }}>
          {/* Rides List */}
          <div className="col" style={{ minWidth: '280px' }}>
            <h3 style={{ 
              margin: '0 0 clamp(12px, 3vw, 16px) 0', 
              color: '#374151',
              fontSize: 'clamp(18px, 4vw, 20px)',
              fontWeight: 600
            }}>Captain List ({rides.length})</h3>
            {loading && (
              <div style={{ 
                padding: 'clamp(16px, 4vw, 20px)', 
                textAlign: 'center', 
                color: '#6b7280',
                background: '#fff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ 
                  fontSize: 'clamp(16px, 4vw, 18px)',
                  fontWeight: 500
                }}>🔍 Searching for captains...</div>
              </div>
            )}
            {!loading && rides.length === 0 && (
              <div style={{ 
                padding: 'clamp(20px, 5vw, 24px)', 
                border: '2px dashed #d1d5db', 
                borderRadius: 'clamp(8px, 2vw, 12px)', 
                background: '#f9fafb', 
                textAlign: 'center' 
              }}>
                <div style={{ 
                  fontSize: 'clamp(24px, 6vw, 32px)', 
                  marginBottom: 'clamp(8px, 2vw, 12px)' 
                }}>🚗</div>
                <div style={{ 
                  color: '#6b7280',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  lineHeight: 1.5
                }}>{emptyMsg || 'No rides found yet.'}</div>
              </div>
            )}
            {!loading && rides.length > 0 && (
              <div style={{ display: 'grid', gap: 'clamp(8px, 2vw, 12px)' }}>
                {rides.map((r) => (
                  <div key={r.id} className="ride-card card-anim" style={{ 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    padding: 'clamp(12px, 3vw, 16px)',
                    background: '#fff',
                    borderRadius: 'clamp(8px, 2vw, 12px)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      gap: 'clamp(8px, 2vw, 12px)',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ 
                          fontWeight: 600, 
                          color: '#1f2937', 
                          marginBottom: 'clamp(4px, 1vw, 6px)',
                          fontSize: 'clamp(14px, 3vw, 16px)',
                          lineHeight: 1.4
                        }}>
                          🛺 {r.captainName || r.captainEmail}
                          <div style={{ 
                            display: 'flex', 
                            gap: 'clamp(4px, 1vw, 6px)', 
                            marginTop: 'clamp(2px, 0.5vw, 4px)',
                            flexWrap: 'wrap'
                          }}>
                            {r.isDebug && <span style={{ 
                              color: '#F59E0B', 
                              fontSize: 'clamp(10px, 2.5vw, 12px)',
                              background: 'rgba(245, 158, 11, 0.1)',
                              padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>🔧 DEBUG</span>}
                            {r.isExpanded && <span style={{ 
                              color: '#8B5CF6', 
                              fontSize: 'clamp(10px, 2.5vw, 12px)',
                              background: 'rgba(139, 92, 246, 0.1)',
                              padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>🔍 EXTENDED</span>}
                            {r.isNearby && <span style={{ 
                              color: '#3B82F6', 
                              fontSize: 'clamp(10px, 2.5vw, 12px)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>📍 NEARBY</span>}
                            {r.isActive && <span style={{ 
                              color: '#10B981', 
                              fontSize: 'clamp(10px, 2.5vw, 12px)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>✅ ACTIVE</span>}
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: 'clamp(12px, 2.5vw, 14px)', 
                          color: '#6b7280',
                          lineHeight: 1.4
                        }}>
                          {r.lat && r.lng ? (
                            r.isDebug ? '🔧 Debug Captain (Started Ride)' :
                            r.isExpanded ? '🔍 Extended Area Captain' :
                            r.isNearby ? '📍 Nearby Live Captain' : 
                            r.isActive ? '📍 Active on Route' :
                            '📍 Live Location'
                          ) : '📍 Location updating...'}
                          <div style={{ 
                            display: 'flex', 
                            gap: 'clamp(4px, 1vw, 6px)', 
                            marginTop: 'clamp(2px, 0.5vw, 4px)',
                            flexWrap: 'wrap'
                          }}>
                            {r.lastUpdate && (
                              <span style={{ 
                                fontSize: 'clamp(10px, 2.5vw, 12px)', 
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                                borderRadius: '4px'
                              }}>
                                • Live {Math.round((currentTime - r.lastUpdate) / 1000)}s ago
                              </span>
                            )}
                            {r.trail && r.trail.length > 1 && (
                              <span style={{ 
                                fontSize: 'clamp(10px, 2.5vw, 12px)', 
                                color: '#8B5CF6',
                                background: 'rgba(139, 92, 246, 0.1)',
                                padding: 'clamp(2px, 0.5vw, 4px) clamp(4px, 1vw, 6px)',
                                borderRadius: '4px'
                              }}>
                                🛤️ Trail ({r.trail.length} points)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => onTrack(r.id)} 
                        style={{ 
                          padding: 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)', 
                          borderRadius: 'clamp(6px, 1.5vw, 8px)', 
                          background: '#3b82f6', 
                          color: '#fff', 
                          border: 'none', 
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: 'clamp(12px, 2.5vw, 14px)',
                          transition: 'all 0.2s ease',
                          flex: '0 0 auto',
                          minWidth: 'auto',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#2563eb'
                          e.target.style.transform = 'translateY(-1px)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#3b82f6'
                          e.target.style.transform = 'translateY(0)'
                        }}
                      >
                        Track Ride
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Map */}
          <div className="col" style={{ minWidth: '320px' }}>
            <h3 style={{ 
              margin: '0 0 clamp(12px, 3vw, 16px) 0', 
              color: '#374151',
              fontSize: 'clamp(18px, 4vw, 20px)',
              fontWeight: 600
            }}>Live Captain Locations</h3>
            <div className="map-container" style={{ 
              borderRadius: 'clamp(8px, 2vw, 12px)', 
              overflow: 'hidden', 
              border: '1px solid #e5e7eb', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
            }}>
              <div ref={mapRef} style={{ 
                height: 'clamp(300px, 50vh, 60vh)', 
                width: '100%', 
                background: '#f3f4f6',
                minHeight: '300px'
              }} />
              <div style={{ 
                padding: 'clamp(8px, 2vw, 12px)', 
                background: '#f9fafb', 
                borderTop: '1px solid #e5e7eb' 
              }}>
                <div style={{ 
                  fontSize: 'clamp(10px, 2.5vw, 12px)', 
                  color: '#6b7280', 
                  textAlign: 'center',
                  lineHeight: 1.4
                }}>
                  <div style={{ 
                    marginBottom: 'clamp(4px, 1vw, 6px)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'clamp(4px, 1vw, 6px)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: '#10B981' }}>🟢 Live</span> • 
                    <span style={{ color: '#EF4444' }}>🔴 Starting</span> • 
                    <span style={{ color: '#3B82F6' }}>🔵 Nearby</span> • 
                    <span style={{ color: '#8B5CF6' }}>🟣 Extended</span>
                  </div>
                  <div style={{ 
                    marginBottom: 'clamp(4px, 1vw, 6px)',
                    fontSize: 'clamp(9px, 2vw, 11px)'
                  }}>
                    📍 Pickup • 🎯 Destination • 🛣️ Route Connections
                  </div>
                  <div style={{ 
                    marginBottom: 'clamp(4px, 1vw, 6px)',
                    fontSize: 'clamp(9px, 2vw, 11px)'
                  }}>
                    🏁 Starting Autos • 🚗 Available Autos • 🛤️ Captain Trails
                  </div>
                  <div style={{ 
                    fontWeight: 600,
                    fontSize: 'clamp(10px, 2.5vw, 12px)'
                  }}>
                    🛺 Total Auto Rickshaws: {rides.filter(r => r.lat && r.lng).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        .auto-rickshaw-marker {
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .auto-rickshaw-marker:hover {
          transform: scale(1.1);
        }
        .leaflet-popup-content {
          text-align: center;
        }
        .leaflet-popup-content button {
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .leaflet-popup-content button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Animated tracking lines */
        .captain-tracking-line {
          animation: dashFlow 2s linear infinite;
        }
        
        /* Route connection lines */
        .captain-route-connection {
          animation: greenFlow 2s linear infinite;
        }
        
        .user-route-line {
          animation: greenRouteFlow 1.5s linear infinite;
        }
        
        /* Captain trail lines */
        .captain-trail-line {
          animation: trailFlow 3s linear infinite;
        }
        
        /* Loading route line */
        .loading-route-line {
          animation: loadingPulse 1s ease-in-out infinite;
        }
        
        @keyframes dashFlow {
          0% {
            stroke-dasharray: 10 5;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 10 5;
            stroke-dashoffset: -15;
          }
        }
        
        @keyframes connectionFlow {
          0% {
            stroke-dasharray: 5 10;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 5 10;
            stroke-dashoffset: -15;
          }
        }
        
        @keyframes routeFlow {
          0% {
            stroke-dasharray: 15 5;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 15 5;
            stroke-dashoffset: -20;
          }
        }
        
        @keyframes loadingPulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        @keyframes greenFlow {
          0% {
            stroke-dasharray: 10 5;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 10 5;
            stroke-dashoffset: -15;
          }
        }
        
        @keyframes greenRouteFlow {
          0% {
            stroke-dasharray: 15 8;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 15 8;
            stroke-dashoffset: -23;
          }
        }
        
        @keyframes trailFlow {
          0% {
            stroke-dasharray: 5 10;
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dasharray: 5 10;
            stroke-dashoffset: -15;
          }
        }
        
        /* Animated arrows */
        .tracking-arrow {
          animation: arrowPulse 1.5s ease-in-out infinite;
        }
        
        @keyframes arrowPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        /* Trail fade effect */
        .captain-tracking-line path {
          filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
        }
      `}</style>
    </div>
  )
}
