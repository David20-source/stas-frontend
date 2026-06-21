'use strict'
const { predict, buildCurrentFeatures, ROUTE_NAMES } = require('../services/prediction.service')

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[socket] connected: ${socket.id}`)

    socket.on('user:join_room', ({ userId, role } = {}) => {
      // eslint-disable-next-line no-console
      console.log(`[socket] join_room userId=${userId} role=${role}`)
      socket.emit('user:joined', { ok: true })
    })

    socket.on('route:subscribe', ({ routeIds } = {}) => {
      if (!Array.isArray(routeIds)) return
      routeIds.forEach((routeId) => socket.join(`route:${routeId}`))
      socket.emit('route:subscribed', { ok: true, routeIds })
    })

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`[socket] disconnected: ${socket.id}`)
    })
  })

  // Broadcast real predictions every 60 seconds
  setInterval(async () => {
    try {
      const routeIds = Object.keys(ROUTE_NAMES)
      const predictions = await Promise.all(
        routeIds.map((id) => predict(buildCurrentFeatures(id)))
      )
      io.emit('prediction:updated', { predictions })
      // eslint-disable-next-line no-console
      console.log(`[socket] broadcasted predictions for ${predictions.length} routes`)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[socket] prediction broadcast error:', err.message)
    }
  }, 60_000)
}

module.exports = { registerSocketHandlers }
