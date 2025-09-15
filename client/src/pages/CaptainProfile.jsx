import React from 'react'

export default function CaptainProfile() {
  const container = { maxWidth: 800, margin: '0 auto', padding: 24 }
  const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }
  const [profile, setProfile] = React.useState(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('captain_token') || localStorage.getItem('token')
        const res = await fetch('http://localhost:3000/api/auth/captain/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (res.ok) setProfile(data.profile)
        else setError(data.message || 'Failed to load profile')
      } catch (e) {
        setError('Failed to load profile')
      }
    }
    load()
  }, [])

  const Info = ({ label, value }) => (
    
    <div><strong>{label}:</strong> {value ?? '-'}</div>
  )

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={container}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Captain Profile</h2>
        <div style={card}>
          {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}
          {!profile && !error && <div>Loading...</div>}
          {profile && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <img alt="avatar" src={profile.profilePicture || 'https://i.pravatar.cc/100?img=12'} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>{profile.name}</div>
                  <div style={{ color: '#6b7280' }}>{profile.email}</div>
                  {profile.experienceYears ? (
                    <div style={{ color: '#111', fontSize: 12 }}>{profile.experienceYears} yrs experience</div>
                  ) : profile.experienceTagline ? (
                    <div style={{ color: '#111', fontSize: 12 }}>{profile.experienceTagline}</div>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <Info label="Vehicle Type" value={profile.vehicleType} />
                <Info label="Vehicle Number" value={profile.vehicleNumber} />
                <Info label="Vehicle Model" value={profile.vehicleModel} />
                <Info label="Seating Capacity" value={profile.seatingCapacity} />
                <Info label="Completed Rides" value={profile.ridesCompleted} />
                <Info label="Rating" value={`⭐ ${profile.rating}`} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


