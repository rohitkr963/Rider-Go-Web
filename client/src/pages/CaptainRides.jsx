import React from 'react'

export default function CaptainRides() {
  const section = { 
    background: '#fff', 
    border: '1px solid #e5e7eb', 
    borderRadius: 12, 
    padding: 'clamp(12px, 3vw, 16px)' 
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
        <h2 style={{ 
          fontSize: 'clamp(24px, 6vw, 28px)', 
          fontWeight: 800, 
          marginBottom: 'clamp(8px, 2vw, 12px)' 
        }}>
          My Rides
        </h2>
        <div className="ride-card card-anim" style={section}>
          <div style={{ 
            color: '#6b7280',
            fontSize: 'clamp(14px, 3vw, 16px)',
            lineHeight: 1.5
          }}>
            No rides loaded. This is a placeholder page – integrate backend to list past and upcoming rides.
          </div>
        </div>
      </div>
    </div>
  )
}



