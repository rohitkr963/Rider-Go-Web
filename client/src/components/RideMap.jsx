import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
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

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const captainIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Component to handle map updates
function MapUpdater({ center, zoom }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13)
    }
  }, [center, zoom, map])
  
  return null
}

// Component for moving captain marker with smooth animation
function MovingCaptainMarker({ position, isMoving }) {
  const map = useMap()
  const markerRef = useRef()
  const animationRef = useRef()
  
  useEffect(() => {
    if (markerRef.current && position) {
      // Smooth animation for marker movement
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      const animateMarker = () => {
        if (markerRef.current) {
          markerRef.current.setLatLng(position)
          if (isMoving) {
            map.setView(position, map.getZoom(), { animate: true, duration: 1 })
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animateMarker)
    }
  }, [position, isMoving, map])
  
  return position ? (
    <Marker
      ref={markerRef}
      position={position}
      icon={captainIcon}
    >
      <Popup>
        <div>
          <strong>🚖 Captain Location</strong><br />
          {isMoving ? 'Moving...' : 'Stopped'}
        </div>
      </Popup>
    </Marker>
  ) : null
}

export default function RideMap({ 
  pickup, 
  destination, 
  captainPosition, 
  routeCoordinates, 
  isNavigating = false,
  height = '400px' 
}) {
  const mapCenter = captainPosition || pickup || [28.6139, 77.2090] // Default to Delhi
  const mapZoom = 13

  return (
    <div style={{ height, width: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <MapUpdater center={mapCenter} zoom={mapZoom} />
        
        {/* Pickup Marker */}
        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            icon={pickupIcon}
          >
            <Popup>
              <div>
                <strong>📍 Pickup Location</strong><br />
                {pickup.name || 'Pickup Point'}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Destination Marker */}
        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={destinationIcon}
          >
            <Popup>
              <div>
                <strong>🏁 Destination</strong><br />
                {destination.name || 'Destination'}
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Captain Marker */}
        {captainPosition && (
          <MovingCaptainMarker 
            position={captainPosition} 
            isMoving={isNavigating}
          />
        )}
        
        {/* Route Polyline */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  )
}