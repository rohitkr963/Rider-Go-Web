const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const http = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const Captain = require('./models/captainModel')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Middleware to log all requests (moved to top)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2))
  }
  next()
})

// Ensure fetch is available in Node (use undici if not present)
if (typeof fetch === 'undefined') {
  try {
    // eslint-disable-next-line global-require
    const { fetch: undiciFetch } = require('undici')
    global.fetch = undiciFetch
  } catch (_) {
    // no-op; will error later if fetch is used
  }
}

// Connect MongoDB (prefer MONGO_URI, fall back to other vars or localhost)
const mongoUrl = process.env.MONGO_URI || process.env.MONGODB_URL || process.env.MONGO_URL
const dbName = process.env.DB_NAME || 'ridergo'

if (!mongoUrl) {
  console.error('❌ No MongoDB URL found in environment variables!')
  console.error('Please check your .env file for MONGO_URI')
  process.exit(1)
}

const redact = (u) => { if (!u) return u; try { return String(u).replace(/:\/\/.*@/, '://<credentials>@') } catch (e) { return '<redacted>' } }
console.log('🔄 Connecting to MongoDB:', redact(mongoUrl), ' DB=', dbName)
mongoose
  .connect(mongoUrl, { dbName })
  .then(() => {
    console.log('✅ MongoDB connected successfully!')
    console.log('📄 Database name:', mongoose.connection.name)
    console.log('🔗 Connection state:', mongoose.connection.readyState)
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err && err.message ? err.message : err)
    console.error('🔍 Check your MongoDB URL and network connection')
    process.exit(1)
  })

// Routes with logging
console.log('🔄 Setting up routes...')

const authRoutes = require('./routes/authRoutes')
const rideRoutes = require('./routes/rideRoutes')
const acceptedRidesRoutes = require('./routes/acceptedRidesRoutes')
const rideHistoryRoutes = require('./routes/rideHistoryRoutes')
const userRoutes = require('./routes/userRoutes')

app.use('/api/auth', authRoutes)
app.use('/api', rideRoutes)
app.use('/api/accepted-rides', acceptedRidesRoutes)
app.use('/api/ride-history', rideHistoryRoutes)
app.use('/api/user', userRoutes)
console.log('✅ Accepted rides routes loaded at /api/accepted-rides')

// Test route for accepted rides API
app.get('/test-accepted-rides', (req, res) => {
  console.log('🧪 Test endpoint called')
  res.json({ message: 'Accepted rides API is working', timestamp: new Date() })
})

app.get('/', (_req, res) => {
  res.send('RiderGo server running')
})


// HTTP server + socket.io
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

app.locals.io = io

// In-memory active rides registry for quick demo matching
// Map<rideId, { rideId, captainId, pickupCoords:{lat,lng}, dropCoords:{lat,lng}, last:{lat,lng,ts} }>
const activeRides = new Map()

function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad((b.lat || b[0]) - (a.lat || a[0]))
  const dLng = toRad((b.lng || b[1]) - (a.lng || a[1]))
  const lat1 = toRad(a.lat || a[0])
  const lat2 = toRad(b.lat || b[0])
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const c = 2 * Math.asin(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2))
  return R * c
}

// Check if two routes overlap significantly (like "Where is My Train")
function routesOverlap(route1, route2, threshold = 0.2) {
  if (!route1 || !route2 || route1.length < 2 || route2.length < 2) return false
  
  let overlapCount = 0
  const minDistance = 500 // meters - increased from 200m to be more flexible
  
  // Check each point in route1 against route2
  for (const point1 of route1) {
    for (const point2 of route2) {
      const distance = haversineMeters(point1, point2)
      if (distance <= minDistance) {
        overlapCount++
        break // Found a match for this point, move to next
      }
    }
  }
  
  const overlapRatio = overlapCount / Math.min(route1.length, route2.length)
  return overlapRatio >= threshold
}

// Alternative: Check if routes are on the same general path (more flexible)
function routesOnSamePath(route1, route2, maxDistance = 2000) {
  if (!route1 || !route2 || route1.length < 2 || route2.length < 2) return false
  
  // Check if any point from route1 is close to any point from route2
  for (const point1 of route1) {
    for (const point2 of route2) {
      const distance = haversineMeters(point1, point2)
      if (distance <= maxDistance) {
        return true // Found at least one close point
      }
    }
  }
  return false
}

