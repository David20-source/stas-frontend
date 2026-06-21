import { io, Socket } from 'socket.io-client'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

let socket: Socket | null = null

export function connectSocket(userId?: string, role?: string): Socket {
  if (socket?.connected) return socket

  socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] connected:', socket!.id)
    if (userId) {
      socket!.emit('user:join_room', { userId, role })
    }
  })

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('[socket] disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('[socket] connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
