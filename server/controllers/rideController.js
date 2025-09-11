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

// 🚖 User requests a ride (planning handled separately)
exports.requestRide = async (req, res) => {
  try {
    const { rideId, pickup, drop, fare = 150 } = req.body
    const captain = await Captain.findById(req.captainId)
    if (!captain) return res.status(404).json({ message: 'Captain not found' })

    const newFields = {
      status: 'ongoing',
      captainId: req.captainId,
  // If captain has seatingCapacity use it, otherwise mark as unknown (null)
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
    const r = await fetch(url)
    if (!r.ok) return res.status(502).json({ message: 'Routing service error' })
    const data = await r.json()

    const routeCoords = data.routes?.[0]?.geometry?.coordinates || []
    const route = routeCoords.map(([lng, lat]) => ({ lat, lng }))
    const distance = data.routes?.[0]?.distance || 0
    const duration = data.routes?.[0]?.duration || 0
    const steps = data.routes?.[0]?.legs?.[0]?.steps || []

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
exports.getRide = async (req, res) => {
  try {
    const { id } = req.params
    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ message: 'Ride not found' })

  let rideData = ride.toObject()
  // Always include captainId, even if not assigned
  if (!('captainId' in rideData)) rideData.captainId = null

    // If a captain is assigned, prefer the captain's seatingCapacity as the
    // authoritative ride size. If seatingCapacity cannot be determined, set
    // size = 0 to signal "unknown" to the frontend. If no captain assigned,
    // explicitly set size = 0 so frontend always receives a numeric value.
    if (ride.captainId) {
      try {
        const captain = await Captain.findById(ride.captainId).select('seatingCapacity')
        if (typeof captain?.seatingCapacity === 'number') {
          rideData.size = captain.seatingCapacity // always trust captain when present
          console.log('Overrode ride size from captain seating capacity:', captain.seatingCapacity)
        } else {
          // unknown seating capacity
          rideData.size = null
        }
      } catch (captainErr) {
        console.warn('Failed to fetch captain seating capacity:', captainErr)
        rideData.size = null
      }
    } else {
      // No captain assigned yet; size unknown
      rideData.size = null
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

    // ✅ Update size from captain
    try {
      const captain = await Captain.findById(req.captainId).select('seatingCapacity')
      if (typeof captain?.seatingCapacity === 'number') {
        ride.size = captain.seatingCapacity
      } else {
        // mark unknown explicitly
        ride.size = null
      }
      // if occupied is greater than new size, clamp it
      if (typeof ride.occupied === 'number' && ride.size > 0) {
        ride.occupied = Math.min(ride.occupied, ride.size)
      }
      await ride.save()
      console.log('Updated ride size to captain seating capacity:', ride.size)
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

    // If ride.size > 0, clamp occupied to [0, size]. If size === 0 (unknown),
    // accept non-negative occupied values (no upper clamp) but ensure integer.
    const incoming = Math.max(0, Math.floor(occupied))
    if (typeof ride.size === 'number' && ride.size > 0) {
      ride.occupied = Math.min(ride.size, incoming)
    } else {
      ride.occupied = incoming
    }
    await ride.save()

    console.log('[updateOccupancy] saved', {
      rideId: id,
      rideSize: ride.size,
      rideOccupied: ride.occupied,
    })

    const io = req.app.locals.io
    if (io) {
      const payload = {
        rideId: String(ride._id),
        occupied: ride.occupied,
        // size may be null (unknown) or a number
        size: (typeof ride.size === 'number') ? ride.size : null,
      }
      console.log('[updateOccupancy] emitting socket event:', payload)
      io.to(`ride:${String(ride._id)}`).emit('ride-status-updated', payload)
    }

    return res.json({ message: 'Occupancy updated', ride })
  } catch (err) {
    return res.status(500).json({ message: err.message })
  }
}
