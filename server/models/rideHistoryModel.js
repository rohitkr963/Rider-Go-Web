const mongoose = require('mongoose')

const rideHistorySchema = new mongoose.Schema({
  rideId: {
    type: String,
    required: true,
    index: true
  },
  originalRideId: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  captainId: {
    type: String,
    required: true,
    index: true
  },
  passengerCount: {
    type: Number,
    default: 1,
    min: 1
  },
  pickup: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      default: 'Unknown pickup location'
    }
  },
  destination: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      default: 'Unknown destination'
    }
  },
  fare: {
    type: Number,
    required: true,
    min: 0
  },
  distance: {
    type: Number,
    min: 0
  },
  duration: {
    type: Number,
    min: 0
  },
  occupied: {
    type: Number,
    default: 1,
    min: 1
  },
  totalSeats: {
    type: Number,
    default: 4,
    min: 1
  },
  status: {
    type: String,
    enum: ['completed'],
    default: 'completed'
  },
  acceptedAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Index for efficient queries
rideHistorySchema.index({ captainId: 1, completedAt: -1 })
rideHistorySchema.index({ userId: 1, completedAt: -1 })

// Update the updatedAt field before saving
rideHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('RideHistory', rideHistorySchema)
