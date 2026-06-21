'use strict'
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'stas-dev-secret'

/**
 * requireAuth — verifies the Bearer JWT in Authorization header.
 * Attaches req.user = { id, email, role, full_name }.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = {
      id:        payload.sub,
      email:     payload.email,
      role:      payload.role || 'CITIZEN',
      full_name: payload.name || '',
    }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * optionalAuth — same as requireAuth but never rejects.
 * Sets req.user if a valid token is present, otherwise leaves it undefined.
 */
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = {
      id:        payload.sub,
      email:     payload.email,
      role:      payload.role || 'CITIZEN',
      full_name: payload.name || '',
    }
  } catch { /* ignore */ }
  next()
}

module.exports = { requireAuth, optionalAuth }
