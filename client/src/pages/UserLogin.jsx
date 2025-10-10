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
      const res = await fetch('http://localhost:3000/api/auth/user/login', {
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
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      sx={{ 
        minHeight: '70vh',
        padding: 'clamp(16px, 4vw, 24px)'
      }}
    >
      <Card sx={{ 
        width: '100%',
        maxWidth: 420,
        margin: '0 auto'
      }}>
        <CardContent sx={{ padding: 'clamp(16px, 4vw, 24px)' }}>
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{ 
              fontSize: 'clamp(20px, 5vw, 24px)',
              textAlign: 'center',
              marginBottom: 'clamp(16px, 4vw, 24px)'
            }}
          >
            User Login
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField 
                label="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                fullWidth 
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              />
              <TextField 
                label="Password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                fullWidth 
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading}
                sx={{
                  padding: 'clamp(10px, 2.5vw, 12px)',
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  fontWeight: 600
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Stack>
          </Box>
          <Box mt={2} sx={{ textAlign: 'center' }}>
            <Link 
              to="/user/signup"
              style={{ 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: '#3b82f6',
                textDecoration: 'none'
              }}
            >
              New here? Create account
            </Link>
          </Box>
          <Box mt={1} sx={{ textAlign: 'center' }}>
            <Link 
              to="/captain/login"
              style={{ 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: '#6b7280',
                textDecoration: 'none'
              }}
            >
              Login as a captain
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}


