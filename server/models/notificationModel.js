const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  rideId: { type: String },
  data: { type: Object },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('Notification', NotificationSchema)
