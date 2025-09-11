import React from 'react'

export default function CaptainRides() {
  const section = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }
  const container = { maxWidth: 1200, margin: '0 auto', padding: '24px' }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={container}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>My Rides</h2>
        <div style={section}>
          <div style={{ color: '#6b7280' }}>No rides loaded. This is a placeholder page – integrate backend to list past and upcoming rides.</div>
        </div>
      </div>
    </div>
  )
}



