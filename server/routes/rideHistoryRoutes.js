const express = require('express')
const router = express.Router()
const RideHistory = require('../models/rideHistoryModel')

// POST /api/ride-history - Save completed ride to history
router.post('/', async (req, res) => {
  try {
    console.log('📥 Received ride history data:', req.body)
    
    const {
      rideId,
      originalRideId,
      userId,
      userEmail,
      captainId,
      passengerCount,
      pickup,
      destination,
      fare,
      distance,
      duration,
      occupied,
      totalSeats,
      acceptedAt,
      completedAt
    } = req.body

    // Validate required fields
    if (!rideId || !userId || !captainId) {
      console.log('❌ Missing required fields')
      return res.status(400).json({ 
        message: 'rideId, userId, and captainId are required' 
      })
    }

    // Create new ride history entry
    console.log('🔄 Creating new RideHistory document...')
    
    const rideHistoryData = {
      rideId,
      originalRideId: originalRideId || rideId,
      userId: userId || 'Unknown User',
      userEmail: userEmail || 'user@example.com',
      captainId,
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
      status: 'completed',
      acceptedAt: acceptedAt || new Date(),
      completedAt: completedAt || new Date(),
      createdAt: new Date()
    }
    
    console.log('📋 Ride history data to save:', JSON.stringify(rideHistoryData, null, 2))
    
    const rideHistory = new RideHistory(rideHistoryData)
    console.log('🔄 RideHistory model created, attempting to save...')
    
    const savedRide = await rideHistory.save()
    console.log('✅ Ride history saved to database successfully!')
    console.log('📄 Saved ride history details:', savedRide)

    res.status(201).json({
      message: 'Ride history saved successfully',
      ride: savedRide
    })

  } catch (error) {
    console.error('❌ Error saving ride history:', error)
    res.status(500).json({
      message: 'Failed to save ride history',
      error: error.message
    })
  }
})

// GET /api/ride-history - Get all completed rides for a captain
router.get('/', async (req, res) => {
  try {
    const { captainId } = req.query
    
    let query = {}
    if (captainId) {
      query.captainId = captainId
    }

    const rideHistory = await RideHistory.find(query)
      .sort({ completedAt: -1 })
      .limit(100)

    res.status(200).json({
      message: 'Ride history retrieved successfully',
      rides: rideHistory,
      count: rideHistory.length
    })

  } catch (error) {
    console.error('❌ Error retrieving ride history:', error)
    res.status(500).json({
      message: 'Failed to retrieve ride history',
      error: error.message
    })
  }
})

// GET /api/ride-history/:rideId - Get specific completed ride
router.get('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params
    const rideHistory = await RideHistory.findOne({ rideId })

    if (!rideHistory) {
      return res.status(404).json({
        message: 'Ride history not found'
      })
    }

    res.status(200).json({
      message: 'Ride history retrieved successfully',
      ride: rideHistory
    })

  } catch (error) {
    console.error('❌ Error retrieving ride history:', error)
    res.status(500).json({
      message: 'Failed to retrieve ride history',
      error: error.message
    })
  }
})

// GET /api/ride-history/captain/:captainId - Get ride history for specific captain
router.get('/captain/:captainId', async (req, res) => {
  try {
    const { captainId } = req.params
    const { limit = 50, offset = 0 } = req.query

    const rideHistory = await RideHistory.find({ captainId })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))

    const totalCount = await RideHistory.countDocuments({ captainId })

    res.status(200).json({
      message: 'Captain ride history retrieved successfully',
      rides: rideHistory,
      count: rideHistory.length,
      total: totalCount,
      hasMore: (parseInt(offset) + rideHistory.length) < totalCount
    })

  } catch (error) {
    console.error('❌ Error retrieving captain ride history:', error)
    res.status(500).json({
      message: 'Failed to retrieve captain ride history',
      error: error.message
    })
  }
})

// DELETE /api/ride-history/:rideId - Delete ride history (admin only)
router.delete('/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params

    const deletedRide = await RideHistory.findOneAndDelete({ rideId })

    if (!deletedRide) {
      return res.status(404).json({
        message: 'Ride history not found'
      })
    }

    console.log('🗑️ Ride history deleted:', deletedRide._id)

    res.status(200).json({
      message: 'Ride history deleted successfully',
      ride: deletedRide
    })

  } catch (error) {
    console.error('❌ Error deleting ride history:', error)
    res.status(500).json({
      message: 'Failed to delete ride history',
      error: error.message
    })
  }
})

module.exports = router