function rideMatchesCriteria(ride, crit) {
  if (!ride || !crit) return false
  const from = { lat: Number(crit.fromLat), lng: Number(crit.fromLng) }
  const to = { lat: Number(crit.toLat), lng: Number(crit.toLng) }
  if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng) || !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) return false
  
  // If captain has a route, check route overlap (more flexible)
  if (ride.route && ride.route.length > 0) {
    // Get user's route from OSRM
    const userRoute = getUserRoute(from, to)
    if (userRoute && userRoute.length > 0) {
      // Try strict overlap first, then more flexible path matching
      if (routesOverlap(ride.route, userRoute, 0.2)) return true
      if (routesOnSamePath(ride.route, userRoute, 2000)) return true
    }
  }
  
  // More flexible distance-based matching for same direction
  const dFrom = haversineMeters(ride.pickupCoords || {}, from)
  const dTo = haversineMeters(ride.dropCoords || {}, to)
  const dFromTo = haversineMeters(ride.pickupCoords || {}, to)
  const dToFrom = haversineMeters(ride.dropCoords || {}, from)
  
  // If captain is between user's pickup and destination, or vice versa
  const THRESHOLD = 3000 // meters - increased threshold
  if (dFrom <= THRESHOLD || dTo <= THRESHOLD) return true
  if (dFromTo <= THRESHOLD || dToFrom <= THRESHOLD) return true
  
  return false
}

// Get user's route from OSRM (cached)
const routeCache = new Map()
function getUserRoute(from, to) {
  const key = `${from.lat},${from.lng};${to.lat},${to.lng}`
  if (routeCache.has(key)) return routeCache.get(key)
  
  // This would be async in real implementation, but for demo we'll return null
  // In production, you'd call OSRM here and cache the result
  return null
}

function emitMatches(socket) {
  const crit = socket.searchCriteria
  if (!crit) return
  const matches = []
  const from = { lat: Number(crit.fromLat), lng: Number(crit.fromLng) }
  const to = { lat: Number(crit.toLat), lng: Number(crit.toLng) }
  
  activeRides.forEach((r) => {
    if (rideMatchesCriteria(r, crit)) {
      matches.push({ rideId: r.rideId, captainId: r.captainId, captainEmail: r.captainEmail, captainName: r.captainName, lat: r.last?.lat, lng: r.last?.lng, ts: r.last?.ts })
    } else {
      // Fallback: Show any captain that's moving and reasonably close
      if (r.last && r.last.lat && r.last.lng) {
        const dFrom = haversineMeters(r.last, from)
        const dTo = haversineMeters(r.last, to)
        const dRoute = haversineMeters(from, to)
        
        // If captain is within 5km of user's route
        if (dFrom <= 5000 || dTo <= 5000 || (dFrom + dTo) <= dRoute * 1.5) {
          matches.push({ 
            rideId: r.rideId, 
            captainId: r.captainId, 
            captainEmail: r.captainEmail, 
            captainName: r.captainName, 
            lat: r.last?.lat, 
            lng: r.last?.lng, 
            ts: r.last?.ts,
            isNearby: true // Flag to show this is a nearby captain
          })
        }
      }
    }
  })
  
  if (matches.length > 0) {
    socket.emit('user:route:results', { items: matches })
  } else {
    socket.emit('user:route:empty', { message: 'Wait some time, autos are coming soon...' })
  }
}

