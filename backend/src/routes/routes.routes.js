'use strict'
const express = require('express')
const { supabaseAdmin, isConfigured } = require('../config/supabase')

const routesRouter = express.Router()

// All 12 monitored corridors — used as fallback when DB not configured
const SEED_ROUTES = [
  { id: 'R001', name: 'Entebbe Road',      start_location: 'Kampala CBD',     end_location: 'Entebbe Airport', length_km: 42, current_status: 'HEAVY',    congestion_index: 72 },
  { id: 'R002', name: 'Jinja Road',         start_location: 'Kampala CBD',     end_location: 'Mukono',          length_km: 21, current_status: 'CRITICAL',  congestion_index: 85 },
  { id: 'R003', name: 'Northern Bypass',    start_location: 'Busega Junction', end_location: 'Kyebando',        length_km: 22, current_status: 'MODERATE',  congestion_index: 38 },
  { id: 'R004', name: 'Kampala Road',       start_location: 'Clock Tower',     end_location: 'Mukono',          length_km: 16, current_status: 'CRITICAL',  congestion_index: 91 },
  { id: 'R005', name: 'Ggaba Road',         start_location: 'Centenary Park',  end_location: 'Ggaba',           length_km:  9, current_status: 'MODERATE',  congestion_index: 28 },
  { id: 'R006', name: 'Gayaza Road',        start_location: 'Kampala CBD',     end_location: 'Gayaza',          length_km: 20, current_status: 'HEAVY',     congestion_index: 55 },
  { id: 'R007', name: 'Masaka Road',        start_location: 'Kampala CBD',     end_location: 'Nsangi',          length_km: 12, current_status: 'CLEAR',     congestion_index: 18 },
  { id: 'R008', name: 'Bombo Road',         start_location: 'Kampala CBD',     end_location: 'Bombo',           length_km: 38, current_status: 'HEAVY',     congestion_index: 62 },
  { id: 'R009', name: 'Portbell Road',      start_location: 'Nakawa',          end_location: 'Portbell',        length_km:  8, current_status: 'MODERATE',  congestion_index: 44 },
  { id: 'R010', name: 'Nansana Corridor',   start_location: 'Kampala CBD',     end_location: 'Nansana',         length_km:  9, current_status: 'CRITICAL',  congestion_index: 77 },
  { id: 'R011', name: 'Namirembe Road',     start_location: 'Old Taxi Park',   end_location: 'Lubaga',          length_km:  3, current_status: 'HEAVY',     congestion_index: 50 },
  { id: 'R012', name: 'Mukwano Road',       start_location: 'Katwe',           end_location: 'Industrial Area', length_km:  4, current_status: 'MODERATE',  congestion_index: 33 },
]

// ── GET /api/routes ────────────────────────────────────────────────
routesRouter.get('/', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('routes')
        .select('*')
        .order('id')
      if (error) throw error
      return res.json(data)
    }
    res.json(SEED_ROUTES)
  } catch (err) { next(err) }
})

// ── GET /api/routes/:id ────────────────────────────────────────────
routesRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('routes')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) return res.status(404).json({ error: 'Route not found' })
      return res.json(data)
    }

    const route = SEED_ROUTES.find((r) => r.id === id)
    if (!route) return res.status(404).json({ error: 'Route not found' })
    res.json(route)
  } catch (err) { next(err) }
})

// ── GET /api/routes/:id/history ────────────────────────────────────
// Returns 24-hour congestion history. Uses Supabase predictions table
// when available, otherwise generates a realistic sine-wave pattern.
routesRouter.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params

    if (isConfigured) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabaseAdmin
        .from('predictions')
        .select('congestion_index, predicted_at')
        .eq('route_id', id)
        .gte('predicted_at', since)
        .order('predicted_at')
      if (data?.length) {
        return res.json({
          route_id: id,
          points: data.map((p) => ({
            hour: new Date(p.predicted_at).getHours(),
            avg_congestion_index: p.congestion_index,
          })),
        })
      }
    }

    // Fallback: realistic pattern using route's base index
    const route    = SEED_ROUTES.find((r) => r.id === id)
    const base     = route?.congestion_index ?? 50
    const points   = Array.from({ length: 24 }, (_, hour) => {
      // Rush-hour peaks at 8 and 18, night trough at 3
      const rush  = Math.exp(-0.5 * ((hour - 8) / 1.5) ** 2) * 35
                  + Math.exp(-0.5 * ((hour - 18) / 1.5) ** 2) * 38
      const night = hour < 5 || hour > 22 ? -20 : 0
      const noise = (Math.random() - 0.5) * 8
      return { hour, avg_congestion_index: Math.round(Math.max(0, Math.min(100, base * 0.5 + rush + night + noise))) }
    })
    res.json({ route_id: id, points })
  } catch (err) { next(err) }
})

module.exports = { routesRouter }
