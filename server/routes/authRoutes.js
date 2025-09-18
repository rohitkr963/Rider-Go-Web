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
    const captain = await Captain.findById(req.captainId).select('-password -otp -otpExpires')
    
    if (!captain) {
      return res.status(404).json({ error: 'Captain not found' })
    }
    // compute rating aggregate (average + count) from Rating collection
    try {
      const Rating = require('../models/ratingModel')
      const mongoose = require('mongoose')
      const captainObjId = mongoose.Types.ObjectId(String(captain._id))

      // Targeted dedupe pass for this captain to remove historical duplicate rating docs
      try {
        const dupGroups = await Rating.aggregate([
          { $match: { captainId: captainObjId } },
          { $project: { userIdStr: { $toString: '$userId' }, createdAt: 1 } },
          { $group: { _id: '$userIdStr', items: { $push: { id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
          { $match: { count: { $gt: 1 } } }
        ])
        if (dupGroups && dupGroups.length > 0) {
          for (const g of dupGroups) {
            const items = (g.items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            const keep = items[0] && items[0].id
            const remove = items.slice(1).map(x => x.id)
            if (remove.length > 0) {
              try { await Rating.deleteMany({ _id: { $in: remove } }) } catch (remErr) { console.warn('Failed to remove duplicate rating docs during captain profile load', remErr) }
            }
          }
        }
      } catch (dedupeErr) { console.warn('Dedupe during captain profile failed', dedupeErr) }

      const agg = await Rating.aggregate([
        { $match: { captainId: captainObjId } },
        { $group: { _id: '$captainId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
      const averageRating = (agg[0] && agg[0].avg) ? Number(agg[0].avg.toFixed(2)) : (typeof captain.rating === 'number' ? captain.rating : 0)
      const ratingCount = (agg[0] && agg[0].count) ? agg[0].count : 0

      const enhanced = {
        ...captain.toObject(),
        averageRating,
        ratingCount,
        // keep legacy `rating` field in sync
        rating: averageRating
      }

      return res.json({ success: true, profile: enhanced, id: captain._id })
    } catch (e) {
      console.warn('Failed to aggregate ratings for captain profile', e)
      return res.json({ success: true, profile: captain, id: captain._id })
    }
  } catch (error) {
    console.error('❌ Error fetching captain profile:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/captain/:captainId/profile - Get captain profile
router.get('/captain/:captainId/profile', async (req, res) => {
  try {
    const Captain = require('../models/captainModel')
    const { captainId } = req.params
    
    console.log('🔍 Fetching captain profile for ID:', captainId)
    
    let captain
    try {
      // Check if captainId is a valid MongoDB ObjectId (24 characters hexadecimal)
      if (captainId.length === 24 && /^[0-9a-fA-F]{24}$/.test(captainId)) {
        // Try to find by MongoDB _id
        captain = await Captain.findById(captainId).select('-password -otp -otpExpires')
      } else {
        // Try to find by custom captain ID or email
        captain = await Captain.findOne({
          $or: [
            { captainId: captainId },
            { email: captainId },
            { contact: captainId }
          ]
        }).select('-password -otp -otpExpires')
      }
    } catch (err) {
      console.warn('Error querying captain:', err.message)
      return res.status(400).json({ 
        error: 'Invalid captain ID',
        message: err.message 
      })
    }
    
    if (!captain) {
      console.log('❌ Captain not found for ID:', captainId)
      return res.status(404).json({ 
        error: 'Captain not found',
        message: 'No captain found with the provided ID' 
      })
    }
    
    console.log('✅ Captain found:', captain.name)
    
    // Enhance captain data with computed fields
    const enhancedProfile = {
      ...captain.toObject(),
      totalRides: captain.ridesCompleted || 0,
      phone: captain.contact,
      // Ensure rating is always a number
      rating: typeof captain.rating === 'number' ? captain.rating : 4.8
    }

    // To protect against historical duplicate rating documents that can inflate counts
    // perform a targeted dedupe pass for this captain only, then compute aggregates.
    try {
      const Rating = require('../models/ratingModel')
      const mongoose = require('mongoose')
      const captainObjId = mongoose.Types.ObjectId(String(captain._id))

      // Find duplicate groups for this captain (grouped by userId string) and remove older duplicates
      const dupGroups = await Rating.aggregate([
        { $match: { captainId: captainObjId } },
        { $project: { userIdStr: { $toString: '$userId' }, createdAt: 1 } },
        { $group: { _id: '$userIdStr', items: { $push: { id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])

      if (dupGroups && dupGroups.length > 0) {
        for (const g of dupGroups) {
          const items = (g.items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          const keep = items[0] && items[0].id
          const remove = items.slice(1).map(x => x.id)
          if (remove.length > 0) {
            try {
              await Rating.deleteMany({ _id: { $in: remove } })
              console.log('\ud83d\uddf9 Removed duplicate rating docs for captain', String(captain._id), 'user', g._id, 'removed:', remove.length)
            } catch (remErr) { console.warn('Failed to remove duplicate rating docs during profile load', remErr) }
          }
        }
      }

      // Now compute aggregated rating values
      const agg = await Rating.aggregate([
        { $match: { captainId: captainObjId } },
        { $group: { _id: '$captainId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
      enhancedProfile.averageRating = (agg[0] && agg[0].avg) ? Number(agg[0].avg.toFixed(2)) : enhancedProfile.rating
      enhancedProfile.ratingCount = (agg[0] && agg[0].count) ? agg[0].count : 0
      // keep legacy `rating` field in sync
      enhancedProfile.rating = enhancedProfile.averageRating
    } catch (e) {
      console.warn('Failed to compute rating aggregate for public profile', e)
      enhancedProfile.averageRating = enhancedProfile.rating
      enhancedProfile.ratingCount = enhancedProfile.ratingCount || 0
    }

    return res.json({ profile: enhancedProfile })
  } catch (error) {
    console.error('❌ Error fetching captain profile:', error)
    return res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/captain/:captainId/rate - submit or update rating (USER only)
const { submitRating } = require('../controllers/ratingController')
const { requireUser } = require('../controllers/authController')
router.post('/captain/:captainId/rate', requireUser, submitRating)

// GET user's rating for captain (requires auth)
const Rating = require('../models/ratingModel')
router.get('/captain/:captainId/my-rating', requireUser, async (req, res) => {
  try {
    const userId = req.userId
    const { captainId } = req.params
    const r = await Rating.findOne({ captainId, userId })
    return res.json({ myRating: r ? r.rating : null })
  } catch (e) {
    return res.status(500).json({ message: e.message })
  }
})

// Check duplicate fields for captain signup (email/contact/vehicleNumber)
router.get('/captain/check', require('../controllers/authController').checkCaptainExists)

// PUT /api/auth/captain/profile - Update captain profile
router.put('/captain/profile', require('../controllers/authController').requireCaptain, async (req, res) => {
  try {
    const Captain = require('../models/captainModel')
    const captainId = req.captainId
    
    console.log('🔄 Updating captain profile for ID:', captainId)
    
    const {
      name,
      email,
      contact,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      seatingCapacity,
      experienceYears,
      experienceTagline
    } = req.body
    
    // Validate required fields
    if (!name || !email || !contact) {
      return res.status(400).json({ message: 'Name, email, and contact are required' })
    }
    
    // Check for duplicate email/contact/vehicleNumber (excluding current captain)
    const duplicateCheck = await Captain.findOne({
      $and: [
        { _id: { $ne: captainId } },
        {
          $or: [
            { email: email },
            { contact: contact },
            { vehicleNumber: vehicleNumber }
          ]
        }
      ]
    })
    
    if (duplicateCheck) {
      if (duplicateCheck.email === email) {
        return res.status(400).json({ message: 'Email already exists' })
      }
      if (duplicateCheck.contact === contact) {
        return res.status(400).json({ message: 'Contact number already exists' })
      }
      if (duplicateCheck.vehicleNumber === vehicleNumber) {
        return res.status(400).json({ message: 'Vehicle number already exists' })
      }
    }
    
    // Update captain profile
    const updatedCaptain = await Captain.findByIdAndUpdate(
      captainId,
      {
        name,
        email,
        contact,
        vehicleType,
        vehicleNumber,
        vehicleModel,
        seatingCapacity: parseInt(seatingCapacity) || 4,
        experienceYears: parseInt(experienceYears) || 0,
        experienceTagline
      },
      { new: true, runValidators: true }
    ).select('-password -otp -otpExpires')
    
    if (!updatedCaptain) {
      return res.status(404).json({ message: 'Captain not found' })
    }
    
    console.log('✅ Captain profile updated successfully:', updatedCaptain.name)
    // Emit profile update to interested sockets (if socket.io is available)
    try {
      const io = req.app && req.app.locals && req.app.locals.io
      if (io) {
        io.emit('captain:profile-updated', { captainId, profile: updatedCaptain })
        console.log('📣 Emitted captain:profile-updated for', captainId)
      }
    } catch (emitErr) {
      console.warn('Failed to emit captain:profile-updated', emitErr)
    }

    return res.json({ 
      message: 'Profile updated successfully',
      profile: updatedCaptain 
    })
  } catch (error) {
    console.error('❌ Error updating captain profile:', error)
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({ message: `${field} already exists` })
    }
    return res.status(500).json({ message: error.message })
  }
})

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
