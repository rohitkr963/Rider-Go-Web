import React from 'react'
import { Link } from 'react-router-dom'

export default function CaptainEarnings() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Captain Earnings</h2>
      <p>This is a placeholder for the earnings page. Add charts and data here.</p>
      <Link to="/captain/home">Back to home</Link>
    </div>
  )
}
