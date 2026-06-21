const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()

const { createApp } = require('./app')
const { registerSocketHandlers } = require('./socket/socketHandlers')
const socketService = require('./services/socket.service')

const PORT = process.env.PORT || 5000

const app = createApp()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
})

socketService.init(io)
registerSocketHandlers(io)

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[STAS backend] listening on http://localhost:${PORT}`)
})

