const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const Captain = require('../models/captainModel')

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

exports.userSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ message: 'User exists' })
    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashed })
    const token = signToken({ id: user._id, role: 'user' })
    return res.json({ message: 'Signup success', token })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken({ id: user._id, role: 'user' })
    return res.json({ 
      message: 'Login success', 
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.captainSignup = async (req, res) => {
  try {
    const { name, email, password, contact, vehicleType, vehicleNumber, vehicleModel, seatingCapacity, profilePicture, experienceYears, experienceTagline } = req.body
    if (!name || !email || !password || !contact || !vehicleType || !vehicleNumber)
      return res.status(400).json({ message: 'Missing fields' })

    // Normalize inputs to avoid duplicate mismatches due to case/spacing
    const normEmail = String(email).trim().toLowerCase()
    const normVehicleNumber = String(vehicleNumber).trim().toUpperCase()
    const normContact = String(contact).trim()

    const exists = await Captain.findOne({ $or: [{ email: normEmail }, { vehicleNumber: normVehicleNumber }, { contact: normContact }] })
    if (exists) {
      // determine which field conflicts to give clearer feedback
      let conflict = 'unknown'
      if (String(exists.email).toLowerCase() === normEmail) conflict = 'email'
      else if (String(exists.vehicleNumber).toUpperCase() === normVehicleNumber) conflict = 'vehicleNumber'
      else if (String(exists.contact) === normContact) conflict = 'contact'
      return res.status(409).json({ message: 'Captain with provided email/contact/vehicle exists', field: conflict })
    }
    const hashed = await bcrypt.hash(password, 10)
    // generate a simple numeric 6-digit OTP for verification (no SMS send in this repo)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  const captain = await Captain.create({ name, email: normEmail, password: hashed, contact: normContact, vehicleType, vehicleNumber: normVehicleNumber, vehicleModel, seatingCapacity, profilePicture, experienceYears, experienceTagline, otp, otpExpires, contactVerified: false })
    // return token but require OTP verification to mark contactVerified; token can still be issued if desired
    const token = signToken({ id: captain._id, role: 'captain' })
    return res.json({ message: 'Signup success - verify OTP sent to contact', token, otp })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.verifyCaptainOtp = async (req, res) => {
  try {
    const { contact, otp } = req.body
    if (!contact || !otp) return res.status(400).json({ message: 'Missing contact or otp' })
    const captain = await Captain.findOne({ contact })
    if (!captain) return res.status(404).json({ message: 'Captain not found' })
    if (captain.contactVerified) return res.json({ message: 'Contact already verified' })
    if (String(captain.otp) !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' })
    if (captain.otpExpires && captain.otpExpires < new Date()) return res.status(400).json({ message: 'OTP expired' })
    captain.contactVerified = true
    captain.otp = undefined
    captain.otpExpires = undefined
    await captain.save()
    return res.json({ message: 'Contact verified' })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.captainLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    const captain = await Captain.findOne({ email })
    if (!captain) return res.status(401).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, captain.password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = signToken({ id: captain._id, role: 'captain' })
    return res.json({ message: 'Login success', token })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// GET /api/captain/check?email=..&contact=..&vehicleNumber=..
exports.checkCaptainExists = async (req, res) => {
  try {
    const { email, contact, vehicleNumber } = req.query
    const normEmail = email ? String(email).trim().toLowerCase() : null
    const normContact = contact ? String(contact).trim() : null
    const normVehicle = vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : null

    const queryParts = []
    if (normEmail) queryParts.push({ email: normEmail })
    if (normContact) queryParts.push({ contact: normContact })
    if (normVehicle) queryParts.push({ vehicleNumber: normVehicle })

    if (queryParts.length === 0) return res.json({ exists: false })

    const exists = await Captain.findOne({ $or: queryParts })
    if (!exists) return res.json({ exists: false })

    let field = 'unknown'
    if (normEmail && String(exists.email).toLowerCase() === normEmail) field = 'email'
    else if (normVehicle && String(exists.vehicleNumber).toUpperCase() === normVehicle) field = 'vehicleNumber'
    else if (normContact && String(exists.contact) === normContact) field = 'contact'

    return res.json({ exists: true, field })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// Auth middleware for captain
exports.requireCaptain = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: 'Missing token' })
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.role !== 'captain') return res.status(403).json({ message: 'Forbidden' })
    req.captainId = payload.id
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// Auth middleware for regular users
exports.requireUser = async (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: 'Missing token' })
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.role !== 'user') return res.status(403).json({ message: 'Forbidden' })
    req.userId = payload.id
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// PATCH /api/captain/status { status }
exports.updateCaptainStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!['online', 'offline'].includes(status)) return res.status(400).json({ message: 'Invalid status' })
    const captain = await Captain.findByIdAndUpdate(
      req.captainId,
      { status },
      { new: true }
    )
    return res.json({ message: 'Status updated', status: captain.status })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// PATCH /api/captain/location { lat, lng }
exports.updateCaptainLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body
    if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ message: 'Invalid coords' })
    await Captain.findByIdAndUpdate(req.captainId, { currentLocation: { lat, lng, updatedAt: new Date() } })
    return res.json({ message: 'Location updated' })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}