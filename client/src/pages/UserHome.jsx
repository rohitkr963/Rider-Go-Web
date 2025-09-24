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

      {/* New Related Section - Ride Features & Quick Actions */}
      <div style={{ background: '#f8fafc', paddingTop: 60, paddingBottom: 60 }}>
        <div style={container}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#111', marginBottom: 16 }}>
              Why Choose RiderGo?
            </h2>
            <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 600, margin: '0 auto' }}>
              Experience the best ride-sharing service with real-time tracking, voice search, and affordable prices
            </p>
          </div>

          {/* Features Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: 32, 
            marginBottom: 48 
          }}>
            {/* Real-time Tracking */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>
                Real-time Tracking
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                Track your captain's location in real-time with live map updates and accurate arrival times
              </p>
            </div>

            {/* Voice Search */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>
                Voice Search
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                Simply speak your destination in English or Hindi - no need to type long addresses
              </p>
            </div>

            {/* Multiple Seats */}
            <div style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>
                Group Booking
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.6 }}>
                Book multiple seats for your family or friends in the same auto rickshaw
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            borderRadius: 20,
            padding: 40,
            color: '#fff',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
              Quick Actions
            </h3>
            <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
              Access your ride history, manage bookings, or get help with just one click
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              justifyContent: 'center', 
              flexWrap: 'wrap' 
            }}>
              <Link 
                to="/user/accepted-rides" 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 12,
                  padding: '12px 24px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                📋 My Bookings
              </Link>
              
              <Link 
                to="/user/profile" 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 12,
                  padding: '12px 24px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                👤 My Profile
              </Link>
              
              <button 
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 12,
                  padding: '12px 24px',
                  color: '#fff',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onClick={() => alert('Help & Support coming soon!')}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                💬 Help & Support
              </button>
            </div>
          </div>

          {/* Popular Destinations */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: '#111', 
              marginBottom: 24, 
              textAlign: 'center' 
            }}>
              🔥 Popular Destinations in Delhi
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 16 
            }}>
              {[
                { name: 'Connaught Place', icon: '🏢' },
                { name: 'India Gate', icon: '🏛️' },
                { name: 'Red Fort', icon: '🏰' },
                { name: 'Lotus Temple', icon: '🪷' },
                { name: 'Qutub Minar', icon: '🗼' },
                { name: 'Akshardham', icon: '🕌' }
              ].map((dest, index) => (
                <button
                  key={index}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '16px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontWeight: 600,
                    color: '#374151'
                  }}
                  onClick={() => {
                    setDrop(dest.name + ', Delhi')
                    // Auto-search for the destination
                    searchPlaces(dest.name + ', Delhi').then(results => {
                      if (results.length > 0) {
                        onSelectDrop(results[0])
                      }
                    })
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f3f4f6'
                    e.target.style.borderColor = '#3b82f6'
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#fff'
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <span style={{ fontSize: 24 }}>{dest.icon}</span>
                  <span>{dest.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div style={{ 
            marginTop: 48, 
            background: '#fff', 
            borderRadius: 16, 
            padding: 32,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: '#111', 
              marginBottom: 32, 
              textAlign: 'center' 
            }}>
              📊 RiderGo by Numbers
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: 24,
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', marginBottom: 8 }}>
                  1000+
                </div>
                <div style={{ color: '#6b7280', fontWeight: 600 }}>Happy Riders</div>
              </div>
              
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', marginBottom: 8 }}>
                  500+
                </div>
                <div style={{ color: '#6b7280', fontWeight: 600 }}>Active Captains</div>
              </div>
              
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', marginBottom: 8 }}>
                  24/7
                </div>
                <div style={{ color: '#6b7280', fontWeight: 600 }}>Service Available</div>
              </div>
              
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>
                  ₹15+
                </div>
                <div style={{ color: '#6b7280', fontWeight: 600 }}>Starting Fare</div>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div style={{ marginTop: 60 }}>
            <h3 style={{ 
              fontSize: 32, 
              fontWeight: 800, 
              color: '#111', 
              marginBottom: 40, 
              textAlign: 'center' 
            }}>
              🚀 How RiderGo Works
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 24 
            }}>
              {[
                { 
                  step: '1', 
                  icon: '📍', 
                  title: 'Set Your Location', 
                  desc: 'Enter pickup & destination or use voice search' 
                },
                { 
                  step: '2', 
                  icon: '🛺', 
                  title: 'Choose Captain', 
                  desc: 'See live captains on map and select the best one' 
                },
                { 
                  step: '3', 
                  icon: '💰', 
                  title: 'Book & Pay', 
                  desc: 'Confirm your ride and pay securely' 
                },
                { 
                  step: '4', 
                  icon: '🎯', 
                  title: 'Track & Ride', 
                  desc: 'Track captain in real-time until you reach' 
                }
              ].map((item, index) => (
                <div key={index} style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 24,
                  textAlign: 'center',
                  position: 'relative',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: -15,
                    left: 20,
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700
                  }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                    {item.title}
                  </h4>
                  <p style={{ color: '#6b7280', lineHeight: 1.5, fontSize: 14 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Safety & Trust Section */}
          <div style={{ 
            marginTop: 60,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 20,
            padding: 40,
            color: '#fff'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
                🛡️ Your Safety is Our Priority
              </h3>
              <p style={{ fontSize: 16, opacity: 0.9, maxWidth: 600, margin: '0 auto' }}>
                We ensure every ride is safe, secure, and comfortable for all our users
              </p>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 24 
            }}>
              {[
                { icon: '✅', title: 'Verified Captains', desc: 'All drivers verified with documents' },
                { icon: '📱', title: 'Live Tracking', desc: 'Real-time location sharing' },
                { icon: '🆘', title: 'Emergency Button', desc: '24/7 emergency support' },
                { icon: '⭐', title: 'Rating System', desc: 'Rate and review every ride' }
              ].map((item, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 20,
                  textAlign: 'center',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h4>
                  <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Section */}
          <div style={{ marginTop: 60 }}>
            <h3 style={{ 
              fontSize: 28, 
              fontWeight: 800, 
              color: '#111', 
              marginBottom: 16, 
              textAlign: 'center' 
            }}>
              💸 Transparent Pricing
            </h3>
            <p style={{ 
              fontSize: 16, 
              color: '#6b7280', 
              textAlign: 'center', 
              marginBottom: 32,
              maxWidth: 500,
              margin: '0 auto 32px'
            }}>
              No hidden charges, no surge pricing. Pay exactly what you see.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 24 
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 24,
                border: '2px solid #3b82f6',
                textAlign: 'center',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#3b82f6',
                  color: 'white',
                  padding: '4px 16px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  MOST POPULAR
                </div>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🛺</div>
                <h4 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                  Auto Rickshaw
                </h4>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', marginBottom: 8 }}>
                  ₹15
                </div>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                  Base fare + ₹8/km
                </p>
                <ul style={{ 
                  textAlign: 'left', 
                  color: '#374151', 
                  fontSize: 14,
                  lineHeight: 1.6,
                  listStyle: 'none',
                  padding: 0
                }}>
                  <li style={{ marginBottom: 8 }}>✅ Up to 3 passengers</li>
                  <li style={{ marginBottom: 8 }}>✅ Real-time tracking</li>
                  <li style={{ marginBottom: 8 }}>✅ Voice search</li>
                  <li>✅ 24/7 availability</li>
                </ul>
              </div>
              
              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🚗</div>
                <h4 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>
                  Cab (Coming Soon)
                </h4>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#6b7280', marginBottom: 8 }}>
                  ₹25
                </div>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                  Base fare + ₹12/km
                </p>
                <ul style={{ 
                  textAlign: 'left', 
                  color: '#6b7280', 
                  fontSize: 14,
                  lineHeight: 1.6,
                  listStyle: 'none',
                  padding: 0
                }}>
                  <li style={{ marginBottom: 8 }}>🔜 Up to 4 passengers</li>
                  <li style={{ marginBottom: 8 }}>🔜 AC comfort</li>
                  <li style={{ marginBottom: 8 }}>🔜 Premium service</li>
                  <li>🔜 Airport rides</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download App Section */}
          <div style={{ 
            marginTop: 60,
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: 20,
            padding: 40,
            textAlign: 'center',
            color: '#fff'
          }}>
            <h3 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
              📱 Get the RiderGo App
            </h3>
            <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
              Download our mobile app for even better experience with offline maps and instant notifications
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              justifyContent: 'center', 
              flexWrap: 'wrap' 
            }}>
              <button style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 12,
                padding: '12px 24px',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)'
              }}
              onClick={() => alert('Android App coming soon!')}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                e.target.style.transform = 'translateY(0)'
              }}
              >
                🤖 Download for Android
              </button>
              
              <button style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 12,
                padding: '12px 24px',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)'
              }}
              onClick={() => alert('iOS App coming soon!')}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                e.target.style.transform = 'translateY(0)'
              }}
              >
                🍎 Download for iOS
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <div style={{ marginTop: 60 }}>
            <h3 style={{ 
              fontSize: 28, 
              fontWeight: 800, 
              color: '#111', 
              marginBottom: 32, 
              textAlign: 'center' 
            }}>
              ❓ Frequently Asked Questions
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gap: 16,
              maxWidth: 800,
              margin: '0 auto'
            }}>
              {[
                {
                  q: 'How do I book a ride?',
                  a: 'Simply enter your pickup and destination, choose a captain from the map, and confirm your booking!'
                },
                {
                  q: 'Can I track my captain in real-time?',
                  a: 'Yes! You can see your captain\'s live location on the map and get accurate arrival times.'
                },
                {
                  q: 'How many people can ride together?',
                  a: 'Auto rickshaws can accommodate up to 3 passengers. You can book multiple seats for your group.'
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept cash payments. Digital payment options will be available soon!'
                },
                {
                  q: 'Is the service available 24/7?',
                  a: 'Yes, RiderGo operates 24/7 with captains available round the clock in most areas.'
                }
              ].map((faq, index) => (
                <div key={index} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <h4 style={{ 
                    fontSize: 16, 
                    fontWeight: 700, 
                    color: '#111', 
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span style={{ color: '#3b82f6' }}>Q:</span>
                    {faq.q}
                  </h4>
                  <p style={{ 
                    color: '#6b7280', 
                    lineHeight: 1.6, 
                    fontSize: 14,
                    marginLeft: 24
                  }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>A:</span> {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}