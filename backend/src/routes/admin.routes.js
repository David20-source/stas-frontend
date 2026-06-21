'use strict'
const express = require('express')
const { z }   = require('zod')

const { requireAuth }                               = require('../middleware/auth.middleware')
const { requireRole }                               = require('../middleware/rbac.middleware')
const { supabaseAdmin, isConfigured }               = require('../config/supabase')
const { devUsers, devIncidents }                    = require('../store/devStore')
const socketService                                 = require('../services/socket.service')
const { predict, buildCurrentFeatures, ROUTE_NAMES } = require('../services/prediction.service')

const adminRouter  = express.Router()
const SERVER_START = Date.now()

// All admin routes require authentication + ADMIN role
adminRouter.use(requireAuth, requireRole('ADMIN'))

// ── GET /api/admin/users ────────────────────────────────────────────
adminRouter.get('/users', async (_req, res, next) => {
  try {
    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, role, created_at, last_login')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.json({ users: data })
    }

    // Dev — strip password hashes before sending
    const users = devUsers.map(({ password_hash: _, ...u }) => u)
    res.json({ users })
  } catch (err) { next(err) }
})

// ── PATCH /api/admin/users/:id/role ────────────────────────────────
adminRouter.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = z.object({
      role: z.enum(['CITIZEN', 'OFFICER', 'ANALYST', 'ADMIN']),
    }).parse(req.body)
    const { id } = req.params

    if (id === req.user.id)
      return res.status(400).json({ error: 'Cannot change your own role' })

    if (isConfigured) {
      const { data, error } = await supabaseAdmin
        .from('users').update({ role }).eq('id', id).select().single()
      if (error || !data) return res.status(404).json({ error: 'User not found' })
      await supabaseAdmin.auth.admin.updateUserById(id, { user_metadata: { role } })
      return res.json(data)
    }

    const user = devUsers.find((u) => u.id === id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    user.role = role
    const { password_hash: _, ...safe } = user
    res.json(safe)
  } catch (err) { next(err) }
})

// ── DELETE /api/admin/users/:id ─────────────────────────────────────
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (id === req.user.id)
      return res.status(400).json({ error: 'Cannot delete your own account' })

    if (isConfigured) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (error) return res.status(404).json({ error: 'User not found' })
      await supabaseAdmin.from('users').delete().eq('id', id)
      return res.json({ ok: true })
    }

    const idx = devUsers.findIndex((u) => u.id === id)
    if (idx === -1) return res.status(404).json({ error: 'User not found' })
    devUsers.splice(idx, 1)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

// ── GET /api/admin/incidents ─────────────────────────────────────────
adminRouter.get('/incidents', async (req, res, next) => {
  try {
    const { status: statusQ, limit = '200' } = req.query

    if (isConfigured) {
      let query = supabaseAdmin
        .from('incidents').select('*')
        .order('created_at', { ascending: false }).limit(Number(limit))
      if (statusQ) query = query.eq('status', statusQ)
      const { data, error } = await query
      if (error) throw error
      return res.json({ items: data, total: data.length })
    }

    let items = [...devIncidents]
    if (statusQ) items = items.filter((i) => i.status === statusQ)
    res.json({ items: items.slice(0, Number(limit)), total: items.length })
  } catch (err) { next(err) }
})

// ── GET /api/admin/stats ─────────────────────────────────────────────
adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const uptimeSecs   = Math.floor((Date.now() - SERVER_START) / 1000)
    const socketCount  = socketService.connectedCount()

    if (isConfigured) {
      const [{ count: userCount }, { count: incidentCount }, { count: pendingCount }] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('incidents').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      ])
      return res.json({
        uptime_seconds:     uptimeSecs,
        socket_connections: socketCount,
        total_users:        userCount   || 0,
        total_incidents:    incidentCount || 0,
        pending_incidents:  pendingCount  || 0,
      })
    }

    res.json({
      uptime_seconds:     uptimeSecs,
      socket_connections: socketCount,
      total_users:        devUsers.length,
      total_incidents:    devIncidents.length,
      pending_incidents:  devIncidents.filter((i) => i.status === 'PENDING').length,
    })
  } catch (err) { next(err) }
})

// ── POST /api/admin/predict/broadcast ───────────────────────────────
// Immediately re-runs predictions for all routes and broadcasts via socket.
adminRouter.post('/predict/broadcast', async (_req, res, next) => {
  try {
    const routeIds    = Object.keys(ROUTE_NAMES)
    const predictions = await Promise.all(routeIds.map((id) => predict(buildCurrentFeatures(id))))
    socketService.emit('prediction:updated', { predictions })
    res.json({ ok: true, routes: predictions.length, broadcast_at: new Date().toISOString() })
  } catch (err) { next(err) }
})

module.exports = { adminRouter }
