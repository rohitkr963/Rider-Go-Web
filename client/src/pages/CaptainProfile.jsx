import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function CaptainProfile() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  // socket for realtime updates (captain view)
  const socketRef = useRef(null)
  useEffect(() => {
    const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
    const s = io(SOCKET_URL, { auth: { token } })
    socketRef.current = s
    s.on('connect', () => console.log('⭐ captain profile socket connected', s.id))
    s.on('captain:rating-updated', payload => {
      try {
        // if this update is for the logged-in captain, update UI
        if (!payload) return
        const capId = payload.captainId
        if (profile && String(profile._id) === String(capId)) {
          setProfile(prev => prev ? ({ ...prev, averageRating: payload.averageRating, ratingCount: payload.ratingCount }) : prev)
          console.log('📣 CaptainProfile received rating update', payload)
        }
      } catch (e) {
        console.warn('Error handling captain rating update', e)
      }
    })

    return () => {
      try { socketRef.current && socketRef.current.disconnect() } catch (err) { console.warn('socket disconnect error', err) }
      socketRef.current = null
    }
  }, [profile])

  const loadProfile = async () => {
    try {
  const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const res = await fetch(BACKEND + '/api/auth/captain/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        // Normalize rating fields: some endpoints return `rating` (avg) while UI expects `averageRating`
        const prof = data.profile || {}
        if (prof.rating && !prof.averageRating) prof.averageRating = prof.rating
        if (typeof prof.ratingCount === 'undefined') prof.ratingCount = prof.ratingCount || 0
        setProfile(prof)
        setEditForm(prof)
      } else {
        setError(data.message || 'Failed to load profile')
      }
    } catch (e) {
      console.warn('Failed to load profile error', e)
      setError('Failed to load profile')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({ ...profile })
    setError('')
    setSuccessMessage('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({ ...profile })
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
  const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  const res = await fetch(BACKEND + '/api/auth/captain/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (res.ok) {
        setProfile(data.profile)
        setIsEditing(false)
        setSuccessMessage('Profile updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (e) {
      console.warn('Failed to update profile', e)
      setError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const InputField = ({ label, field, type = 'text', options = null }) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        fontSize: '14px', 
        fontWeight: '600', 
        color: '#374151', 
        marginBottom: '8px' 
      }}>
        {label}
      </label>
      {options ? (
        <select
          value={editForm[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px',
            transition: 'border-color 0.2s ease',
            backgroundColor: 'white'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={editForm[field] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
      )}
    </div>
  )

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

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
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
            {!isEditing && profile && (
              <button
                onClick={handleEdit}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)'
                }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626',
            backdropFilter: 'blur(10px)'
          }}>
            ❌ {error}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            color: '#059669',
            backdropFilter: 'blur(10px)'
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Loading State */}
        {!profile && !error && (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '60px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>Loading your profile...</div>
          </div>
        )}

        {/* Profile Content */}
        {profile && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.1)'
          }}>
            {isEditing ? (
              /* Edit Form */
              <div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#111',
                  marginBottom: '32px',
                  textAlign: 'center'
                }}>
                  ✏️ Edit Your Profile
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <InputField label="Full Name" field="name" />
                  <InputField label="Email Address" field="email" type="email" />
                  <InputField label="Phone Number" field="contact" />
                  <InputField 
                    label="Vehicle Type" 
                    field="vehicleType" 
                    options={['Auto', 'Cab', 'Car', 'Bike']} 
                  />
                  <InputField label="Vehicle Number" field="vehicleNumber" />
                  <InputField label="Vehicle Model" field="vehicleModel" />
                  <InputField label="Seating Capacity" field="seatingCapacity" type="number" />
                  <InputField label="Experience (Years)" field="experienceYears" type="number" />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <InputField label="Experience Tagline" field="experienceTagline" />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button
                    onClick={handleCancel}
                    style={{
                      background: 'rgba(107,114,128,0.1)',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '14px 28px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(107,114,128,0.2)'
                      e.target.style.borderColor = '#9ca3af'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(107,114,128,0.1)'
                      e.target.style.borderColor = '#e5e7eb'
                    }}
                  >
                    ❌ Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                      background: saving 
                        ? 'rgba(156,163,175,0.3)' 
                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px 28px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: saving ? 'none' : '0 4px 15px rgba(59,130,246,0.3)'
                    }}
                    onMouseOver={(e) => {
                      if (saving) return
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)'
                    }}
                    onMouseOut={(e) => {
                      if (saving) return
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 15px rgba(59,130,246,0.3)'
                    }}
                  >
                    {saving ? '⏳ Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div>
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
                      gap: '12px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        🟢 ACTIVE
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
                  <InfoCard icon="⭐" label="Rating" value={`${profile.averageRating || 5.0}/5.0 (${profile.ratingCount || 0} ratings)`} color="#fbbf24" />
                  <InfoCard icon="💰" label="Total Earnings" value={`₹${profile.earnings || 0}`} color="#059669" />
                </div>

                {/* Experience Section */}
                {profile.experienceTagline && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    padding: '20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    color: 'white'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      "{profile.experienceTagline}"
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


