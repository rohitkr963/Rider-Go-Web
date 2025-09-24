import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function UserLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
      const res = await fetch(`${BACKEND}/api/auth/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      console.log('login response', res.status, data)
      if (!res.ok) throw new Error(data?.message || 'Login failed')
      
      // Store token and user info in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userId', data.user?.id || data.user?._id || data.userId)
        localStorage.setItem('userEmail', email)
        localStorage.setItem('userName', data.user?.name || 'User')
        localStorage.setItem('userPhone', data.user?.phone || 'Not provided')
        localStorage.setItem('userJoinDate', new Date().toLocaleDateString())
        console.log('✅ User login successful, userId stored:', data.user?.id || data.user?._id || data.userId)
      }
      
      // Force page reload to update UserHome state
      window.location.href = '/user/home'
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: '70vh' }}>
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>User Login</Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              <Button type="submit" variant="contained" disabled={loading}>Login</Button>
            </Stack>
          </Box>
          <Box mt={2}>
            <Link to="/user/signup">New here? Create account</Link>
          </Box>
          <Box mt={1}>
            <Link to="/captain/login">Login as a captain</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}


