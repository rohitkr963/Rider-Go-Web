const express = require('express')
const router = express.Router()
const Notification = require('../models/notificationModel')

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' })
    }

    const notifications = await Notification.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()

    res.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ message: 'Failed to fetch notifications' })
  }
})

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId || req.body.userId

    await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ message: 'Failed to update notification' })
  }
})

// Mark all notifications as read
router.patch('/notifications/mark-all-read', async (req, res) => {
  try {
    const userId = req.userId || req.body.userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' })
    }

    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    res.status(500).json({ message: 'Failed to update notifications' })
  }
})

module.exports = router
