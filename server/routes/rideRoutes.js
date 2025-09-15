const { Router } = require('express')
const { requireCaptain } = require('../controllers/authController')
const { requestRide, acceptRide, rejectRide, completeRide, captainEarnings, planRide, getRide, updateOccupancy } = require('../controllers/rideController')

const router = Router()

// Public: user requests a ride
router.post('/ride/request', requestRide)

// Plan a route (returns polyline + rideId)
router.post('/ride/plan', planRide)

// Get ride details
router.get('/ride/:id', getRide)

// Captain-protected routes
router.post('/ride/accept', requireCaptain, acceptRide)
router.post('/ride/reject', requireCaptain, rejectRide)
router.post('/ride/complete', requireCaptain, completeRide)
router.get('/captain/earnings', requireCaptain, captainEarnings)

// Captain updates occupancy for a ride
router.patch('/ride/:id/occupancy', requireCaptain, updateOccupancy)

// User books a seat in a ride
router.post('/ride/:id/book', require('../controllers/rideController').bookRide)

module.exports = router








