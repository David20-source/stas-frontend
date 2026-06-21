'use strict'
const crypto = require('crypto')

function _hash(password) {
  return crypto.createHmac('sha256', 'stas-dev-salt').update(password).digest('hex')
}

/** Shared in-memory users — mutated directly by auth + admin routes. */
const devUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@stas.local', password_hash: _hash('admin123'),
    full_name: 'System Admin', role: 'ADMIN',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'officer@stas.local', password_hash: _hash('officer123'),
    full_name: 'Traffic Officer', role: 'OFFICER',
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'citizen@stas.local', password_hash: _hash('citizen123'),
    full_name: 'City Citizen', role: 'CITIZEN',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
]

/** Shared in-memory incidents — mutated directly by incidents + admin routes. */
const devIncidents = [
  {
    id: crypto.randomUUID(), route_id: 'R002', type: 'JAM', severity: 'HIGH',
    latitude: 0.3350, longitude: 32.6100, address: 'Jinja Road',
    description: 'Heavy traffic jam near Nakawa roundabout, vehicles backed up 2km',
    status: 'VERIFIED', is_anonymous: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: crypto.randomUUID(), route_id: 'R004', type: 'ACCIDENT', severity: 'CRITICAL',
    latitude: 0.3163, longitude: 32.5812, address: 'Kampala Road',
    description: 'Two-vehicle collision blocking inner lane at Clock Tower junction',
    status: 'PENDING', is_anonymous: true,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: crypto.randomUUID(), route_id: 'R001', type: 'WORKS', severity: 'MEDIUM',
    latitude: 0.3163, longitude: 32.5812, address: 'Entebbe Road (km 12)',
    description: 'Road resurfacing works underway, single lane in operation',
    status: 'VERIFIED', is_anonymous: false,
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: crypto.randomUUID(), route_id: 'R010', type: 'FLOODING', severity: 'HIGH',
    latitude: 0.3611, longitude: 32.5135, address: 'Nansana Junction',
    description: 'Flash flooding at low-lying crossing, water levels 30cm high',
    status: 'PENDING', is_anonymous: false,
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
]

module.exports = { devUsers, devIncidents, _hash }
