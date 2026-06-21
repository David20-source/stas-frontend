'use strict'
const https = require('https')

/** Historical base congestion index per route (0–100). */
const ROUTE_BASE = {
  R001: 45, R002: 60, R003: 30, R004: 70,
  R005: 25, R006: 40, R007: 20, R008: 50,
  R009: 35, R010: 65, R011: 45, R012: 30,
}

const ROUTE_NAMES = {
  R001: 'Entebbe Road',    R002: 'Jinja Road',       R003: 'Northern Bypass',
  R004: 'Kampala Road',    R005: 'Ggaba Road',        R006: 'Gayaza Road',
  R007: 'Masaka Road',     R008: 'Bombo Road',        R009: 'Portbell Road',
  R010: 'Nansana Corridor',R011: 'Namirembe Road',    R012: 'Mukwano Road',
}

/**
 * Rule-based congestion prediction.
 * Mirrors the ML model's feature columns so it can be swapped for the real model.
 *
 * @param {object} f  Feature object (camelCase)
 * @returns {object}  Prediction result
 */
function predictCongestion(f) {
  const {
    routeId,
    hourOfDay,
    dayOfWeek,
    weatherCondition = 'Clear',
    rainfallMm       = 0,
    incidentsLast1hr = 0,
    eventsNearby     = false,
  } = f

  let index = ROUTE_BASE[routeId] ?? 40
  const isWeekend = dayOfWeek >= 5
  const factors   = []

  // ── Time of day ──────────────────────────────────────────────────
  if (!isWeekend) {
    if (hourOfDay >= 7 && hourOfDay <= 9) {
      index += 30; factors.push('morning_peak')
    } else if (hourOfDay >= 17 && hourOfDay <= 19) {
      index += 35; factors.push('evening_peak')
    } else if (hourOfDay >= 12 && hourOfDay <= 13) {
      index += 10; factors.push('lunch_hour')
    } else if (hourOfDay < 5 || hourOfDay >= 22) {
      index -= 25; factors.push('night_time')
    }
    // School-run overlap
    if ((hourOfDay === 7 || hourOfDay === 17) && !isWeekend) {
      index += 10; factors.push('school_run')
    }
  } else {
    factors.push('weekend')
    if (hourOfDay >= 9 && hourOfDay <= 13) {
      index += 10; factors.push('saturday_market')
    } else if (hourOfDay < 6 || hourOfDay >= 21) {
      index -= 20
    }
  }

  // ── Weather ──────────────────────────────────────────────────────
  if (weatherCondition === 'Heavy Rain') {
    index += 28; factors.push('heavy_rain')
  } else if (weatherCondition === 'Rain') {
    index += 15; factors.push('rainfall')
  } else if (weatherCondition === 'Fog') {
    index += 8;  factors.push('foggy')
  }
  if (rainfallMm > 5)       { index += 10; if (!factors.includes('rainfall')) factors.push('rainfall') }
  else if (rainfallMm > 2)  { index += 5 }

  // ── Incidents ────────────────────────────────────────────────────
  if (incidentsLast1hr > 0) {
    index += incidentsLast1hr * 7; factors.push('incident_nearby')
  }

  // ── Events ───────────────────────────────────────────────────────
  if (eventsNearby) { index += 20; factors.push('events_nearby') }

  // ── Random noise (simulate real-world variability) ────────────────
  index += (Math.random() - 0.5) * 8

  // ── Clamp & round ────────────────────────────────────────────────
  index = Math.max(0, Math.min(100, Math.round(index)))

  const congestionLevel =
    index < 25 ? 'CLEAR' : index < 50 ? 'MODERATE' : index < 75 ? 'HEAVY' : 'CRITICAL'

  // Speed: 60 km/h at index 0, ~5 km/h at index 100
  const avgSpeedKmh = Math.round(Math.max(5, 60 - index * 0.55) * 10) / 10

  // Clearance: scales from 0 → 90 minutes
  const estimatedClearanceMins = Math.max(0, Math.round(index * 0.9))

  // Confidence: higher at extremes, lower in middle
  const deviation  = Math.abs(index - 50) / 50
  const confidence = Math.round((0.62 + deviation * 0.30) * 100) / 100

  return {
    route_id:                   routeId,
    route_name:                 ROUTE_NAMES[routeId] || routeId,
    congestion_level:           congestionLevel,
    congestion_index:           index,
    confidence,
    predicted_avg_speed_kmh:    avgSpeedKmh,
    estimated_clearance_minutes: estimatedClearanceMins,
    prediction_timestamp:       new Date().toISOString(),
    contributing_factors:       factors,
  }
}

/**
 * Try to delegate to the Python ML service (optional).
 * Falls back to the rule-based engine if the service is unreachable.
 */
async function predictViaMLService(featurePayload) {
  const ML_URL = process.env.ML_SERVICE_URL
  if (!ML_URL) return null

  return new Promise((resolve) => {
    const body = JSON.stringify(featurePayload)
    const url  = new URL('/api/predict', ML_URL)

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout:  3000,
    }

    const mod = url.protocol === 'https:' ? https : require('http')
    const req = mod.request(options, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    })
    req.on('error',   () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.write(body)
    req.end()
  })
}

/**
 * Main predict function — tries ML service first, falls back to rule engine.
 */
async function predict(featurePayload) {
  const mlResult = await predictViaMLService(featurePayload)
  if (mlResult) return mlResult
  return predictCongestion(featurePayload)
}

/**
 * Build a prediction payload from current conditions for a route.
 * Used for the automatic batch refresh.
 */
function buildCurrentFeatures(routeId, incidentsCount = 0) {
  const now = new Date()
  return {
    routeId,
    hourOfDay:         now.getHours(),
    dayOfWeek:         now.getDay() === 0 ? 6 : now.getDay() - 1, // Mon=0, Sun=6
    isWeekend:         now.getDay() === 0 || now.getDay() === 6,
    weatherCondition:  'Clear',   // enriched by weather service when available
    rainfallMm:        0,
    temperatureCelsius: 24,
    incidentsLast1hr:  incidentsCount,
    eventsNearby:      false,
  }
}

module.exports = { predict, predictCongestion, buildCurrentFeatures, ROUTE_NAMES }
