import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import VoiceSearchAdvanced from '../components/VoiceSearchAdvanced'

const container = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' }

const subnavWrap = { borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }
const subnav = { ...container, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 24, height: 56, color: '#6b7280' }

const hero = { ...container, display: 'grid', gridTemplateColumns: '1fr', gap: 32, paddingTop: 40, paddingBottom: 60 }
const heroGridWide = { ...hero, gridTemplateColumns: '1fr 1fr', alignItems: 'center' }
const title = { fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 8, marginBottom: 16, fontWeight: 800 }
const promoSmall = { color: '#6b7280', fontSize: 12, marginBottom: 24 }

const inputRow = { display: 'grid', gridTemplateColumns: '32px 1fr 140px', alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 6 }
const input = { border: 'none', outline: 'none', fontSize: 16, padding: '10px 8px', background: '#f9fafb', borderRadius: 8 }
const inputIcon = { textAlign: 'center', fontSize: 18 }
const sendBtn = { justifySelf: 'end', background: '#3b82f6', border: 'none', borderRadius: 10, minWidth: 120, height: 40, cursor: 'pointer', color: '#fff', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }
const actions = { display: 'flex', gap: 12, marginTop: 12 }
const darkBtn = { padding: '12px 18px', background: '#000', color: '#fff', borderRadius: 10, fontWeight: 700, cursor: 'pointer', border: '1px solid #000' }
// top-level button styles are defined in navbar component; not needed here

const artImg = { width: '100%', height: 520, objectFit: 'cover', borderRadius: 16, display: 'block' }

export default function UserHome() {
  const [pickup, setPickup] = React.useState('')
  const [drop, setDrop] = React.useState('')
  const [pickupSuggestions, setPickupSuggestions] = React.useState([])
  const [dropSuggestions, setDropSuggestions] = React.useState([])
  const [pickupPoint, setPickupPoint] = React.useState(null) // {lat, lng, name}
  const [dropPoint, setDropPoint] = React.useState(null)
  const [isGettingLocation, setIsGettingLocation] = React.useState(false)
  const [showPickupVoice, setShowPickupVoice] = React.useState(false)
  const [showDropVoice, setShowDropVoice] = React.useState(false)
  // (ride-sharing suggestions UI removed for now)
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
    } catch {
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
        } catch {
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

  // Voice search handlers
  const handlePickupVoiceResult = (result) => {
    if (result.success && result.location) {
      console.log('🎤 Pickup voice result:', result)
      setPickup(result.location.name)
      setPickupPoint({
        lat: result.location.lat,
        lng: result.location.lng,
        name: result.location.name
      })
      setPickupSuggestions([])
      setShowPickupVoice(false)
      alert(`✅ Pickup location set: ${result.transcript}`)
    } else {
      console.error('🎤 Pickup voice search failed:', result)
    }
  }

  const handleDropVoiceResult = (result) => {
    if (result.success && result.location) {
      console.log('🎤 Drop voice result:', result)
      setDrop(result.location.name)
      setDropPoint({
        lat: result.location.lat,
        lng: result.location.lng,
        name: result.location.name
      })
      setDropSuggestions([])
      setShowDropVoice(false)
      alert(`✅ Destination set: ${result.transcript}`)
    } else {
      console.error('🎤 Drop voice search failed:', result)
    }
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
                  placeholder="Enter pickup location or use voice search"
                  value={pickup}
                  onChange={handlePickupChange}
                  onFocus={() => pickup && handlePickupChange({ target: { value: pickup } })}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    style={{
                      background: showPickupVoice ? '#ef4444' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={() => setShowPickupVoice(!showPickupVoice)}
                    title="Voice search for pickup location"
                  >
                    🎤 {showPickupVoice ? 'Hide' : 'Voice'}
                  </button>
                  <button 
                    type="button" 
                    style={{...sendBtn, background: isGettingLocation ? '#60a5fa' : '#1e40af', opacity: isGettingLocation ? 0.9 : 1, minWidth: '100px'}}
                    aria-label="Use current location"
                    title="Use your current location"
                    onClick={useCurrentLocation}
                    disabled={isGettingLocation}
                  >
                    <span style={{ marginRight: 4, fontSize: 14 }}>{isGettingLocation ? '⏳' : '📍'}</span>
                    <span style={{ fontSize: 12 }}>{isGettingLocation ? 'Locating…' : 'Current'}</span>
                  </button>
                </div>
              </div>
              
              {/* Voice Search Component for Pickup */}
              {showPickupVoice && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '8px',
                  zIndex: 10,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎤 Voice Search - Pickup Location
                    <button
                      onClick={() => setShowPickupVoice(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                  <VoiceSearchAdvanced
                    onResult={handlePickupVoiceResult}
                    language="en-IN"
                    placeholder="Speak your pickup location"
                    showLanguageSelector={true}
                    accessibilityMode={false}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    💡 Try saying: "Connaught Place Delhi" or "Red Fort New Delhi"
                  </div>
                </div>
              )}
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
                  placeholder="Enter destination or use voice search"
                  value={drop}
                  onChange={handleDropChange}
                  onFocus={() => drop && handleDropChange({ target: { value: drop } })}
                />
                <button 
                  type="button" 
                  style={{
                    background: showDropVoice ? '#ef4444' : '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '80px'
                  }}
                  onClick={() => setShowDropVoice(!showDropVoice)}
                  title="Voice search for destination"
                >
                  🎤 {showDropVoice ? 'Hide' : 'Voice'}
                </button>
              </div>
              
              {/* Voice Search Component for Destination */}
              {showDropVoice && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '8px',
                  zIndex: 10,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎤 Voice Search - Destination
                    <button
                      onClick={() => setShowDropVoice(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      ❌
                    </button>
                  </div>
                  <VoiceSearchAdvanced
                    onResult={handleDropVoiceResult}
                    language="en-IN"
                    placeholder="Speak your destination"
                    showLanguageSelector={true}
                    accessibilityMode={false}
                  />
                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    💡 Try saying: "India Gate Delhi" or "Lotus Temple New Delhi"
                  </div>
                </div>
              )}
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