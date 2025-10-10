import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useParams, useNavigate } from 'react-router-dom'

export default function CaptainProfileView() {
  const { captainId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [myRating, setMyRating] = useState(null)
  const [submittingRating, setSubmittingRating] = useState(false)

  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

  useEffect(() => {
    if (!captainId) return
    // call loader and catch errors to keep linter happy about dependencies
    loadCaptainProfile().catch(err => console.warn('Failed to load profile on mount', err))
  }, [captainId])

  // socket for real-time updates (shared across reloads while component mounted)
  const socketRef = useRef(null)
  useEffect(() => {
    // create socket once when component mounts
    const token = localStorage.getItem('token') || localStorage.getItem('captain_token')
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
  const s = io(SOCKET_URL, { auth: { token } })
    socketRef.current = s

    s.on('connect', () => console.log('⭐ profile socket connected', s.id))
    s.on('captain:rating-updated', payload => {
      try {
        if (payload && String(payload.captainId) === String(captainId)) {
          setProfile(prev => prev ? ({ ...prev, rating: payload.averageRating, ratingCount: payload.ratingCount }) : prev)
          console.log('📣 Received captain rating update', payload)
        }
      } catch (e) { console.warn('Error handling rating update', e) }
    })

    return () => {
      try { s.disconnect() } catch { console.warn('socket disconnect failed') }
      socketRef.current = null
    }
  }, [captainId])

  const loadCaptainProfile = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
        const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
        const response = await fetch(`${BACKEND}/api/auth/captain/${captainId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile || data.captain || data)
        // try fetching my rating (if logged in)
        try {
          const token = localStorage.getItem('token')
          if (token) {
            const mr = await fetch(`${BACKEND}/api/auth/captain/${captainId}/my-rating`, { headers: { Authorization: `Bearer ${token}` } })
            if (mr.ok) {
              const mj = await mr.json()
              setMyRating(mj.myRating)
            }
          }
        } catch (err) {
          /* ignore my-rating fetch errors */
          void err
        }
      } else {
        setError('Captain profile not found')
      }
    } catch (error) {
      console.error('Error fetching captain profile:', error)
      setError('Failed to load captain profile')
    } finally {
      setLoading(false)
    }
  }

  const InfoCard = ({ icon, label, value, color = '#6b7280' }) => (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      textAlign: 'center',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = 'none'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color }}>{value || '-'}</div>
    </div>
  )

  const submitRating = async (value) => {
    if (!captainId) return
    setSubmittingRating(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${BACKEND}/api/auth/captain/${captainId}/rate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rating: Number(value) })
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setMyRating(Number(value))
        setProfile((p) => ({ ...p, rating: data.averageRating || p.rating, ratingCount: data.ratingCount || p.ratingCount }))
      } else {
        console.error('Rating endpoint returned non-ok:', res.status, data)
        alert((data && data.message) || `Failed to submit rating (${res.status})`)
      }
    } catch (e) {
      console.error('Rating submit error', e)
      alert('Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '20px' }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Header */}
          <div className="panel" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '24px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '800', 
              color: 'white',
              margin: 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              🚗 Captain Profile
            </h1>
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(107,114,128,0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(107,114,128,0.4)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(107,114,128,0.3)'
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626',
            backdropFilter: 'blur(10px)',
            textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="panel" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '40px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>Loading captain profile...</div>
          </div>
        )}

        {/* Profile Content */}
        {profile && !loading && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.1)'
          }}>
            {/* Profile Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '32px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                color: 'white',
                boxShadow: '0 8px 25px rgba(102,126,234,0.3)',
                border: '4px solid white'
              }}>
                👨‍✈️
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: '#111',
                  margin: '0 0 8px 0'
                }}>
                  {profile.name}
                </h2>
                <p style={{ 
                  fontSize: '16px', 
                  color: '#6b7280',
                  margin: '0 0 8px 0'
                }}>
                  📧 {profile.email}
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    background: profile.status === 'online' 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {profile.status === 'online' ? '🟢 ONLINE' : '🔴 OFFLINE'}
                  </div>
                  {profile.experienceYears && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      🏆 {profile.experienceYears} Years Experience
                    </div>
                  )}
                  {profile.contactVerified && (
                    <div style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      ✅ Verified
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px',
              marginBottom: '32px'
            }}>
              <InfoCard icon="📱" label="Phone" value={profile.contact} />
              <InfoCard icon="🚗" label="Vehicle Type" value={profile.vehicleType} color="#3b82f6" />
              <InfoCard icon="🔢" label="Vehicle Number" value={profile.vehicleNumber} color="#8b5cf6" />
              <InfoCard icon="🏎️" label="Vehicle Model" value={profile.vehicleModel} color="#f59e0b" />
              <InfoCard icon="👥" label="Seating Capacity" value={profile.seatingCapacity} color="#10b981" />
              <InfoCard icon="🎯" label="Completed Rides" value={profile.ridesCompleted || 0} color="#ef4444" />
              <InfoCard icon="⭐" label="Rating" value={`${profile.rating || 5.0}/5.0 (${profile.ratingCount || 0} ratings)`} color="#fbbf24" />
              <InfoCard icon="💰" label="Total Earnings" value={`₹${profile.earnings || 0}`} color="#059669" />
            </div>

            {/* Rating UI for users */}
            <div style={{ marginTop: 12, marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Rate this captain</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {[1,2,3,4,5].map((s) => (
                  <button key={s} disabled={submittingRating} onClick={() => submitRating(s)} style={{
                    background: myRating >= s ? '#f59e0b' : '#e5e7eb',
                    color: myRating >= s ? 'white' : '#6b7280',
                    border: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 700
                  }}>{'★'}</button>
                ))}
                <div style={{ color: '#6b7280', fontSize: 14 }}>{myRating ? `Your rating: ${myRating}` : 'You have not rated yet'}</div>
              </div>
            </div>

            {/* Experience Section */}
            {profile.experienceTagline && (
              <div style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'white',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  "{profile.experienceTagline}"
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div style={{
              background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
              padding: '20px',
              borderRadius: '16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>📞</div>
              <div style={{ fontSize: '16px', color: '#0277bd', fontWeight: '600', marginBottom: '8px' }}>
                Contact Captain
              </div>
              <div style={{ fontSize: '18px', color: '#01579b', fontWeight: '700' }}>
                {profile.contact}
              </div>
              <div style={{ fontSize: '14px', color: '#0288d1', marginTop: '8px' }}>
                Call directly for ride coordination
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
