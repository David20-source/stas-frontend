'use strict'
const express = require('express')
const { z }   = require('zod')

const { supabaseAdmin, isConfigured }             = require('../config/supabase')
const { predict, buildCurrentFeatures, ROUTE_NAMES } = require('../services/prediction.service')

const predictionsRouter = express.Router()

// Shared in-memory cache of latest batch results
let _latestBatch = []

// ── Validation schema ──────────────────────────────────────────────
const FeatureSchema = z.object({
  route_id:            z.string().min(1),
  hour_of_day:         z.number().int().min(0).max(23),
  day_of_week:         z.number().int().min(0).max(6),
  weather_condition:   z.string().default('Clear'),
  rainfall_mm:         z.number().min(0).default(0),
  temperature_celsius: z.number().default(24),
  incidents_last_1hr:  z.number().int().min(0).default(0),
  events_nearby:       z.boolean().default(false),
})

// ── POST /api/predict — single route ──────────────────────────────
predictionsRouter.post('/', async (req, res, next) => {
  try {
    const body   = FeatureSchema.parse(req.body)
    const result = await predict({
      routeId:           body.route_id,
      hourOfDay:         body.hour_of_day,
      dayOfWeek:         body.day_of_week,
      weatherCondition:  body.weather_condition,
      rainfallMm:        body.rainfall_mm,
      temperatureCelsius:body.temperature_celsius,
      incidentsLast1hr:  body.incidents_last_1hr,
      eventsNearby:      body.events_nearby,
    })

    if (isConfigured) {
      await supabaseAdmin.from('predictions').insert({
        route_id:                   result.route_id,
        congestion_level:           result.congestion_level,
        congestion_index:           result.congestion_index,
        confidence:                 result.confidence,
        predicted_avg_speed_kmh:    result.predicted_avg_speed_kmh,
        estimated_clearance_mins:   result.estimated_clearance_minutes,
        contributing_factors:       result.contributing_factors,
        input_features:             body,
      })
    }

    res.json(result)
  } catch (err) { next(err) }
})

// ── POST /api/predict/batch — all routes ──────────────────────────
predictionsRouter.post('/batch', async (req, res, next) => {
  try {
    const requests = z.array(FeatureSchema).parse(req.body)
    const results  = await Promise.all(
      requests.map((r) => predict({
        routeId:           r.route_id,
        hourOfDay:         r.hour_of_day,
        dayOfWeek:         r.day_of_week,
        weatherCondition:  r.weather_condition,
        rainfallMm:        r.rainfall_mm,
        temperatureCelsius:r.temperature_celsius,
        incidentsLast1hr:  r.incidents_last_1hr,
        eventsNearby:      r.events_nearby,
      }))
    )

    _latestBatch = results

    if (isConfigured) {
      const rows = results.map((r) => ({
        route_id: r.route_id, congestion_level: r.congestion_level,
        congestion_index: r.congestion_index, confidence: r.confidence,
        predicted_avg_speed_kmh: r.predicted_avg_speed_kmh,
        estimated_clearance_mins: r.estimated_clearance_minutes,
        contributing_factors: r.contributing_factors,
      }))
      await supabaseAdmin.from('predictions').insert(rows)
    }

    res.json(results)
  } catch (err) { next(err) }
})

// ── GET /api/predict/latest ────────────────────────────────────────
predictionsRouter.get('/latest', async (_req, res, next) => {
  try {
    if (isConfigured) {
      // Fetch the most recent prediction for each route
      const { data, error } = await supabaseAdmin.rpc('latest_predictions_per_route')
      if (!error && data?.length) {
        return res.json({ items: data, predicted_at: data[0]?.predicted_at || new Date().toISOString() })
      }
    }

    // Return in-memory cache (populated by batch predict calls or socket refresh)
    if (_latestBatch.length) return res.json({ items: _latestBatch, predicted_at: _latestBatch[0]?.prediction_timestamp })

    // Cold-start: generate predictions for all 12 routes right now
    const all     = Object.keys(ROUTE_NAMES)
    const results = await Promise.all(all.map((id) => predict(buildCurrentFeatures(id))))
    _latestBatch  = results
    res.json({ items: results, predicted_at: results[0]?.prediction_timestamp })
  } catch (err) { next(err) }
})

// ── GET /api/predict/history/:routeId ─────────────────────────────
predictionsRouter.get('/history/:routeId', async (req, res, next) => {
  try {
    const { routeId } = req.params

    if (isConfigured) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabaseAdmin
        .from('predictions')
        .select('congestion_index, congestion_level, confidence, predicted_at')
        .eq('route_id', routeId)
        .gte('predicted_at', since)
        .order('predicted_at')
      if (error) throw error
      return res.json({ route_id: routeId, items: data })
    }

    res.json({ route_id: routeId, items: [] })
  } catch (err) { next(err) }
})

// Expose the in-memory cache for the socket service
function getLatestBatch()       { return _latestBatch }
function setLatestBatch(batch)  { _latestBatch = batch }

module.exports = { predictionsRouter, getLatestBatch, setLatestBatch }
