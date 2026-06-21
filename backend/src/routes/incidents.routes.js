'use strict'
const express = require('express')
const crypto  = require('crypto')
const { z }   = require('zod')

const { supabaseAdmin, isConfigured }  = require('../config/supabase')
const { optionalAuth, requireAuth }    = require('../middleware/auth.middleware')
const { requireRole }                  = require('../middleware/rbac.middleware')
const socketService                    = require('../services/socket.service')
const { devIncidents }                 = require('../store/devStore')

const incidentsRouter = express.Router()

// ── Schemas ────────────────────────────────────────────────────────
const IncidentType     = z.enum(['JAM', 'ACCIDENT', 'WORKS', 'FLOODING', 'LIGHT', 'CONVOY', 'OTHER'])
const IncidentSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const IncidentStatus   = z.enum(['PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED'])

const CreateIncidentSchema = z.object({
  route_id:     z.string().optional().nullable(),
  type:         IncidentType,
  severity:     IncidentSeverity,
  latitude:     z.number().min(-90).max(90),
  longitude:    z.number().min(-180).max(180),
  address:      z.string().max(512).optional(),
  description:  z.string().min(20).max(500),
  photo_urls:   z.array(z.string().url()).max(3).optional().default([]),
  is_anonymous: z.boolean().optional().default(false),
  contact:      z.string().optional().nullable(),
})

// ── GET /api/incidents ─────────────────────────────────────────────
incidentsRouter.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { route_id, type, severity, status: statusQ, limit = '50' } = req.query

    if (isConfigured) {
      let query = supabaseAdmin.from('incidents').select('*').order('created_at', { ascending: false }).limit(Number(limit))
      if (route_id)  query = query.eq('route_id', route_id)
      if (type)      query = query.eq('type', type)
      if (severity)  query = query.eq('severity', severity)
      if (statusQ)   query = query.eq('status', statusQ)
      const { data, error } = await query
      if (error) throw error
      return res.json({ items: data, total: data.length })
    }

    let items = [...devIncidents]
    if (route_id) items = items.filter((i) => i.route_id === route_id)
    if (type)     items = items.filter((i) => i.type === type)
    if (severity) items = items.filter((i) => i.severity === severity)
    if (statusQ)  items = items.filter((i) => i.status === statusQ)
    res.json({ items: items.slice(0, Number(limit)), total: items.length })
  } catch (err) { next(err) }
})

// ── GET /api/incidents/:id ─────────────────────────────────────────
incidentsRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.from('incidents').select('*').eq('id', id).single()
      if (error || !data) return res.status(404).json({ error: 'Incident not found' })
      return res.json(data)
    }

    const incident = devIncidents.find((i) => i.id === id)
    if (!incident) return res.status(404).json({ error: 'Incident not found' })
    res.json(incident)
  } catch (err) { next(err) }
})

// ── POST /api/incidents ────────────────────────────────────────────
incidentsRouter.post('/', optionalAuth, async (req, res, next) => {
  try {
    const body = CreateIncidentSchema.parse(req.body)
    const now  = new Date().toISOString()

    const incident = {
      id:          crypto.randomUUID(),
      ...body,
      status:      'PENDING',
      reported_by: req.user?.id || null,
      created_at:  now,
      resolved_at: null,
    }

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.from('incidents').insert(incident).select().single()
      if (error) throw error
      socketService.emit('incident:new', { incident: data })
      // Also notify the route room
      if (data.route_id) socketService.emitToRoom(`route:${data.route_id}`, 'incident:new', { incident: data })
      return res.status(201).json(data)
    }

    devIncidents.unshift(incident)
    socketService.emit('incident:new', { incident })
    if (incident.route_id) socketService.emitToRoom(`route:${incident.route_id}`, 'incident:new', { incident })
    res.status(201).json(incident)
  } catch (err) { next(err) }
})

// ── PATCH /api/incidents/:id/status — OFFICER+ ─────────────────────
incidentsRouter.patch('/:id/status', requireAuth, requireRole('OFFICER'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: IncidentStatus }).parse(req.body)
    const { id }     = req.params
    const updates    = { status, ...(status === 'RESOLVED' ? { resolved_at: new Date().toISOString() } : {}) }

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.from('incidents').update(updates).eq('id', id).select().single()
      if (error || !data) return res.status(404).json({ error: 'Incident not found' })
      socketService.emit('incident:updated', { incident: data })
      return res.json(data)
    }

    const idx = devIncidents.findIndex((i) => i.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    Object.assign(devIncidents[idx], updates)
    socketService.emit('incident:updated', { incident: devIncidents[idx] })
    res.json(devIncidents[idx])
  } catch (err) { next(err) }
})

// ── POST /api/incidents/:id/verify — OFFICER+ ─────────────────────
incidentsRouter.post('/:id/verify', requireAuth, requireRole('OFFICER'), async (req, res, next) => {
  try {
    const { id }  = req.params
    const updates = { status: 'VERIFIED', verified_by: req.user.id }

    if (isConfigured) {
      const { data, error } = await supabaseAdmin.from('incidents').update(updates).eq('id', id).select().single()
      if (error || !data) return res.status(404).json({ error: 'Incident not found' })
      socketService.emit('incident:updated', { incident: data })
      return res.json(data)
    }

    const idx = devIncidents.findIndex((i) => i.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Incident not found' })
    Object.assign(devIncidents[idx], updates)
    socketService.emit('incident:updated', { incident: devIncidents[idx] })
    res.json(devIncidents[idx])
  } catch (err) { next(err) }
})

module.exports = { incidentsRouter }
