import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'

export default function UserRideList() {
  const [loading, setLoading] = React.useState(false)
  const [rides, setRides] = React.useState([])
  const [emptyMsg, setEmptyMsg] = React.useState('')
  const socketRef = React.useRef(null)
  const loc = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(loc.search)
  const fromLat = params.get('fromLat')
  const fromLng = params.get('fromLng')
  const toLat = params.get('toLat')
  const toLng = params.get('toLng')
  const fromName = params.get('fromName') || 'Pickup'
  const toName = params.get('toName') || 'Destination'

  React.useEffect(() => {
    let cancelled = false
    async function planAndListen() {
      if (!fromLat || !fromLng || !toLat || !toLng) return
      try {
        setLoading(true)
        const res = await fetch('http://localhost:3000/api/ride/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromLat: Number(fromLat), fromLng: Number(fromLng), toLat: Number(toLat), toLng: Number(toLng), fromName, toName })
        })
        const data = await res.json()
        if (!cancelled && res.ok) {
          // Initial placeholder to show route context if needed
          setRides([])
          // Start real-time search for captains on this route
          const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
          const s = io('http://localhost:3000', { auth: { token } })
          socketRef.current = s
          s.emit('user:route:search', { fromLat, fromLng, toLat, toLng })
          s.on('user:route:results', (payload) => {
            const items = (payload?.items || []).map((m) => ({
              id: m.rideId,
              captainEmail: m.captainEmail || 'Captain',
              captainName: m.captainName || '',
              lat: typeof m.lat === 'number' ? m.lat : undefined,
              lng: typeof m.lng === 'number' ? m.lng : undefined,
            }))
            setRides(items)
            setEmptyMsg('')
          })
          s.on('user:route:empty', (payload) => {
            setRides([])
            setEmptyMsg(payload?.message || 'Wait some time, autos are coming soon...')
          })
        }
      } catch (e) {
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
  }, [fromLat, fromLng, toLat, toLng, fromName, toName])

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
      
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, paddingTop: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Available rides on your route</h2>
        <Link to="/user/home" style={{ textDecoration: 'none' }}>← Change route</Link>
      </div>
      {loading && <div>Loading…</div>}
      {!loading && rides.length === 0 && (
        <div style={{ padding: 16, border: '1px dashed #94a3b8', borderRadius: 12, background: '#f8fafc' }}>
          {emptyMsg || 'No rides found yet.'}
        </div>
      )}
      {!loading && rides.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {rides.map((r) => (
            <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>{r.captainName || r.captainEmail}</div>
              <button onClick={() => onTrack(r.id)} style={{ padding: '10px 14px', borderRadius: 10, background: '#111', color: '#fff', border: '1px solid #111', cursor: 'pointer' }}>Track</button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
