import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

export default function CaptainLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/captain/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      console.log('captain login response', res.status, data)
      if (!res.ok) throw new Error(data?.message || 'Login failed')
      if (data?.token) {
        localStorage.setItem('captain_token', data.token)
      }
      navigate('/captain/home')
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
          <Typography variant="h5" gutterBottom>Captain Login</Typography>
          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              <Button type="submit" variant="contained" disabled={loading}>Login</Button>
            </Stack>
          </Box>
          <Box mt={2}>
            <Link to="/captain/signup">New captain? Create account</Link>
          </Box>
          <Box mt={1}>
            <Link to="/user/login">Login as a user</Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
