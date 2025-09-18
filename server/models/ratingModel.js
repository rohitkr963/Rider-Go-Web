const { Schema, model } = require('mongoose')

const ratingSchema = new Schema({
  captainId: { type: Schema.Types.ObjectId, ref: 'Captain', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 }
}, { timestamps: true })

module.exports = model('Rating', ratingSchema)
