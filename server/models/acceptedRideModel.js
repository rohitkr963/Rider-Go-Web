const mongoose = require('mongoose')

const acceptedRideSchema = new mongoose.Schema({
  rideId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalRideId: {
    type: String,
    required: true,
    index: true
  },
  captainId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  passengerCount: {
    type: Number,
    required: true,
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
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  occupied: {
    type: Number,
    required: true,
    default: 0
  },
  totalSeats: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'accepted'
  },
  acceptedAt: {
    type: Date,
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
}, {
  timestamps: true
})

// Index for efficient queries
acceptedRideSchema.index({ rideId: 1 })
acceptedRideSchema.index({ captainId: 1 })
acceptedRideSchema.index({ userId: 1 })
acceptedRideSchema.index({ status: 1 })
acceptedRideSchema.index({ acceptedAt: -1 })

const AcceptedRide = mongoose.model('AcceptedRide', acceptedRideSchema)

module.exports = AcceptedRide
