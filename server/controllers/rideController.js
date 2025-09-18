// Ensure fetch is available (Node 18+ has global fetch). If not, try to use undici.
if (typeof fetch === 'undefined') {
  try {
    const { fetch: undiciFetch } = require('undici')
    global.fetch = undiciFetch
  } catch (e) {
    // leave undefined; controller will fail clearly if fetch is missing
  }
}

const Ride = require('../models/rideModel')
const Captain = require('../models/captainModel')
const AcceptedRide = require('../models/acceptedRideModel')

// Configurable cap for unknown seating capacity to avoid runaway occupied counts
const MAX_UNKNOWN_CAPACITY = parseInt(process.env.MAX_UNKNOWN_CAPACITY || '6', 10)

// small helper: haversine distance (meters)
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

// 🚖 User requests a ride (planning handled separately)
exports.requestRide = async (req, res) => {
  try {
    const { rideId, pickup, drop, fare = 150 } = req.body
    const captain = await Captain.findById(req.captainId)
    if (!captain) return res.status(404).json({ message: 'Captain not found' })

    const newFields = {
      status: 'ongoing',
      captainId: req.captainId,
  // If captain has seatingCapacity use it, otherwise leave unknown (null)
  size: (typeof captain?.seatingCapacity === 'number') ? captain.seatingCapacity : null,
    }

    const ride = await Ride.findByIdAndUpdate(rideId, newFields, { new: true })
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

    const io = req.app.locals.io
    if (io) {
      // join ride room and notify clients
      io.to(`ride:${String(ride._id)}`).emit('ride:accepted', {
        rideId: String(ride._id),
        captainId: String(ride.captainId),
      })

      // also emit updated occupancy/size
      io.to(`ride:${String(ride._id)}`).emit('ride-status-updated', {
        rideId: String(ride._id),
        occupied: ride.occupied,
        size: ride.size,
      })

      // notify captain personally
      io.to(`captain:${String(captain._id)}`).emit('rideRequest', {
        id: String(ride._id),
        pickup,
        drop,
        fare,
      })
    }

    return res.json({
      message: 'Ride requested',
      rideId: ride._id,
      captainId: captain._id,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// POST /api/ride/plan
exports.planRide = async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng, fromName, toName, fare = 150 } = req.body
    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ message: 'Missing coordinates' })
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`

    let route = []
    let distance = 0
    let duration = 0
    let steps = []

    try {
      const r = await fetch(url)
      if (r.ok) {
        const data = await r.json()
        const routeCoords = data.routes?.[0]?.geometry?.coordinates || []
        route = routeCoords.map(([lng, lat]) => ({ lat, lng }))
        distance = data.routes?.[0]?.distance || 0
        duration = data.routes?.[0]?.duration || 0
        steps = data.routes?.[0]?.legs?.[0]?.steps || []
      } else {
        // console.warn('[planRide] routing service returned', r.status, 'falling back to straight-line route')
        // fallback straight line
        route = [{ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }]
        distance = haversineMeters(fromLat, fromLng, toLat, toLng)
        // estimate duration assuming average speed 40 km/h -> 11.11 m/s
        duration = Math.round(distance / 11.11)
        steps = []
      }
    } catch (fetchErr) {
      console.warn('[planRide] routing fetch failed, falling back to straight-line route:', fetchErr && fetchErr.message)
      route = [{ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng }]
      distance = haversineMeters(fromLat, fromLng, toLat, toLng)
      duration = Math.round(distance / 11.11)
      steps = []
    }

    const ride = await Ride.create({
      pickup: fromName || 'Pickup',
      drop: toName || 'Drop',
      fare,
      status: 'pending',
      route,
      distance,
      duration,
      steps,
      pickupCoords: { lat: fromLat, lng: fromLng },
      dropCoords: { lat: toLat, lng: toLng },
      captainId: null, // always present, even if not assigned yet
  // unknown size until a captain is assigned
  size: null,
    })

    return res.json({
      message: 'Route planned',
      rideId: ride._id,
      size: ride.size,
      route,
      distance,
      duration,
      captainId: ride.captainId,
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// GET /api/ride/:id
const mongoose = require('mongoose')

exports.getRide = async (req, res) => {
  try {
    const { id } = req.params
    // Validate ObjectId to avoid cast errors when callers pass non-ObjectId strings
    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Return 404 so client gets a consistent "not found" instead of server error
      return res.status(404).json({ message: 'Ride not found' })
    }

    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

  let rideData = ride.toObject()
  // Always include captainId, even if not assigned
  if (!('captainId' in rideData)) rideData.captainId = null

    // Resolve size for clients: prefer captain.seatingCapacity -> ride.size -> null
    if (ride.captainId) {
      try {
        const captain = await Captain.findById(ride.captainId).select('seatingCapacity')
        if (typeof captain?.seatingCapacity === 'number') {
          rideData.size = captain.seatingCapacity
          console.log('Overrode ride size from captain seating capacity:', captain.seatingCapacity)
        } else if (typeof ride.size === 'number') {
          rideData.size = ride.size
        } else {
          rideData.size = null
        }
      } catch (captainErr) {
        console.warn('Failed to fetch captain seating capacity:', captainErr)
        rideData.size = typeof ride.size === 'number' ? ride.size : null
      }
    } else {
      rideData.size = typeof ride.size === 'number' ? ride.size : null
    }

    return res.json({ ride: rideData })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// POST /api/ride/accept
exports.acceptRide = async (req, res) => {
  try {
    const { rideId } = req.body
    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { status: 'ongoing', captainId: req.captainId },
      { new: true }
    )
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

  // ✅ Update size from captain (or keep unknown/null)
  try {
        const captain = await Captain.findById(req.captainId).select('seatingCapacity')
        if (typeof captain?.seatingCapacity === 'number') {
          ride.size = captain.seatingCapacity
        } else if (typeof ride.size === 'number') {
          // keep existing ride.size
        } else {
    ride.size = null
        }
        if (typeof ride.occupied === 'number' && typeof ride.size === 'number' && ride.size > 0) {
          ride.occupied = Math.min(ride.occupied, ride.size)
        }
        await ride.save()
        console.log('Updated ride size to captain seating capacity (or default):', ride.size)
      } catch (updateErr) {
        console.warn('Failed to update ride size with captain seating capacity:', updateErr)
      }

    const io = req.app.locals.io
    if (io) {
      io.to(`ride:${String(ride._id)}`).emit('ride:accepted', {
        rideId: String(ride._id),
        captainId: String(ride.captainId),
      })
      io.to(`ride:${String(ride._id)}`).emit('ride-status-updated', {
        rideId: String(ride._id),
        occupied: ride.occupied,
        size: ride.size,
        captainId: String(ride.captainId),
      })

      // Notify the ride requester (user) with a standardized notification payload
      try {
        const userId = ride.userId ? String(ride.userId) : null
        if (userId) {
          let captainName = 'Captain'
          try {
            const cap = await Captain.findById(req.captainId).select('name')
            if (cap && cap.name) captainName = cap.name
          } catch (_) {}

          const payload = {
            type: 'rideAccepted',
            rideId: String(ride._id),
            captainId: String(ride.captainId),
            captainName,
            message: 'Your ride has been accepted by a captain',
            timestamp: Date.now()
          }

          // Emit socket event
          io.to(`user:${userId}`).emit('notification', payload)

          // Persist notification to DB (best-effort)
          try {
            const Notification = require('../models/notificationModel')
            await Notification.create({ userId, type: payload.type, message: payload.message, rideId: payload.rideId, data: { captainId, captainName }, timestamp: new Date(payload.timestamp) })
          } catch (saveErr) {
            console.warn('Failed to save notification to DB (ride accepted):', saveErr)
          }
        }
      } catch (emitErr) {
        console.warn('Failed to emit user notification for ride accepted', emitErr)
      }
    }

    return res.json({ message: 'Ride accepted', ride })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.rejectRide = async (req, res) => {
  try {
    const { rideId } = req.body
    const ride = await Ride.findByIdAndUpdate(rideId, { status: 'rejected' }, { new: true })
    if (!ride) return res.status(404).json({ message: 'Ride not found' })
    return res.json({ message: 'Ride rejected', ride })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.body
    const ride = await Ride.findById(rideId)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })
    ride.status = 'completed'
    await ride.save()
    await Captain.findByIdAndUpdate(ride.captainId, {
      $inc: { earnings: ride.fare, ridesCompleted: 1 },
      status: 'offline',
    })
      // Emit notification to user that ride is completed
      try {
        const io = req.app.locals.io
        const userId = ride.userId ? String(ride.userId) : null
        if (io && userId) {
          const payload = {
            type: 'rideCompleted',
            rideId: String(ride._id),
            message: 'Your ride has been completed',
            timestamp: Date.now()
          }
          io.to(`user:${userId}`).emit('notification', payload)
          try {
            const Notification = require('../models/notificationModel')
            await Notification.create({ userId, type: payload.type, message: payload.message, rideId: payload.rideId, timestamp: new Date(payload.timestamp) })
          } catch (saveErr) {
            console.warn('Failed to save notification to DB (ride completed):', saveErr)
          }
        }
      } catch (nErr) { console.warn('Failed to emit ride completed notification', nErr) }
    return res.json({ message: 'Ride completed', ride })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// GET captain earnings
exports.captainEarnings = async (req, res) => {
  try {
    const captainId = req.captainId
    const captain = await Captain.findById(captainId)
    if (!captain) return res.status(404).json({ message: 'Captain not found' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEarnings = await Ride.aggregate([
      {
        $match: {
          captainId: captain._id,
          status: 'completed',
          updatedAt: { $gte: today },
        },
      },
      { $group: { _id: null, total: { $sum: '$fare' }, count: { $sum: 1 } } },
    ])
    const t = todayEarnings[0] || { total: 0, count: 0 }

    return res.json({
      totalEarnings: captain.earnings,
      ridesCompleted: captain.ridesCompleted,
      rating: captain.rating,
      today: { earnings: t.total, completed: t.count },
    })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// PATCH /api/ride/:id/occupancy
exports.updateOccupancy = async (req, res) => {
  try {
    const { id } = req.params
    const { occupied } = req.body
    if (typeof occupied !== 'number') {
      return res.status(400).json({ message: 'Invalid occupied value' })
    }

    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

    console.log('[updateOccupancy] incoming', {
      rideId: id,
      occupied,
      rideSize: ride.size,
      rideOccupied: ride.occupied,
    })

    // If ride.size > 0, clamp occupied to [0, size]. If size unknown, but a captain
    // is assigned and has a seatingCapacity, use that as the authoritative cap for
    // clamping and for the emitted payload. Otherwise fall back to MAX_UNKNOWN_CAPACITY.
    const incoming = Math.max(0, Math.floor(occupied))

    // Determine an authoritative capacity without force-overwriting ride.size here
    let authoritativeSize = (typeof ride.size === 'number' && ride.size > 0) ? ride.size : null
    if (authoritativeSize == null && ride.captainId) {
      try {
        const captain = await Captain.findById(ride.captainId).select('seatingCapacity')
        if (typeof captain?.seatingCapacity === 'number' && captain.seatingCapacity > 0) {
          authoritativeSize = captain.seatingCapacity
        }
      } catch (e) {
        console.warn('[updateOccupancy] failed to read captain seatingCapacity:', e && e.message)
      }
    }

    const capForClamping = (typeof authoritativeSize === 'number' && authoritativeSize > 0) ? authoritativeSize : MAX_UNKNOWN_CAPACITY
    ride.occupied = Math.min(capForClamping, incoming)
    await ride.save()

    // console.log('[updateOccupancy] saved', {
    //   rideId: id,
    //   rideSize: ride.size,
    //   rideOccupied: ride.occupied,
    // })

    const io = req.app.locals.io
    if (io) {
      // Prefer authoritativeSize (captain seatingCapacity or ride.size) for clients
      const emittedSize = (typeof authoritativeSize === 'number') ? authoritativeSize : ((typeof ride.size === 'number') ? ride.size : null)
      const payload = {
        rideId: String(ride._id),
        occupied: ride.occupied,
        size: emittedSize,
      }
      // console.log('[updateOccupancy] emitting socket event:', payload)
      io.to(`ride:${String(ride._id)}`).emit('ride-status-updated', payload)
    }

    return res.json({ message: 'Occupancy updated', ride })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}

// POST /api/ride/:id/book - User books a seat in a ride
exports.bookRide = async (req, res) => {
  try {
    const { id } = req.params
    
    // Find the ride and check availability atomically
    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

    // Determine authoritative size (captain seating capacity or ride size)
    let authoritativeSize = (typeof ride.size === 'number' && ride.size > 0) ? ride.size : null
    if (authoritativeSize == null && ride.captainId) {
      try {
        const captain = await Captain.findById(ride.captainId).select('seatingCapacity')
        if (typeof captain?.seatingCapacity === 'number' && captain.seatingCapacity > 0) {
          authoritativeSize = captain.seatingCapacity
        }
      } catch (e) {
        console.warn('[bookRide] failed to read captain seatingCapacity:', e && e.message)
      }
    }

    // If we don't know the size, we can't safely book
    if (authoritativeSize == null) {
      return res.status(400).json({ message: 'Seat capacity unknown, cannot book' })
    }

    // Check if seats are available
    if (ride.occupied >= authoritativeSize) {
      const io = req.app.locals.io
      if (io) {
        io.to(`ride:${String(ride._id)}`).emit('ride:booking-error', {
          rideId: String(ride._id),
          reason: 'full',
          message: 'Seat not available'
        })
      }
      return res.status(400).json({ message: 'Seat not available' })
    }

    // Atomically increment occupied count
    const updatedRide = await Ride.findOneAndUpdate(
      { 
        _id: id, 
        occupied: { $lt: authoritativeSize } // Ensure seat is still available
      },
      { 
        $inc: { occupied: 1 } 
      },
      { new: true }
    )

    if (!updatedRide) {
      // Race condition - seat was taken by someone else
      const io = req.app.locals.io
      if (io) {
        io.to(`ride:${String(ride._id)}`).emit('ride:booking-error', {
          rideId: String(ride._id),
          reason: 'full',
          message: 'Seat not available'
        })
      }
      return res.status(400).json({ message: 'Seat not available' })
    }

    console.log('[bookRide] Seat booked successfully:', {
      rideId: id,
      newOccupied: updatedRide.occupied,
      totalSeats: authoritativeSize
    })

    // Emit socket events for real-time updates
    const io = req.app.locals.io
    if (io) {
      // Notify all users in the ride room about occupancy update
      io.to(`ride:${String(ride._id)}`).emit('ride-status-updated', {
        rideId: String(ride._id),
        occupied: updatedRide.occupied,
        size: authoritativeSize
      })

      // Notify the user who booked
      io.to(`ride:${String(ride._id)}`).emit('ride:booking-confirmed', {
        rideId: String(ride._id),
        occupied: updatedRide.occupied,
        size: authoritativeSize
      })

      // Notify captain about new booking
      if (ride.captainId) {
        io.to(`captain:${String(ride.captainId)}`).emit('ride:booking', {
          rideId: String(ride._id),
          occupied: updatedRide.occupied,
          size: authoritativeSize,
          message: 'New passenger booked a seat!'
        })

        // 🔔 Send notification to captain about new booking
        try {
          const Notification = require('../models/notificationModel')
          const notificationPayload = {
            type: 'newBooking',
            message: `🎫 New passenger booked your ride! (${updatedRide.occupied}/${authoritativeSize} seats occupied)`,
            rideId: String(ride._id),
            timestamp: Date.now(),
            data: {
              pickup: ride.pickup || 'Pickup location',
              destination: ride.drop || 'Destination',
              occupiedSeats: updatedRide.occupied,
              totalSeats: authoritativeSize
            }
          }

          // Save to database
          await Notification.create({
            userId: ride.captainId,
            type: notificationPayload.type,
            message: notificationPayload.message,
            rideId: notificationPayload.rideId,
            data: notificationPayload.data,
            timestamp: new Date(notificationPayload.timestamp)
          })

          // Emit real-time notification to captain
          io.to(`captain:${String(ride.captainId)}`).emit('notification', notificationPayload)
          console.log(`🔔 Booking notification sent to captain ${ride.captainId}`)
        } catch (notificationError) {
          console.warn('Failed to send booking notification to captain:', notificationError)
        }
      }
    }

    return res.json({ 
      message: 'Seat booked successfully', 
      ride: updatedRide,
      occupied: updatedRide.occupied,
      size: authoritativeSize
    })
  } catch (err) {
    console.error('[bookRide] Error:', err)
    return res.status(500).json({ message: err.message })
  }
}

// Cancel ride by user
exports.cancelRide = async (req, res) => {
  try {
    const { rideId: rideParam } = req.params
    const { userId, acceptanceId: bodyAcceptanceId, reason } = req.body

    console.log(' User cancelling ride:', { rideParam, userId, bodyAcceptanceId, reason })

    // Try to find and remove the accepted ride by multiple identifiers for compatibility
    // Clients may send either:
    // - acceptanceId === MongoDB _id (ObjectId) stored as AcceptedRide._id
    // - acceptanceId === generated acceptance string stored in AcceptedRide.rideId
    // - the route param (rideParam) may also be the generated acceptance string
    const mongoose = require('mongoose')

    let acceptedRide = null
    // 1) If client provided an acceptanceId and it's a valid ObjectId, try deleting by _id
    if (bodyAcceptanceId && mongoose.isValidObjectId(bodyAcceptanceId)) {
      acceptedRide = await AcceptedRide.findOneAndDelete({ _id: bodyAcceptanceId, userId })
    }

    // 2) If not found yet and client provided acceptanceId (non-ObjectId), try deleting by rideId field
    if (!acceptedRide && bodyAcceptanceId) {
      acceptedRide = await AcceptedRide.findOneAndDelete({ rideId: bodyAcceptanceId, userId })
    }

    // 3) If still not found, try deleting by the route param (it may contain the generated acceptance string)
    if (!acceptedRide && rideParam) {
      acceptedRide = await AcceptedRide.findOneAndDelete({ rideId: rideParam, userId })
    }

    if (!acceptedRide) {
      return res.status(404).json({ error: 'Accepted ride not found' })
    }

    // Determine original ride id (the actual Ride._id) to update occupancy
    const originalRideId = acceptedRide.originalRideId || rideParam

    // Update ride occupancy - reduce by passenger count
    const ride = await Ride.findById(originalRideId)
    if (ride) {
      const passengerCount = acceptedRide.passengerCount || 1
      ride.occupied = Math.max(0, (ride.occupied || 0) - passengerCount)
      await ride.save()

      console.log(' Reduced seat count:', {
        originalRideId,
        passengerCount,
        newOccupied: ride.occupied
      })

      // Emit socket events for real-time updates
      const io = req.app.locals.io
      if (io) {
        // Update users in the ride room about occupancy update
        io.to(`ride:${originalRideId}`).emit('ride-status-updated', {
          rideId: originalRideId,
          occupied: ride.occupied,
          size: ride.size
        })

        // Notify captain about cancellation — include the generated acceptanceId string
        io.to(`captain:${acceptedRide.captainId}`).emit('ride:cancelled', {
          rideId: originalRideId,
          userId,
          acceptanceId: acceptedRide.rideId,
          passengerCount,
          reason,
          cancelledBy: 'user'
        })

        console.log(' Emitted cancellation events to captain and ride room')
      }
    }

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      refundedSeats: acceptedRide.passengerCount || 1
    })

  } catch (error) {
    console.error('Error cancelling ride:', error)
    res.status(500).json({ error: 'Failed to cancel ride' })
  }
}

// Get user's accepted rides
exports.getUserAcceptedRides = async (req, res) => {
  try {
    const { userId } = req.params
    console.log('🔍 Fetching accepted rides for userId:', userId)

    const acceptedRides = await AcceptedRide.find({ userId })
      .sort({ acceptedAt: -1 })
    
    console.log('📋 Found accepted rides:', acceptedRides.length)

    // Format rides without population since rideId might not be a valid ObjectId reference
    const formattedRides = acceptedRides.map(accepted => ({
      rideId: accepted.rideId,
      acceptanceId: accepted._id,
      pickup: accepted.pickup,
      destination: accepted.destination,
      estimatedFare: accepted.estimatedFare || 0,
      passengerCount: accepted.passengerCount,
      acceptedAt: accepted.acceptedAt,
      status: 'accepted',
      captainName: 'Captain',
      captainId: accepted.captainId
    }))

    console.log('✅ Formatted rides:', formattedRides.length)
    res.json({ rides: formattedRides })

  } catch (error) {
    console.error('❌ Error fetching user accepted rides:', error)
    res.status(500).json({ error: 'Failed to fetch accepted rides', details: error.message })
  }
}

// Export functions. Many handlers are attached directly to exports (e.g. exports.requestRide)
// To be safe, export the functions we defined above and any aliases expected by routes.
module.exports = {
  requestRide: exports.requestRide,
  planRide: exports.planRide,
  getRide: exports.getRide,
  acceptRide: exports.acceptRide,
  rejectRide: exports.rejectRide,
  completeRide: exports.completeRide,
  captainEarnings: exports.captainEarnings,
  updateOccupancy: exports.updateOccupancy,
  bookRide: exports.bookRide,
  cancelRide: exports.cancelRide,
  getUserAcceptedRides: exports.getUserAcceptedRides,
}
