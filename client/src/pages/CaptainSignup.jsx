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
    <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: '80vh' }}>
      <Card sx={{ width: 420 }}>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom>
            Captain Signup
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
              <TextField 
                label="Email" type="email" value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                onBlur={() => checkDuplicate('email', email.trim().toLowerCase())} 
                error={!!fieldError.email} helperText={fieldError.email} required fullWidth 
              />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              <TextField 
                label="Contact (phone)" value={contact} 
                onChange={(e) => setContact(e.target.value)} 
                onBlur={() => checkDuplicate('contact', contact.trim())} 
                error={!!fieldError.contact} helperText={fieldError.contact} required fullWidth 
              />
              <TextField select label="Vehicle Type" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} fullWidth>
                <MenuItem value="Auto">Auto</MenuItem>
                <MenuItem value="Car">Car</MenuItem>
                <MenuItem value="Bike">Bike</MenuItem>
              </TextField>
              <TextField 
                label="Vehicle Number / Registration" value={vehicleNumber} 
                onChange={(e) => setVehicleNumber(e.target.value)} 
                onBlur={() => checkDuplicate('vehicleNumber', vehicleNumber.trim().toUpperCase())} 
                error={!!fieldError.vehicleNumber} helperText={fieldError.vehicleNumber} required fullWidth 
              />
              <TextField 
                label="Total seats" type="number" value={seatingCapacity} 
                onChange={(e) => setSeatingCapacity(e.target.value)} inputProps={{ min: 1, step: 1 }}
                helperText="Enter total passenger seats (e.g., Auto 3, Car 4)" required fullWidth 
              />
              <Button type="submit" variant="contained" disabled={loading}>
                Create account
              </Button>
            </Stack>
          </Box>

          {showOtpBox && (
            <Box mt={2}>
              <Typography variant="body2">OTP (for testing): <strong>{serverOtp}</strong></Typography>
              <Stack direction="row" spacing={1} mt={1}>
                <TextField placeholder="Enter OTP" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} />
                <Button variant="outlined" onClick={verifyOtp} disabled={loading}>Verify OTP</Button>
              </Stack>
            </Box>
          )}

          <Box mt={2}>
            <Link to="/captain/login">Already have an account? Login</Link>
          </Box>
          <Box mt={1}>
            <Link to="/user/login">Login as a user</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
