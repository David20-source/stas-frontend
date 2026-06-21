'use strict'

let _io = null

/** Call once in server.js after creating the Socket.IO instance. */
function init(io) {
  _io = io
}

/** Broadcast an event to ALL connected clients. */
function emit(event, data) {
  _io?.emit(event, data)
}

/** Broadcast an event to a specific room. */
function emitToRoom(room, event, data) {
  _io?.to(room).emit(event, data)
}

function getIo() {
  return _io
}

/** Returns the number of currently connected sockets. */
function connectedCount() {
  return _io ? _io.sockets.sockets.size : 0
}

module.exports = { init, emit, emitToRoom, getIo, connectedCount }
