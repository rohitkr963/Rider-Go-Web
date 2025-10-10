import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const UserProfile = () => {
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saveLoading, setSaveLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Get user info from localStorage or API
    const token = localStorage.getItem('token')
    const userEmail = localStorage.getItem('userEmail')
    const userName = localStorage.getItem('userName')
    
    if (!token) {
      // Redirect to login if not authenticated
      navigate('/user/login')
      return
    }

    // Set user info from localStorage (can be enhanced with API call)
    const userData = {
      email: userEmail || 'user@example.com',
      name: userName || 'User',
      phone: localStorage.getItem('userPhone') || 'Not provided',
      joinDate: localStorage.getItem('userJoinDate') || new Date().toLocaleDateString(),
      bio: localStorage.getItem('userBio') || 'Passionate rider exploring the city!',
      location: localStorage.getItem('userLocation') || 'Not specified'
    }
    setUserInfo(userData)
    setEditForm(userData)
    setLoading(false)
  }, [navigate])

  const handleLogout = () => {
    // Clear all user data from localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userPhone')
    localStorage.removeItem('userJoinDate')
    localStorage.removeItem('userBio')
    localStorage.removeItem('userLocation')
    
    // Redirect to home
    navigate('/user/home')
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({ ...userInfo })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({ ...userInfo })
  }

  const handleSave = async () => {
    setSaveLoading(true)
    try {
      // Save to localStorage (can be enhanced with API call)
      localStorage.setItem('userName', editForm.name)
      localStorage.setItem('userPhone', editForm.phone)
      localStorage.setItem('userBio', editForm.bio)
      localStorage.setItem('userLocation', editForm.location)
      
      // Update state
      setUserInfo({ ...editForm })
      setIsEditing(false)
      
      // Show success message
      alert('✅ Profile updated successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('❌ Failed to update profile. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // ...existing code...

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ 
        minHeight: 'calc(100vh - 64px)', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        padding: 'clamp(12px, 3vw, 20px)' 
      }}>
        <div className="container panel" style={{ 
          padding: 0, 
          overflow: 'hidden',
          maxWidth: '100%',
          margin: '0 auto'
        }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          padding: 'clamp(16px, 4vw, 24px)',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'clamp(12px, 3vw, 16px)',
            flexWrap: 'wrap',
            gap: 'clamp(8px, 2vw, 12px)'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(20px, 5vw, 24px)',
              fontWeight: '700'
            }}>
              👤 My Profile
            </h1>
            
            <button
              onClick={isEditing ? handleCancel : handleEdit}
              style={{
                background: isEditing ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
                borderRadius: '8px',
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(2px, 0.5vw, 4px)',
                flex: '0 0 auto'
              }}
            >
              {isEditing ? '✕ Cancel' : '✏️ Edit'}
            </button>
          </div>
          
          {/* Profile Avatar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(12px, 3vw, 16px)',
            flexWrap: 'wrap'
          }}>
            <div style={{
              width: 'clamp(60px, 12vw, 80px)',
              height: 'clamp(60px, 12vw, 80px)',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(24px, 6vw, 32px)',
              flex: '0 0 auto'
            }}>
              👤
            </div>
            <div style={{ flex: '1 1 auto', minWidth: '120px' }}>
              <h2 style={{
                margin: '0 0 clamp(2px, 0.5vw, 4px) 0',
                fontSize: 'clamp(16px, 4vw, 20px)',
                fontWeight: '600'
              }}>
                {userInfo?.name}
              </h2>
              <p style={{
                margin: 0,
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                opacity: 0.9
              }}>
                Rider Member
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
  <div style={{ padding: 'clamp(16px, 4vw, 20px)' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(16px, 4vw, 24px)'
          }}>
            {/* Email */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📧</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email Address
                </span>
              </div>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {userInfo?.email}
                </div>
              )}
            </div>

            {/* Phone */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📱</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Phone Number
                </span>
              </div>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: 'white'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {userInfo?.phone}
                </div>
              )}
            </div>

            {/* Name */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>👤</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Full Name
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: 'white'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {userInfo?.name}
                </div>
              )}
            </div>

            {/* Bio */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📝</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Bio
                </span>
              </div>
              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: 'white',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>
                  {userInfo?.bio}
                </div>
              )}
            </div>

            {/* Location */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📍</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Location
                </span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter your location"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    background: 'white'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '16px',
                  color: '#111827',
                  fontWeight: '500'
                }}>
                  {userInfo?.location}
                </div>
              )}
            </div>

            {/* Join Date */}
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📅</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Member Since
                </span>
              </div>
              <div style={{
                fontSize: '16px',
                color: '#111827',
                fontWeight: '500'
              }}>
                {userInfo?.joinDate}
              </div>
            </div>

            {/* Account Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 'clamp(12px, 3vw, 16px)',
              marginTop: 'clamp(6px, 1.5vw, 8px)'
            }}>
              <div style={{
                padding: '16px',
                background: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#166534',
                  marginBottom: '4px'
                }}>
                  {Math.floor(Math.random() * 50) + 1}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Rides
                </div>
              </div>
              
              <div style={{
                padding: '16px',
                background: '#fef3c7',
                borderRadius: '12px',
                border: '1px solid #fcd34d',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#92400e',
                  marginBottom: '4px'
                }}>
                  ⭐ 4.8
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#92400e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Rating
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'clamp(8px, 2vw, 12px)',
            marginTop: 'clamp(16px, 4vw, 24px)',
            flexWrap: 'wrap'
          }}>
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: saveLoading ? '#9ca3af' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: saveLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {saveLoading ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saveLoading}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: saveLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  ✕ Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🚪 Logout
              </button>
            )}
          </div>

          {/* Logout Button */}
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#dc2626'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ef4444'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default UserProfile
