const Rating = require('../models/ratingModel')
const Captain = require('../models/captainModel')
const mongoose = require('mongoose')

// Submit or update a rating for a captain by a user
exports.submitRating = async (req, res) => {
  try {
    const { captainId } = req.params
  const userId = req.userId || null // require authenticated user for ratings
  if (!userId) return res.status(401).json({ message: 'Authentication required to rate' })
    const { rating } = req.body

    console.log('➡️ submitRating called', { captainId, userId, rating })

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 1 and 5' })
    }

    // Validate captainId to avoid Mongoose CastError
    if (!captainId || !mongoose.Types.ObjectId.isValid(captainId)) {
      return res.status(400).json({ message: 'Invalid captain id' })
    }

    // Prepare ObjectId typed ids for queries (use `new` constructor)
    const captainObjId = new mongoose.Types.ObjectId(captainId)
    let userObjId = null
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
      userObjId = new mongoose.Types.ObjectId(String(userId))
    }

    // Ensure captain exists before saving a rating
    const captainExists = await Captain.findById(captainId).select('_id')
    if (!captainExists) {
      return res.status(404).json({ message: 'Captain not found' })
    }

    // Idempotent upsert: match existing rating for this user by ObjectId or by string (covers older records)
    let savedDoc = null
    try {
      const userMatches = []
      if (userObjId) userMatches.push({ userId: userObjId })
      userMatches.push({ userId: String(userId) })

      const filter = { captainId: captainObjId, $or: userMatches }
      const update = { $set: { rating, userId: userObjId, captainId: captainObjId } }
      // Use findOneAndUpdate with upsert to ensure single document per user+captain
      savedDoc = await Rating.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true }).lean()

      // Remove any duplicate docs for same user/captain that may exist (keep the upserted one)
      try {
        await Rating.deleteMany({ captainId: captainObjId, $or: userMatches, _id: { $ne: savedDoc._id } })
      } catch (delErr) {
        console.warn('Failed to cleanup duplicate rating docs:', delErr)
      }
    } catch (upsertErr) {
      console.error('❌ Failed to upsert rating:', upsertErr)
      return res.status(500).json({ message: 'Failed to save rating', error: String(upsertErr && upsertErr.message) })
    }

    // Deduplicate any existing rating documents for the same captain+user combination
    try {
      // Aggregate groups by stringified captainId and userId where count > 1
      const dupGroups = await Rating.aggregate([
        { $project: { captainIdStr: { $toString: '$captainId' }, userIdStr: { $toString: '$userId' }, createdAt: 1 } },
        { $group: { _id: { captainIdStr: '$captainIdStr', userIdStr: '$userIdStr' }, items: { $push: { id: '$_id', createdAt: '$createdAt' } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])
      if (dupGroups && dupGroups.length > 0) {
        for (const g of dupGroups) {
          const items = (g.items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          const keep = items[0] && items[0].id
          const remove = items.slice(1).map(x => x.id)
          if (remove.length > 0) {
            try {
              await Rating.deleteMany({ _id: { $in: remove } })
              console.log('🧹 Removed duplicate rating docs for', g._id, 'removed:', remove.length)
            } catch (remErr) { console.warn('Failed to remove duplicate rating docs', remErr) }
          }
        }
      }
    } catch (dedupeErr) {
      console.warn('Deduplication pass failed:', dedupeErr)
    }

      // Debug: list ratings for this captain to ensure saves are persisted correctly
      try {
        const found = await Rating.find({ captainId: captainObjId }).lean()
        console.log('🔎 Ratings found for captain:', found.length)
        if (found.length > 0) {
          console.log('🔎 Sample ratings:', found.slice(0, 5).map(d => ({ id: String(d._id), userId: d.userId ? String(d.userId) : null, rating: d.rating, captainId: String(d.captainId) })))
        }
        const cnt = await Rating.countDocuments({ captainId: captainObjId })
        console.log('🔢 countDocuments for captain:', cnt)
      } catch (dbgErr) {
        console.warn('Failed to read back ratings for debug:', dbgErr)
      }

    // Recalculate aggregate for captain - guard against aggregation errors
    let averageRating = 0
    let ratingCount = 0
    try {
      const agg = await Rating.aggregate([
        { $match: { captainId: captainObjId } },
        { $group: { _id: '$captainId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
      console.log('  aggregate result:', agg)
      averageRating = (agg[0] && agg[0].avg) ? Number(agg[0].avg.toFixed(2)) : 0
      ratingCount = (agg[0] && agg[0].count) ? agg[0].count : 0
    } catch (aggErr) {
      console.error('❌ Rating aggregation failed:', aggErr)
      // Even if aggregation fails, return success for the write with best-effort defaults
      averageRating = 0
      ratingCount = 0
    }

    try {
      const updatedCaptain = await Captain.findByIdAndUpdate(captainId, { rating: averageRating }, { new: true }).exec()
      // Emit real-time update via socket.io if available
      try {
        const io = req.app && req.app.locals && req.app.locals.io
        if (io) {
          io.emit('captain:rating-updated', { captainId: String(captainId), averageRating, ratingCount })
          console.log('📣 Emitted captain:rating-updated', { captainId, averageRating, ratingCount })
        }
      } catch (emitErr) {
        console.warn('Failed to emit captain rating update:', emitErr)
      }
    } catch (updateErr) {
      console.error('❌ Failed to update captain rating:', updateErr)
      return res.status(500).json({ message: 'Failed to update captain rating', error: String(updateErr && updateErr.message) })
    }

    return res.json({ success: true, averageRating, ratingCount })
  } catch (error) {
    console.error('❌ Error submitting rating:', error)
    return res.status(500).json({ message: error.message || 'Server error' })
  }
}
