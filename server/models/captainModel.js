const { Schema, model } = require('mongoose')

const captainSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    contact: { type: String, required: true, index: true },
    contactVerified: { type: Boolean, default: false },
    vehicleType: { type: String, enum: ['Auto', 'Cab', 'Car', 'Bike'], required: true },
    vehicleNumber: { type: String, required: true, unique: true, index: true },
    vehicleModel: { type: String },
    seatingCapacity: { type: Number },
    profilePicture: { type: String },
    otp: { type: String },
    otpExpires: { type: Date },
    status: { type: String, enum: ['online', 'offline'], default: 'offline', index: true },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    earnings: { type: Number, default: 0 },
    ridesCompleted: { type: Number, default: 0 },
    experienceYears: { type: Number },
    experienceTagline: { type: String },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
)

module.exports = model('Captain', captainSchema)
