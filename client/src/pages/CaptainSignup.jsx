import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'

export default function CaptainSignup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [contact, setContact] = useState('')
  const [vehicleType, setVehicleType] = useState('Auto')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [seatingCapacity, setSeatingCapacity] = useState('')
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [serverOtp, setServerOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldError, setFieldError] = useState({ email: '', contact: '', vehicleNumber: '' })

  const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000') + '/api'

  const checkDuplicate = async (type, value) => {
    try {
      if (!value) return
      const q = new URLSearchParams({ [type]: value }).toString()
      const res = await fetch(`${BACKEND_URL}/captain/check?${q}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.exists && data.field === type) {
        setFieldError(prev => ({ ...prev, [type]: `${type} already in use` }))
      } else {
        setFieldError(prev => ({ ...prev, [type]: '' }))
      }
    } catch (err) {
      console.warn('duplicate check failed', err)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        contact: contact.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        seatingCapacity: seatingCapacity === '' ? undefined : Number(seatingCapacity)
      }

      const res = await fetch(`${BACKEND_URL}/captain/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      console.log('captain signup response', res.status, data)
      if (!res.ok) {
        const field = data?.field ? ` (field: ${data.field})` : ''
        throw new Error((data?.message || 'Signup failed') + field)
      }
      setServerOtp(data?.otp || '')
      setShowOtpBox(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/captain/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, otp: enteredOtp }),
      })
      const data = await res.json()
      console.log('verify otp response', res.status, data)
      if (!res.ok) throw new Error(data?.message || 'OTP verify failed')
      alert('Phone verified — signup complete')
      navigate('/captain/home')
    } catch (err) {
      console.warn('verify otp failed', err)
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
        minHeight: '80vh',
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
            component="div" 
            gutterBottom
            sx={{ 
              fontSize: 'clamp(20px, 5vw, 24px)',
              textAlign: 'center',
              marginBottom: 'clamp(16px, 4vw, 24px)'
            }}
          >
            Captain Signup
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField 
                label="Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                fullWidth 
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              />
              <TextField 
                label="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onBlur={() => checkDuplicate('email', email.trim().toLowerCase())} 
                error={!!fieldError.email} 
                helperText={fieldError.email} 
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
              <TextField 
                label="Contact (phone)" 
                value={contact} 
                onChange={(e) => setContact(e.target.value)} 
                onBlur={() => checkDuplicate('contact', contact.trim())} 
                error={!!fieldError.contact} 
                helperText={fieldError.contact} 
                required 
                fullWidth 
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              />
              <TextField 
                select 
                label="Vehicle Type" 
                value={vehicleType} 
                onChange={(e) => setVehicleType(e.target.value)} 
                fullWidth
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              >
                <MenuItem value="Auto">Auto</MenuItem>
                <MenuItem value="Car">Car</MenuItem>
                <MenuItem value="Bike">Bike</MenuItem>
              </TextField>
              <TextField 
                label="Vehicle Number / Registration" 
                value={vehicleNumber} 
                onChange={(e) => setVehicleNumber(e.target.value)} 
                onBlur={() => checkDuplicate('vehicleNumber', vehicleNumber.trim().toUpperCase())} 
                error={!!fieldError.vehicleNumber} 
                helperText={fieldError.vehicleNumber} 
                required 
                fullWidth 
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: 'clamp(14px, 3vw, 16px)'
                  }
                }}
              />
              <TextField 
                label="Total seats" 
                type="number" 
                value={seatingCapacity} 
                onChange={(e) => setSeatingCapacity(e.target.value)} 
                inputProps={{ min: 1, step: 1 }}
                helperText="Enter total passenger seats (e.g., Auto 3, Car 4)" 
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
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </Stack>
          </Box>

          {showOtpBox && (
            <Box mt={2}>
              <Typography 
                variant="body2"
                sx={{ 
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  marginBottom: 'clamp(8px, 2vw, 12px)'
                }}
              >
                OTP (for testing): <strong>{serverOtp}</strong>
              </Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <TextField 
                  placeholder="Enter OTP" 
                  value={enteredOtp} 
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: 'clamp(14px, 3vw, 16px)'
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={verifyOtp} 
                  disabled={loading}
                  sx={{
                    padding: 'clamp(8px, 2vw, 10px)',
                    fontSize: 'clamp(12px, 2.5vw, 14px)',
                    fontWeight: 600
                  }}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </Stack>
            </Box>
          )}

          <Box mt={2} sx={{ textAlign: 'center' }}>
            <Link 
              to="/captain/login"
              style={{ 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: '#3b82f6',
                textDecoration: 'none'
              }}
            >
              Already have an account? Login
            </Link>
          </Box>
          <Box mt={1} sx={{ textAlign: 'center' }}>
            <Link 
              to="/user/login"
              style={{ 
                fontSize: 'clamp(12px, 2.5vw, 14px)',
                color: '#6b7280',
                textDecoration: 'none'
              }}
            >
              Login as a user
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