io.on('connection', (socket) => {
  console.log('🔌 New socket connection:', socket.id)
  
  // Handle ride request from user
  socket.on('ride:request', (payload) => {
    console.log('📥 Ride request received:', payload)
    console.log('👥 Backend received passenger count:', payload.passengerCount)
    console.log('🔍 Full backend payload:', JSON.stringify(payload, null, 2))
    // Broadcast to all captains
    socket.broadcast.emit('ride:request', payload)
  })

  // Handle captain accept with seat validation
  socket.on('ride:accept', async (payload) => {
    console.log('✅ Captain accepted ride:', payload)
    
    try {
      // Find the ride and validate seat availability
      const ride = await require('./models/rideModel').findById(payload.rideId)
      if (!ride) {
        socket.emit('ride:rejected', { 
          rideId: payload.rideId, 
          userId: payload.userId,
          reason: 'Ride not found' 
        })
        return
      }

      const requestedSeats = payload.passengerCount || 1

      // Determine authoritative total seats: prefer ride.size -> captain.seatingCapacity -> fallback 4
      let totalSeats = null
      try {
        if (typeof ride.size === 'number' && ride.size > 0) {
          totalSeats = ride.size
        } else if (ride.captainId) {
          const capDoc = await Captain.findById(ride.captainId).select('seatingCapacity')
          if (capDoc && typeof capDoc.seatingCapacity === 'number') totalSeats = capDoc.seatingCapacity
        }
      } catch (e) {
        console.warn('[ride:accept] failed to resolve captain seatingCapacity:', e && e.message)
      }
      if (totalSeats == null) totalSeats = 4

      const availableSeats = totalSeats - (ride.occupied || 0)

      if (requestedSeats > availableSeats) {
        // Not enough seats available
        socket.emit('ride:rejected', { 
          rideId: payload.rideId, 
          userId: payload.userId,
          reason: `Only ${availableSeats} seat${availableSeats !== 1 ? 's' : ''} available, but ${requestedSeats} requested` 
        })
        return
      }

  // Update ride with new seat count (clamp just in case)
  ride.occupied = Math.min(totalSeats, (ride.occupied || 0) + requestedSeats)
      await ride.save()

      // Store accepted ride for captain's list
      const captainId = payload.captainId
      if (!global.acceptedRides) global.acceptedRides = {}
      if (!global.acceptedRides[captainId]) global.acceptedRides[captainId] = []
      
      // Generate unique rideId if not provided
      const generateUniqueRideId = () => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const captainSuffix = captainId.substring(0, 4)
        return `ride_${timestamp}_${random}_${captainSuffix}`
      }

      // Always generate unique acceptance ID for each ride acceptance
      const uniqueAcceptanceId = `acceptance_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${captainId.substring(0, 4)}`

      const acceptedRide = {
        rideId: uniqueAcceptanceId,
        originalRideId: payload.rideId,
        userId: payload.userId,
        userEmail: payload.userEmail,
        pickup: payload.pickup || { lat: 0, lng: 0 },
        destination: payload.destination || { lat: 0, lng: 0 },
        passengerCount: requestedSeats,
        fare: payload.fare,
        distance: payload.distance,
        duration: payload.duration,
        timestamp: new Date().toISOString()
      }
      
      global.acceptedRides[captainId].push(acceptedRide)

      // Save accepted ride to database
      console.log('💾 Saving accepted ride to database...')
      try {
        const AcceptedRide = require('./models/acceptedRideModel')
        const dbRide = new AcceptedRide({
          rideId: payload.rideId,  // Use original ride ID, not uniqueAcceptanceId
          captainId: captainId,
          userId: payload.userId || 'Unknown User',
          userEmail: payload.userEmail || 'user@example.com',
          passengerCount: requestedSeats,
          pickup: {
            lat: payload.pickup?.lat || 0,
            lng: payload.pickup?.lng || 0,
            name: payload.pickup?.name || 'Unknown pickup location'
          },
          destination: {
            lat: payload.destination?.lat || 0,
            lng: payload.destination?.lng || 0,
            name: payload.destination?.name || 'Unknown destination'
          },
          fare: payload.fare || 50,
          distance: payload.distance || 0,
          duration: payload.duration || 0,
          occupied: requestedSeats,
          totalSeats: totalSeats,
          status: 'accepted',
          acceptedAt: new Date()
        })
        
        await dbRide.save()
        console.log('✅ Accepted ride saved to database successfully!')
        console.log('📄 Saved ride ID:', dbRide._id)
      } catch (dbError) {
        console.error('❌ Error saving accepted ride to database:', dbError)
      }

      // Broadcast acceptance with updated seat info
      const acceptPayload = {
        ...payload,
        ...acceptedRide,
        occupied: ride.occupied,
        size: totalSeats,
        passengerCount: requestedSeats,
        rideId: payload.rideId, // Use original rideId for user matching
        originalRideId: payload.rideId,
        acceptanceId: uniqueAcceptanceId // Keep unique ID for captain tracking
      }

      // Emit accepted event globally (for users) and to the captain's room for their UI
      io.emit('ride:accepted', acceptPayload)

      // If captain socket joined a room 'captain:<id>' emit the list there; else emit to current socket
      try {
        const captainRoom = `captain:${captainId}`
        if (io.sockets.adapter.rooms.get(captainRoom)) {
          io.to(captainRoom).emit('ride:accepted-list', global.acceptedRides[captainId])
        } else {
          socket.emit('ride:accepted-list', global.acceptedRides[captainId])
        }
      } catch (e) {
        console.warn('[ride:accept] failed to emit accepted-list to captain room, falling back to socket.emit', e && e.message)
        socket.emit('ride:accepted-list', global.acceptedRides[captainId])
      }
      
  console.log(`✅ Ride accepted: ${requestedSeats} seats booked, ${ride.occupied}/${totalSeats} total occupied`)
      console.log(`📋 Captain ${captainId} now has ${global.acceptedRides[captainId].length} accepted rides`)
      
    } catch (error) {
      console.error('Error processing ride acceptance:', error)
      socket.emit('ride:rejected', { 
        rideId: payload.rideId, 
        userId: payload.userId,
        reason: 'Server error' 
      })
    }
  })

  // Handle captain reject
  socket.on('ride:reject', (payload) => {
    console.log('❌ Captain rejected ride:', payload)
    // Broadcast rejection to all users
    io.emit('ride:rejected', payload)
  })

  // user searches captains for a route
  socket.on('user:route:search', (payload) => {
    socket.searchCriteria = {
      fromLat: payload?.fromLat,
      fromLng: payload?.fromLng,
      toLat: payload?.toLat,
      toLng: payload?.toLng,
    }
    emitMatches(socket)
  })

  // captain announces ride start to be discoverable by users (Where is My Train style)
  socket.on('ride:start', async (data) => {
    const { rideId, captainId, captainName, pickup, destination, route, distance, duration, status, startTime } = data || {}
    if (!rideId || !pickup || !destination) return
    
    let captainEmail = 'captain@ridergo.com'
    let finalCaptainName = captainName || 'Captain'
    try {
      if (socket.user?.id) {
        const doc = await Captain.findById(socket.user.id).select('email name')
        captainEmail = doc?.email || captainEmail
        finalCaptainName = doc?.name || finalCaptainName
      }
    } catch (_) {}
    
    const rideData = {
      rideId: String(rideId),
      captainId: socket.user?.id || captainId,
      captainEmail,
      captainName: finalCaptainName,
      pickupCoords: { lat: pickup.lat, lng: pickup.lng },
      dropCoords: { lat: destination.lat, lng: destination.lng },
      route: route || [], // Complete polyline route
      distance: distance || 0,
      duration: duration || 0,
      status: status || 'active',
      startTime: startTime || new Date().toISOString(),
      startLocation: null, // Will be set when first location update comes
      last: null,
      trail: [] // Captain's travelled path
    }
    // Attach captain seating capacity (size) when available so clients see correct seats.
    // Order of precedence: captain.seatingCapacity -> ride.size (if present on DB) -> fallback 4
    try {
      let finalSize = undefined
      if (rideData.captainId) {
        const cap = await Captain.findById(rideData.captainId).select('seatingCapacity')
        if (cap && typeof cap.seatingCapacity === 'number') finalSize = cap.seatingCapacity
      }
      if (typeof finalSize !== 'number' && typeof rideData.size === 'number') finalSize = rideData.size
      if (typeof finalSize !== 'number') finalSize = 4
      rideData.size = finalSize
    } catch (e) { /* ignore */ }
    
    activeRides.set(String(rideId), rideData)
    console.log('🚗 Captain ride started:', rideData.rideId, 'by', rideData.captainName)
    
    // Notify all users about new available ride
    io.sockets.sockets.forEach((s) => emitMatches(s))
  // notify subscribers in the ride room with full ride info
  io.to(`ride:${rideId}`).emit('ride:info', rideData)
  })

  // captain ends ride
  socket.on('ride:end', (data) => {
    const { rideId } = data || {}
    if (rideId) {
      activeRides.delete(String(rideId))
      io.sockets.sockets.forEach((s) => emitMatches(s))
    }
  })
  socket.on('registerCaptain', ({ captainId }) => {
    if (captainId) socket.join(`captain:${captainId}`)
  })

  // Handle booking notifications from captain side
  socket.on('booking:accept', async (data) => {
    const { rideId, userId } = data || {}
    if (!rideId || !userId) return
    
    try {
      // Notify the user that their booking was accepted
      io.to(`user:${userId}`).emit('booking:accepted', {
        rideId,
        message: 'Your booking has been accepted by the captain!'
      })
      
      // Update ride status if needed
      const Ride = require('./models/rideModel')
      await Ride.findByIdAndUpdate(rideId, { status: 'ongoing' })
      
      console.log(`Captain accepted booking for ride ${rideId}, user ${userId}`)
    } catch (error) {
      console.error('Error handling booking acceptance:', error)
    }
  })

  socket.on('booking:reject', async (data) => {
    const { rideId, userId } = data || {}
    if (!rideId || !userId) return
    
    try {
      // Notify the user that their booking was rejected
      io.to(`user:${userId}`).emit('booking:rejected', {
        rideId,
        message: 'Your booking was rejected. Please try another auto.'
      })
      
      console.log(`Captain rejected booking for ride ${rideId}, user ${userId}`)
    } catch (error) {
      console.error('Error handling booking rejection:', error)
    }
  })
  // Allow clients to subscribe to a ride room
  socket.on('ride:subscribe', ({ rideId }) => {
    if (rideId) {
      socket.join(`ride:${rideId}`)
      console.log(`👤 Socket ${socket.id} joined ride room: ride:${rideId}`)
    }
    // if we already have this ride active, send full info to the subscriber
    try {
      const r = activeRides.get(String(rideId))
      if (r) socket.emit('ride:info', r)
    } catch (e) { /* ignore */ }
  })

  // Handle user joining specific rooms
  socket.on('join', (roomName) => {
    if (roomName) {
      socket.join(roomName)
      console.log(`👤 Socket ${socket.id} joined room: ${roomName}`)
    }
  })

  // Handle ride cancellation by user
  socket.on('ride:cancelled', async (payload) => {
    const { rideId, userId, acceptanceId, cancelledBy } = payload
    console.log('🚫 Ride cancelled via socket:', payload)
    
    // Notify captain about cancellation
    if (rideId) {
      socket.to(`ride:${rideId}`).emit('ride:cancelled', payload)
      
      // Also notify captain's room specifically
      const ride = await require('./models/rideModel').findById(rideId)
      if (ride && ride.captainId) {
        socket.to(`captain:${ride.captainId}`).emit('ride:cancelled', payload)
      }
    }
  })
  // Captain live location updates
  socket.on('location:update', async (data) => {
    const { lat, lng, rideId, heading } = data || {}
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    // persist last known location for captain users
    if (socket.user && socket.user.role === 'captain') {
      try {
        await Captain.findByIdAndUpdate(socket.user.id, {
          currentLocation: { lat, lng, updatedAt: new Date() },
        })
      } catch (e) { console.warn(e) }
    }

    const ioEmitLocation = async () => {
      if (rideId) {
        try {
          // validate that the socket user is the assigned captain for this ride
          const ride = await require('./models/rideModel').findById(rideId)
          if (!ride) return
          // If ride has no assigned captain but this socket is a captain, assign it now
          if ((!ride.captainId || String(ride.captainId) === 'null') && socket.user?.id && socket.user.role === 'captain') {
            try {
              ride.captainId = socket.user.id
              if (!ride.status || ride.status === 'pending') ride.status = 'ongoing'
              await ride.save()
              console.log('Assigned captain', socket.user.id, 'to ride', rideId)
            } catch (assignErr) { console.warn('Failed to assign captain to ride', assignErr) }
          }

          if (String(ride.captainId) !== String(socket.user?.id)) {
            // ignore updates from non-assigned users
            return
          }
          
          // Update active ride with current location and track trail (Where is My Train style)
          let activeRide = activeRides.get(String(rideId))
          if (!activeRide) {
            // Create an activeRides entry from DB ride so users can discover and subscribe
            activeRide = {
              rideId: String(rideId),
              captainId: String(ride.captainId || socket.user?.id),
              captainEmail: undefined,
              captainName: undefined,
              pickupCoords: ride.pickupCoords || null,
              dropCoords: ride.dropCoords || null,
              route: ride.route || [],
              distance: ride.distance || 0,
              duration: ride.duration || 0,
              status: ride.status || 'active',
              startLocation: null,
              last: null,
              trail: [],
            }
            // determine activeRide.size with clear precedence: ride.size -> captain.seatingCapacity -> default 4
            try {
              let finalSize = undefined
              if (typeof ride.size === 'number') finalSize = ride.size
              else if (ride.captainId) {
                const cap = await Captain.findById(ride.captainId).select('seatingCapacity')
                if (cap && typeof cap.seatingCapacity === 'number') finalSize = cap.seatingCapacity
              }
              if (typeof finalSize !== 'number') finalSize = 4
              activeRide.size = finalSize
            } catch (e) { /* ignore */ }
            activeRides.set(String(rideId), activeRide)
            try {
              // ensure captain socket is in the ride room
              socket.join(`ride:${rideId}`)
              // emit full ride info to any subscribers so user map can seed
              io.to(`ride:${rideId}`).emit('ride:info', activeRide)
              console.log('Emitted ride:info for ride', rideId)
              // notify match subscribers globally
              io.sockets.sockets.forEach((s) => emitMatches(s))
            } catch (e) { console.warn('Failed to emit ride:info or join room', e) }
          }
          if (activeRide) {
            if (!activeRide.startLocation) {
              activeRide.startLocation = { lat, lng, ts: Date.now() }
              console.log('🚗 Captain started from:', activeRide.startLocation)
            }
            
            // Add to captain's trail (like train's path)
            activeRide.trail.push({ lat, lng, ts: Date.now() })
            activeRide.last = { lat, lng, ts: Date.now() }
            activeRides.set(String(rideId), activeRide)
            
            console.log('📍 Captain location update:', { lat, lng }, 'Trail length:', activeRide.trail.length)
          }
          
          // emit location update to ride room
          io.to(`ride:${rideId}`).emit('ride:location', { lat, lng, heading, ts: Date.now(), captainId: socket.user?.id, rideId })

          // compute ETA and remaining steps: call OSRM route from current pos to dropCoords
          if (ride.dropCoords && typeof ride.dropCoords.lng === 'number' && typeof ride.dropCoords.lat === 'number') {
            try {
              const fromLng = lng
              const fromLat = lat
              const toLng = ride.dropCoords.lng
              const toLat = ride.dropCoords.lat
              const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false&geometries=geojson&steps=true`
              const resp = await fetch(url)
              if (resp.ok) {
                const d = await resp.json()
                const duration = d.routes?.[0]?.duration || 0
                const distance = d.routes?.[0]?.distance || 0
                const steps = (d.routes && d.routes[0] && d.routes[0].legs && d.routes[0].legs[0] && d.routes[0].legs[0].steps) || []
                io.to(`ride:${rideId}`).emit('ride:eta', { duration, distance, steps })
              }
            } catch (e) { console.warn('OSRM ETA calc failed', e) }
          }
        } catch (e) { console.warn(e) }
      } else if (socket.user?.id) {
        io.to(`captain:${socket.user.id}`).emit('captain:location', { lat, lng, heading, ts: Date.now() })
      }
    }

    // call the async emitter
    ioEmitLocation()
  })
})

// Socket authentication: verify JWT on handshake
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return next()
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me')
    socket.user = payload // { id, role }
    next()
  } catch (e) {
    // Allow connection but without user context; or call next(new Error('auth')) to block
    next()
  }
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`)
  console.log(`🌐 Server URL: http://localhost:${PORT}`)
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/test-accepted-rides`)
  console.log(`📊 Accepted rides API: http://localhost:${PORT}/api/accepted-rides`)
  console.log('✅ Server startup complete!')
})


