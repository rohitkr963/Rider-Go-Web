const express = require('express')
const router = express.Router()
const AcceptedRide = require('../models/acceptedRideModel')
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'

// POST /api/accepted-rides - Save accepted ride to database
router.post('/', async (req, res) => {
  try {
    console.log('📥 Received accepted ride data:', req.body)
    console.log('🔍 Request headers:', req.headers)
    console.log('🔍 Request method:', req.method)
    
    const {
      rideId,
      userId,
      userEmail,
      passengerCount,
      pickup,
      destination,
      fare,
      distance,
      duration,
      occupied,
      totalSeats,
      status,
      acceptedAt
    } = req.body

    // Validate required fields
    if (!rideId) {
      console.log('❌ Missing rideId')
      return res.status(400).json({ 
        message: 'rideId is required' 
      })
    }

    // No duplicate checking - allow all accepted rides to create separate entries
    console.log('✅ Creating new accepted ride entry for:', rideId)

    // Create new accepted ride with detailed logging
    console.log('🔄 Creating new AcceptedRide document...')
    
    const rideData = {
      rideId,
      captainId: req.body.captainId || req.headers['captain-id'] || 'unknown',
      userId: userId || 'Unknown User',
      userEmail: userEmail || 'user@example.com',
      passengerCount: passengerCount || 1,
      pickup: {
        lat: pickup?.lat || 0,
        lng: pickup?.lng || 0,
        name: pickup?.name || 'Unknown pickup location'
      },
      destination: {
        lat: destination?.lat || 0,
        lng: destination?.lng || 0,
        name: destination?.name || 'Unknown destination'
      },
      fare: fare || 50,
      distance: distance || 0,
      duration: duration || 0,
      occupied: occupied || 1,
      totalSeats: totalSeats || 4,
      status: status || 'accepted',
      acceptedAt: acceptedAt || new Date(),
      createdAt: new Date()
    }
    
    console.log('📋 Ride data to save:', JSON.stringify(rideData, null, 2))
    
    const acceptedRide = new AcceptedRide(rideData)
    console.log('🔄 AcceptedRide model created, attempting to save...')
    
    const savedRide = await acceptedRide.save()
    console.log('✅ Accepted ride saved to database successfully!')
    console.log('📄 Saved ride details:', savedRide)

    res.status(201).json({
      message: 'Accepted ride saved successfully',
      ride: savedRide
    })

  } catch (error) {
    console.error('❌ Error saving accepted ride:', error)
    res.status(500).json({
      message: 'Failed to save accepted ride',
      error: error.message
    })
  }
})

// GET /api/accepted-rides - Get accepted rides for specific captain
router.get('/', async (req, res) => {
  try {
    const { captainId } = req.query
    
    // If captainId not supplied, try to derive it from Authorization token (Bearer <token>)
    if (!captainId) {
      try {
        const auth = req.headers.authorization || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
        if (token) {
          const payload = jwt.verify(token, JWT_SECRET)
          if (payload && payload.role === 'captain' && payload.id) {
            captainId = payload.id
          }
        }
      } catch (e) {
        console.warn('[acceptedRidesRoutes] failed to derive captainId from token:', e && e.message)
      }
    }

    if (!captainId) {
      return res.status(400).json({
        message: 'captainId query parameter is required or a valid captain token must be provided'
      })
    }

    const acceptedRides = await AcceptedRide.find({ captainId })
      .sort({ acceptedAt: -1 })
      .limit(100)

    res.status(200).json({
      message: 'Accepted rides retrieved successfully',
      rides: acceptedRides,
      count: acceptedRides.length
    })

  } catch (error) {
    console.error('❌ Error retrieving accepted rides:', error)
    res.status(500).json({
      message: 'Failed to retrieve accepted rides',
      error: error.message
    })
  }
})

// GET /api/accepted-rides/:rideId - Get specific accepted ride
router.get('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params
    const acceptedRide = await AcceptedRide.findOne({ rideId })

    if (!acceptedRide) {
      return res.status(404).json({
        message: 'Accepted ride not found'
      })
    }

    res.status(200).json({
      message: 'Accepted ride retrieved successfully',
      ride: acceptedRide
    })

  } catch (error) {
    console.error('❌ Error retrieving accepted ride:', error)
    res.status(500).json({
      message: 'Failed to retrieve accepted ride',
      error: error.message
    })
  }
})

// PUT /api/accepted-rides/:rideId - Update accepted ride status
router.put('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params
    const updateData = req.body

    const updatedRide = await AcceptedRide.findOneAndUpdate(
      { rideId },
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!updatedRide) {
      return res.status(404).json({
        message: 'Accepted ride not found'
      })
    }

    console.log('✅ Accepted ride updated:', updatedRide._id)

    res.status(200).json({
      message: 'Accepted ride updated successfully',
      ride: updatedRide
    })

  } catch (error) {
    console.error('❌ Error updating accepted ride:', error)
    res.status(500).json({
      message: 'Failed to update accepted ride',
      error: error.message
    })
  }
})

// DELETE /api/accepted-rides/:rideId - Delete accepted ride when marked complete
router.delete('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params

    const deletedRide = await AcceptedRide.findOneAndDelete({ rideId })

    if (!deletedRide) {
      return res.status(404).json({
        message: 'Accepted ride not found'
      })
    }

    console.log('🗑️ Accepted ride deleted:', deletedRide._id)

    res.status(200).json({
      message: 'Accepted ride deleted successfully',
      ride: deletedRide
    })

  } catch (error) {
    console.error('❌ Error deleting accepted ride:', error)
    res.status(500).json({
      message: 'Failed to delete accepted ride',
      error: error.message
    })
  }
})

module.exports = router
