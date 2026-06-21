import { KAMPALA_ROUTES } from '../utils/kampalaRoutes'
import { UGANDA_ROUTES } from '../utils/ugandaRoutes'
import type { Prediction } from '../store/useAppStore'

// ── Types ──────────────────────────────────────────────────────────────────

export type RouteStep = {
  instruction: string
  distance: number    // metres
  duration: number    // seconds
  maneuverType: string
}

/** Raw OSRM result — geometry + steps only, no congestion score. Stored in state. */
export type RawRoute = {
  index: number
  distance: number           // metres
  duration: number           // seconds
  geometry: [number, number][]  // [lat, lng] for Leaflet
  steps: RouteStep[]
}

/** Scored + labelled result derived from RawRoute + live predictions. */
export type RouteResult = RawRoute & {
  congestionScore: number              // 0–100, lower = less congested
  label: 'RECOMMENDED' | 'SHORTEST' | 'ALTERNATIVE'
}

// ── Helpers ────────────────────────────────────────────────────────────────

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = (b[0] - a[0]) * (Math.PI / 180)
  const dLng = (b[1] - a[1]) * (Math.PI / 180)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * (Math.PI / 180)) *
      Math.cos(b[0] * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stepToInstruction(s: any): string {
  const type     = s.maneuver?.type ?? ''
  const mod      = s.maneuver?.modifier ?? ''
  const roadName = s.name ? ` onto ${s.name}` : ''

  if (type === 'depart')  return `Head ${mod}${roadName}`
  if (type === 'arrive')  return 'Arrive at destination'
  if (type === 'roundabout' || type === 'rotary')
    return `Enter roundabout, take exit ${s.maneuver?.exit ?? ''}${roadName}`
  if (type === 'turn' || type === 'new name' || type === 'continue') {
    if (!mod || mod === 'straight') return `Continue straight${roadName}`
    return `Turn ${mod.replace('-', ' ')}${roadName}`
  }
  if (type === 'merge')       return `Merge ${mod}${roadName}`
  if (type === 'fork')        return `Keep ${mod} at fork${roadName}`
  if (type === 'on ramp' || type === 'off ramp') return `Take ramp ${mod}${roadName}`
  if (type === 'end of road') return `At end of road, turn ${mod}${roadName}`
  return `Continue${roadName}`
}

// ── Congestion scoring (pure — no network) ────────────────────────────────

/**
 * Score a single route geometry against the current prediction snapshot.
 * Returns 0–100 (lower = cleaner route). Called inside scoreAndLabel().
 */
function calcCongestionScore(
  geometry: [number, number][],
  predictions: Prediction[],
): number {
  const THRESHOLD_KM = 0.4
  let total = 0
  let hits  = 0

  // Score against both Kampala routes (with live predictions) and Uganda-wide routes
  const allRoutes = [
    ...KAMPALA_ROUTES.map((r) => ({ id: r.id, coords: r.coords, congestionIndex: r.congestionIndex })),
    ...UGANDA_ROUTES.map((r) => ({ id: r.id, coords: r.coords, congestionIndex: r.congestionIndex })),
  ]

  for (const route of allRoutes) {
    const pred = predictions.find((p) => p.routeId === route.id)
    const congestionIndex = pred?.congestionIndex ?? route.congestionIndex
    if (congestionIndex < 20) continue

    for (let i = 0; i < geometry.length; i += 5) {
      const pt = geometry[i]
      for (const rc of route.coords) {
        if (haversineKm(pt, rc) < THRESHOLD_KM) {
          total += congestionIndex
          hits++
          break
        }
      }
    }
  }

  return hits === 0 ? 0 : Math.min(100, Math.round(total / hits))
}

/**
 * Pure function — takes raw OSRM routes + latest predictions,
 * returns scored + labelled RouteResult[].
 *
 * Called from a useMemo so it re-runs automatically every time
 * predictions change (e.g. via WebSocket broadcast).
 */
export function scoreAndLabel(
  raw: RawRoute[],
  predictions: Prediction[],
): RouteResult[] {
  if (raw.length === 0) return []

  const scored = raw.map((r) => ({
    ...r,
    congestionScore: calcCongestionScore(r.geometry, predictions),
    label: 'ALTERNATIVE' as RouteResult['label'],
  }))

  // Shortest by distance
  const shortestIdx = scored.reduce(
    (best, r) => r.distance < scored[best].distance ? r.index : best, 0,
  )

  // Best combined: 60 % congestion + 40 % normalised distance
  const maxDist = Math.max(...scored.map((r) => r.distance))
  const recommendedIdx = scored.reduce((best, r) => {
    const score = r.congestionScore * 0.6 + (r.distance / maxDist) * 100 * 0.4
    const bestScore = scored[best].congestionScore * 0.6 + (scored[best].distance / maxDist) * 100 * 0.4
    return score < bestScore ? r.index : best
  }, 0)

  return scored.map((r) => ({
    ...r,
    label: r.index === recommendedIdx
      ? 'RECOMMENDED'
      : r.index === shortestIdx
        ? 'SHORTEST'
        : 'ALTERNATIVE',
  }))
}

// ── OSRM network fetch (call once per journey) ────────────────────────────

/**
 * Fetch raw route alternatives from OSRM. Returns geometry + steps only —
 * no congestion scoring. Pass the result to scoreAndLabel() separately.
 */
export async function fetchOsrmRoutes(
  origin:      [number, number],   // [lat, lng]
  destination: [number, number],   // [lat, lng]
  signal?: AbortSignal,
): Promise<RawRoute[]> {
  const coords = `${origin[1]},${origin[0]};${destination[1]},${destination[0]}`
  const url    = `https://router.project-osrm.org/route/v1/driving/${coords}`
               + `?overview=full&geometries=geojson&alternatives=true&steps=true`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Routing service returned ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok') throw new Error(data.message ?? 'No route found')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.routes.map((r: any, idx: number) => {
    const geometry: [number, number][] = r.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number],
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: RouteStep[] = (r.legs?.[0]?.steps ?? []).map((s: any) => ({
      instruction:  stepToInstruction(s),
      distance:     Math.round(s.distance),
      duration:     Math.round(s.duration),
      maneuverType: s.maneuver?.type ?? '',
    }))
    return { index: idx, distance: Math.round(r.distance), duration: Math.round(r.duration), geometry, steps }
  })
}

// ── Formatters ────────────────────────────────────────────────────────────

export function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

export function fmtDuration(s: number): string {
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

export function maneuverIcon(type: string, instruction: string): string {
  if (type === 'depart' || type === 'arrive') return '📍'
  if (instruction.includes('right')) return '↱'
  if (instruction.includes('left'))  return '↰'
  if (type === 'roundabout' || type === 'rotary') return '⟳'
  return '↑'
}
