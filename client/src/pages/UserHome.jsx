import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

const container = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' }
const topbar = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }
const brand = { fontWeight: 800, fontSize: 22 }
const topRight = { display: 'flex', alignItems: 'center', gap: 20 }
const topBtn = { padding: '10px 16px', borderRadius: 999, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff' }
const topPrimary = { ...topBtn, background: '#000', color: '#fff', borderColor: '#000' }

const subnavWrap = { borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }
const subnav = { ...container, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24, height: 56, color: '#6b7280' }

const hero = { ...container, display: 'grid', gridTemplateColumns: '1fr', gap: 32, paddingTop: 40, paddingBottom: 60 }
const heroGridWide = { ...hero, gridTemplateColumns: '1fr 1fr', alignItems: 'center' }
const title = { fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 8, marginBottom: 16, fontWeight: 800 }
const promo = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }
const promoSmall = { color: '#6b7280', fontSize: 12, marginBottom: 24 }

const inputRow = { display: 'grid', gridTemplateColumns: '32px 1fr 40px', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 6 }
const input = { border: 'none', outline: 'none', fontSize: 16, padding: '10px 8px', background: '#f9fafb', borderRadius: 8 }
const inputIcon = { textAlign: 'center', fontSize: 18 }
const sendBtn = { justifySelf: 'end', background: '#f3f4f6', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer' }
const actions = { display: 'flex', gap: 12, marginTop: 12 }
const darkBtn = { padding: '12px 18px', background: '#000', color: '#fff', borderRadius: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #000' }
const ghostBtn = { padding: '12px 18px', background: '#fff', color: '#111', borderRadius: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #e5e7eb' }

const artImg = { width: '100%', height: 520, objectFit: 'cover', borderRadius: 16, display: 'block' }

export default function UserHome() {
  const [pickup, setPickup] = React.useState('')
  const [drop, setDrop] = React.useState('')
  const [pickupSuggestions, setPickupSuggestions] = React.useState([])
  const [dropSuggestions, setDropSuggestions] = React.useState([])
  const [pickupPoint, setPickupPoint] = React.useState(null) // {lat, lng, name}
  const [dropPoint, setDropPoint] = React.useState(null)
  const [isGettingLocation, setIsGettingLocation] = React.useState(false)
  const [rideSharingSuggestions, setRideSharingSuggestions] = React.useState(null)
  const [showSuggestionModal, setShowSuggestionModal] = React.useState(false)
  const pickupTimerRef = React.useRef(null)
  const dropTimerRef = React.useRef(null)
  const navigate = useNavigate()


  const searchPlaces = async (query) => {
    if (!query || query.trim().length < 3) return []
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        { headers: { Accept: 'application/json' } }
      )
      if (!res.ok) return []
      const data = await res.json()
      return data
    } catch (_) {
      return []
    }
  }

  const handlePickupChange = (e) => {
    const value = e.target.value
    setPickup(value)
    setPickupPoint(null)
    if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current)
    pickupTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(value)
      setPickupSuggestions(results)
    }, 300)
  }

  const handleDropChange = (e) => {
    const value = e.target.value
    setDrop(value)
    setDropPoint(null)
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current)
    dropTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(value)
      setDropSuggestions(results)
    }, 300)
  }

  const onSelectPickup = (place) => {
    setPickup(place.display_name)
    setPickupPoint({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), name: place.display_name })
    setPickupSuggestions([])
  }

  const onSelectDrop = (place) => {
    setDrop(place.display_name)
    setDropPoint({ lat: parseFloat(place.lat), lng: parseFloat(place.lon), name: place.display_name })
    setDropSuggestions([])
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }
    
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { Accept: 'application/json' } }
          )
          const data = await response.json()
          const address = data?.display_name || `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          
          setPickup(address)
          setPickupPoint({ lat: latitude, lng: longitude, name: address })
          setPickupSuggestions([])
        } catch (error) {
          // Fallback if reverse geocoding fails
          const address = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          setPickup(address)
          setPickupPoint({ lat: latitude, lng: longitude, name: address })
          setPickupSuggestions([])
        }
        setIsGettingLocation(false)
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to get your current location. Please try again or enter manually.')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  const onSeePrices = () => {
    const from = pickupPoint
    const to = dropPoint
    if (!from || !to) return alert('Please select pickup and destination from suggestions.')
    const params = new URLSearchParams({
      fromLat: String(from.lat),
      fromLng: String(from.lng),
      toLat: String(to.lat),
      toLng: String(to.lng),
      fromName: from.name,
      toName: to.name,
    })
    navigate(`/user/rides?${params.toString()}`)
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* Secondary nav */}
      <div style={subnavWrap}>
        <div style={subnav}>
          <span>Request a ride</span>
          <span>Reserve a ride</span>
        </div>
      </div>

      {/* Hero */}
      <div style={heroGridWide}>
        <section>
          <div style={{ color: '#111', fontSize: 18, fontWeight: 700, marginTop: 24 }}>Ride</div>
          <h1 style={title}>Request a ride for now</h1>

          <div style={promoSmall}>*Valid within 15 days of signup.</div>

          <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <div style={{ position: 'relative' }}>
              <div style={inputRow}>
                <span style={inputIcon}>📍</span>
                <input
                  style={input}
                  placeholder="Enter location"
                  value={pickup}
                  onChange={handlePickupChange}
                  onFocus={() => pickup && handlePickupChange({ target: { value: pickup } })}
                />
                <button 
                  type="button" 
                  style={{...sendBtn, background: isGettingLocation ? '#f3f4f6' : '#3b82f6', color: isGettingLocation ? '#6b7280' : '#fff'}} 
                  aria-label="Use current location"
                  onClick={useCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? '⏳' : '📍'}
                </button>
              </div>
              {pickupSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginTop: 6, maxHeight: 220, overflowY: 'auto', zIndex: 5 }}>
                  {pickupSuggestions.map((p) => (
                    <div key={p.place_id} onClick={() => onSelectPickup(p)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                      {p.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={inputRow}>
                <span style={inputIcon}>🏁</span>
                <input
                  style={input}
                  placeholder="Enter destination"
                  value={drop}
                  onChange={handleDropChange}
                  onFocus={() => drop && handleDropChange({ target: { value: drop } })}
                />
                <span />
              </div>
              {dropSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginTop: 6, maxHeight: 220, overflowY: 'auto', zIndex: 5 }}>
                  {dropSuggestions.map((p) => (
                    <div key={p.place_id} onClick={() => onSelectDrop(p)} style={{ padding: '10px 12px', cursor: 'pointer' }}>
                      {p.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={actions}>
              <button style={darkBtn} type="button" onClick={onSeePrices}>See status</button>
              {/* <button style={ghostBtn} type="button">Schedule for later</button> */}
            </div>
          </div>
        </section>

<aside>
  <img
    style={artImg}
    src="/rider-go.png"   // 👈 no /images, because file directly public me hai
    alt="RiderGo ride illustration"
    onError={(e) => {
      e.currentTarget.src = '/rider-go.png'  
    }}
  />
</aside>
      </div>
    </div>
  )
}