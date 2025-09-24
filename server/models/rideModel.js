const { Schema, model, Types } = require('mongoose')

const rideSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User' },
    captainId: { type: Types.ObjectId, ref: 'Captain' },
    pickup: { type: String, required: true },
    drop: { type: String, required: true },
    fare: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'ongoing', 'completed', 'rejected'], default: 'pending', index: true },
    // Route polyline as array of { lat, lng }
    route: [{ lat: Number, lng: Number }],
    // distance in meters, duration in seconds
    distance: { type: Number },
    duration: { type: Number },
  // seating
  size: { type: Number, default: 4 },
  occupied: { type: Number, default: 0 },
  // OSRM turn-by-turn steps (array of objects from OSRM 'steps')
  steps: { type: Array },
    pickupCoords: { lat: Number, lng: Number },
    dropCoords: { lat: Number, lng: Number },
  },
  { timestamps: true }
)

module.exports = model('Ride', rideSchema)














