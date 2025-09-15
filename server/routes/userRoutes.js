const express = require('express')
const router = express.Router()
const { cancelRide, getUserAcceptedRides } = require('../controllers/rideController')

// Get user's accepted rides
router.get('/:userId/accepted-rides', getUserAcceptedRides)

// Cancel a ride
router.post('/ride/:rideId/cancel', cancelRide)

module.exports = router
