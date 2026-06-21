'use strict'
const express = require('express')
const { supabaseAdmin, isConfigured } = require('../config/supabase')

const analyticsRouter = express.Router()

// ── Fallback in-memory data for dev mode ───────────────────────────
const SEED_ROUTES = [
  { id: 'R001', congestion_index: 72, current_status: 'HEAVY'    },
  { id: 'R002', congestion_index: 85, current_status: 'CRITICAL' },
  { id: 'R003', congestion_index: 38, current_status: 'MODERATE' },
  { id: 'R004', congestion_index: 91, current_status: 'CRITICAL' },
  { id: 'R005', congestion_index: 28, current_status: 'MODERATE' },
  { id: 'R006', congestion_index: 55, current_status: 'HEAVY'    },
  { id: 'R007', congestion_index: 18, current_status: 'CLEAR'    },
  { id: 'R008', congestion_index: 62, current_status: 'HEAVY'    },
  { id: 'R009', congestion_index: 44, current_status: 'MODERATE' },
  { id: 'R010', congestion_index: 77, current_status: 'CRITICAL' },
  { id: 'R011', congestion_index: 50, current_status: 'HEAVY'    },
  { id: 'R012', congestion_index: 33, current_status: 'MODERATE' },
]

// ── GET /api/analytics/summary ─────────────────────────────────────
analyticsRouter.get('/summary', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const [{ count: activeIncidents }, { data: routes }, { data: lastPred }] = await Promise.all([
        supabaseAdmin.from('incidents').select('*', { count: 'exact', head: true }).not('status', 'in', '(RESOLVED,REJECTED)'),
        supabaseAdmin.from('routes').select('congestion_index, current_status'),
        supabaseAdmin.from('predictions').select('predicted_at').order('predicted_at', { ascending: false }).limit(1),
      ])
      const avg       = routes?.length ? Math.round(routes.reduce((s, r) => s + r.congestion_index, 0) / routes.length) : 0
      const affected  = routes?.filter((r) => r.current_status === 'HEAVY' || r.current_status === 'CRITICAL').length ?? 0
      return res.json({
        active_incidents:    activeIncidents || 0,
        avg_congestion_index: avg,
        affected_routes:     affected,
        last_prediction:     lastPred?.[0]?.predicted_at || new Date().toISOString(),
      })
    }

    // Dev fallback
    const avg      = Math.round(SEED_ROUTES.reduce((s, r) => s + r.congestion_index, 0) / SEED_ROUTES.length)
    const affected = SEED_ROUTES.filter((r) => r.current_status === 'HEAVY' || r.current_status === 'CRITICAL').length
    res.json({ active_incidents: 4, avg_congestion_index: avg, affected_routes: affected, last_prediction: new Date().toISOString() })
  } catch (err) { next(err) }
})

// ── GET /api/analytics/hourly ──────────────────────────────────────
analyticsRouter.get('/hourly', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('predictions')
        .select('congestion_index, predicted_at, route_id')
        .gte('predicted_at', since)
        .order('predicted_at')
      if (error) throw error

      // Group by hour
      const byHour = {}
      for (const row of data || []) {
        const hour = new Date(row.predicted_at).getHours()
        if (!byHour[hour]) byHour[hour] = []
        byHour[hour].push(row.congestion_index)
      }
      const points = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        avg_congestion_index: byHour[h]?.length
          ? Math.round(byHour[h].reduce((s, v) => s + v, 0) / byHour[h].length)
          : null,
      }))
      return res.json({ points })
    }

    // Dev fallback: generate realistic 24h pattern
    const points = Array.from({ length: 24 }, (_, hour) => {
      const rush  = Math.exp(-0.5 * ((hour - 8) / 1.5) ** 2) * 30 + Math.exp(-0.5 * ((hour - 18) / 1.5) ** 2) * 35
      const night = hour < 5 || hour > 22 ? -20 : 0
      return { hour, avg_congestion_index: Math.round(Math.max(5, Math.min(95, 45 + rush + night + (Math.random() - 0.5) * 8))) }
    })
    res.json({ points })
  } catch (err) { next(err) }
})

// ── GET /api/analytics/incidents/weekly ───────────────────────────
analyticsRouter.get('/incidents/weekly', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('incidents')
        .select('type, created_at')
        .gte('created_at', since)
      if (error) throw error

      const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const TYPES = ['JAM', 'ACCIDENT', 'WORKS', 'FLOODING', 'LIGHT', 'CONVOY', 'OTHER']
      const grid = {}
      DAYS.forEach((d) => { grid[d] = {}; TYPES.forEach((t) => { grid[d][t] = 0 }) })
      for (const row of data || []) {
        const jsDay = new Date(row.created_at).getDay()  // 0=Sun
        const day   = DAYS[jsDay === 0 ? 6 : jsDay - 1] // Mon=0
        if (grid[day] && row.type) grid[day][row.type]++
      }
      return res.json({ items: DAYS.map((day) => ({ day, ...grid[day] })) })
    }

    // Dev fallback: seed data
    const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const items = DAYS.map((day, i) => ({
      day,
      JAM:      Math.round(3 + Math.random() * 4 + (i < 5 ? 3 : 0)),
      ACCIDENT: Math.round(1 + Math.random() * 2),
      WORKS:    Math.round(Math.random() * 2),
      FLOODING: Math.round(Math.random()),
      LIGHT:    Math.round(Math.random()),
      CONVOY:   i === 2 ? 1 : 0,  // Wednesday convoy
      OTHER:    Math.round(Math.random()),
    }))
    res.json({ items })
  } catch (err) { next(err) }
})

// ── GET /api/analytics/routes/ranking ─────────────────────────────
analyticsRouter.get('/routes/ranking', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('routes')
        .select('id, name, congestion_index, current_status')
        .order('congestion_index', { ascending: false })
        .limit(10)
      if (error) throw error
      return res.json({ items: data })
    }

    const items = [...SEED_ROUTES]
      .sort((a, b) => b.congestion_index - a.congestion_index)
      .slice(0, 10)
    res.json({ items })
  } catch (err) { next(err) }
})

module.exports = { analyticsRouter }
