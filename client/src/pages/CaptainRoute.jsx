import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function CaptainRoute() {
  const mapRef = React.useRef(null)
  const layerRef = React.useRef(null)
  const loc = useLocation()
  const params = new URLSearchParams(loc.search)
  const fromLat = parseFloat(params.get('fromLat'))
  const fromLng = parseFloat(params.get('fromLng'))
  const toLat = parseFloat(params.get('toLat'))
  const toLng = parseFloat(params.get('toLng'))
  const from = params.get('from')
  const to = params.get('to')

  React.useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('rg-map', { zoomControl: true })
      mapRef.current = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
    }

    const map = mapRef.current
    const start = L.latLng(fromLat, fromLng)
    const end = L.latLng(toLat, toLng)
    map.fitBounds(L.latLngBounds([start, end]), { padding: [40, 40] })

    // Markers
    L.marker(start).addTo(map).bindPopup('Start')
    L.marker(end).addTo(map).bindPopup('Destination')

    // Fetch route from public OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        const coords = json?.routes?.[0]?.geometry?.coordinates || []
        if (coords.length) {
          const latlngs = coords.map((c) => [c[1], c[0]])
          if (layerRef.current) map.removeLayer(layerRef.current)
          layerRef.current = L.polyline(latlngs, { color: '#2563eb', weight: 6 }).addTo(map)
        }
      })
      .catch(() => {})

    return () => {}
  }, [fromLat, fromLng, toLat, toLng])

  const container = { maxWidth: 1200, margin: '0 auto', padding: 24 }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={container}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Route preview</h2>
          <Link to="/captain/home" style={{ textDecoration: 'none' }}>← Back to Home</Link>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div><strong>From:</strong> {from}</div>
          <div><strong>To:</strong> {to}</div>
        </div>
        <div id="rg-map" style={{ height: 560, border: '1px solid #e5e7eb', borderRadius: 12 }} />
      </div>
    </div>
  )
}


