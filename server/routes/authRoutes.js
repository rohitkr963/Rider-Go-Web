const { Router } = require('express')
const {
  userSignup,
  userLogin,
  captainSignup,
  captainLogin,
  verifyCaptainOtp,
  requireCaptain,
  updateCaptainStatus,
  updateCaptainLocation,
} = require('../controllers/authController')

const router = Router()

// User
router.post('/user/signup', userSignup)
router.post('/user/login', userLogin)

// Captain
router.post('/captain/signup', captainSignup)
router.post('/captain/login', captainLogin)
router.post('/captain/verify-otp', verifyCaptainOtp)
router.patch('/captain/status', requireCaptain, updateCaptainStatus)
router.patch('/captain/location', requireCaptain, updateCaptainLocation)
// Get captain profile
router.get('/captain/profile', requireCaptain, async (req, res) => {
  try {
    const Captain = require('../models/captainModel')
    const c = await Captain.findById(req.captainId).select('-password -otp -otpExpires')
    if (!c) return res.status(404).json({ message: 'Captain not found' })
    return res.json({ profile: c })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

// Check duplicate fields for captain signup (email/contact/vehicleNumber)
router.get('/captain/check', require('../controllers/authController').checkCaptainExists)

// Get captain seating capacity by captain ID (public endpoint)
router.get('/captain/:captainId/seating', async (req, res) => {
  try {
    const { captainId } = req.params
    const Captain = require('../models/captainModel')
    const captain = await Captain.findById(captainId).select('seatingCapacity name')
    if (!captain) return res.status(404).json({ message: 'Captain not found' })
    return res.json({ 
      seatingCapacity: captain.seatingCapacity || 4,
      captainName: captain.name 
    })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

module.exports = router


