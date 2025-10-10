import React from 'react'
import { Link } from 'react-router-dom'

export default function CaptainEarnings() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="container" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
        <div className="ride-card card-anim" style={{ 
          padding: 'clamp(16px, 4vw, 24px)',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12
        }}>
          <h2 style={{ 
            fontSize: 'clamp(24px, 6vw, 28px)', 
            fontWeight: 800, 
            marginBottom: 'clamp(12px, 3vw, 16px)',
            color: '#111'
          }}>
            Captain Earnings
          </h2>
          <p style={{ 
            color: '#6b7280',
            fontSize: 'clamp(14px, 3vw, 16px)',
            lineHeight: 1.5,
            marginBottom: 'clamp(16px, 4vw, 24px)'
          }}>
            This is a placeholder for the earnings page. Add charts and data here.
          </p>
          <Link 
            to="/captain/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 20px)',
              background: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: 'clamp(14px, 3vw, 16px)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#2563eb'
              e.target.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#3b82f6'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
