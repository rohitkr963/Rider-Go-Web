import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function UserSignup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const BACKEND_URL = 'http://localhost:3000/api' // <-- yahan backend URL

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      }

      const res = await fetch(`${BACKEND_URL}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('signup response', res.status, data)
      if (!res.ok) throw new Error(data?.message || 'Signup failed')

      // signup success, navigate to user home
      navigate('/user/home')
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
          <Typography variant="h5" gutterBottom>User Signup</Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              <Button type="submit" variant="contained" disabled={loading}>Create account</Button>
            </Stack>
          </Box>
          <Box mt={2}>
            <Link to="/user/login">Already have an account? Login</Link>
          </Box>
          <Box mt={1}>
            <Link to="/captain/login">Login as a captain</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
