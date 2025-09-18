const express = require('express')
const router = express.Router()
const { cancelRide, getUserAcceptedRides } = require('../controllers/rideController')
const { requireUser } = require('../controllers/authController')

// Get user's accepted rides
router.get('/:userId/accepted-rides', getUserAcceptedRides)

// Cancel a ride
router.post('/ride/:rideId/cancel', cancelRide)

// GET /api/user/:userId/notifications - fetch notifications for the user (requires auth)
router.get('/:userId/notifications', requireUser, async (req, res) => {
	try {
		const userIdParam = req.params.userId
		// ensure the authenticated user matches the requested userId
		if (String(req.userId) !== String(userIdParam)) return res.status(403).json({ message: 'Forbidden' })
		const Notification = require('../models/notificationModel')
		const items = await Notification.find({ userId: req.userId }).sort({ timestamp: -1 }).limit(200)
		return res.json({ notifications: items })
	} catch (err) {
		return res.status(500).json({ message: err.message })
	}
})

module.exports = router
