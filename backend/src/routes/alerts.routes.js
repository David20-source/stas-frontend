'use strict'
const express = require('express')
const { z }   = require('zod')

const { supabaseAdmin, isConfigured } = require('../config/supabase')
const { requireAuth }                 = require('../middleware/auth.middleware')

const alertsRouter = express.Router()

// ── GET /api/alerts ────────────────────────────────────────────────
// Derives system alerts from active CRITICAL/HIGH incidents.
alertsRouter.get('/', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('incidents')
        .select('id, type, severity, address, route_id, created_at')
        .not('status', 'in', '(RESOLVED,REJECTED)')
        .in('severity', ['HIGH', 'CRITICAL'])
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error

      const items = (data || []).map((i) => ({
        id:       `alert-${i.id}`,
        type:     i.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title:    `${i.type} — ${i.address}`,
        route_id: i.route_id,
        created_at: i.created_at,
      }))
      return res.json({ items })
    }

    // Dev fallback: static sample alerts
    res.json({
      items: [
        { id: 'alert-001', type: 'CRITICAL', title: 'ACCIDENT — Kampala Road',  route_id: 'R004', created_at: new Date(Date.now() - 1800000).toISOString() },
        { id: 'alert-002', type: 'WARNING',  title: 'JAM — Jinja Road',          route_id: 'R002', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'alert-003', type: 'WARNING',  title: 'FLOODING — Nansana Junction', route_id: 'R010', created_at: new Date(Date.now() -  600000).toISOString() },
      ],
    })
  } catch (err) { next(err) }
})

// ── POST /api/alerts/subscribe ─────────────────────────────────────
alertsRouter.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      route_ids: z.array(z.string().min(1)).min(1),
      channel:   z.enum(['PUSH', 'SMS']).optional().default('PUSH'),
    }).parse(req.body)

    if (isConfigured) {
      // Store subscription for the authenticated user
      const rows = body.route_ids.map((route_id) => ({
        user_id:  req.user.id,
        route_id,
        channel:  body.channel,
      }))
      const { error } = await supabaseAdmin.from('alert_subscriptions').upsert(rows, { onConflict: 'user_id,route_id' })
      if (error) throw error
    }

    res.status(201).json({
      ok: true,
      subscription: { user_id: req.user.id, ...body },
      _note: isConfigured ? 'Subscription stored in Supabase' : 'Dev mode — subscription not persisted',
    })
  } catch (err) { next(err) }
})

module.exports = { alertsRouter }
