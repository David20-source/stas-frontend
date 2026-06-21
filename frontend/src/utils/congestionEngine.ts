/**
 * Congestion engine for Uganda roads.
 *
 * Combines:
 *  1. Road classification (OSM highway type → base congestion risk)
 *  2. Time-of-day peak-hour multipliers (Kampala/Uganda traffic patterns)
 *  3. Per-road overrides from our UGANDA_ROUTES static dataset
 *  4. Live prediction snapshots from the backend store
 *
 * Returns a congestion score 0–100 and a display status for any road.
 */

import { UGANDA_ROUTES } from './ugandaRoutes'
import type { OsmHighwayType } from '../api/overpass'

export type CongestionStatus = 'CLEAR' | 'MODERATE' | 'HEAVY' | 'CRITICAL' | 'UNKNOWN'

export type RoadCongestion = {
  score:  number           // 0–100
  status: CongestionStatus
  color:  string           // hex
  label:  string           // 'Clear' | 'Moderate' | 'Heavy' | 'Critical'
}

// ── Status thresholds ─────────────────────────────────────────────────────

export function scoreToStatus(score: number): CongestionStatus {
  if (score < 25)  return 'CLEAR'
  if (score < 50)  return 'MODERATE'
  if (score < 75)  return 'HEAVY'
  return 'CRITICAL'
}

export const STATUS_COLOR: Record<CongestionStatus, string> = {
  CLEAR:    '#00e676',
  MODERATE: '#ffcc02',
  HEAVY:    '#ff8c00',
  CRITICAL: '#ff2222',
  UNKNOWN:  '#6b7280',
}

export const STATUS_LABEL: Record<CongestionStatus, string> = {
  CLEAR:    'Clear',
  MODERATE: 'Moderate',
  HEAVY:    'Heavy',
  CRITICAL: 'Critical',
  UNKNOWN:  'Unknown',
}

// ── Base risk by road type ────────────────────────────────────────────────
// Reflects Uganda-specific traffic patterns: urban trunk roads are heavily
// congested (Kampala's notorious jams), while rural primary roads are clearer.

const BASE_RISK: Record<string, number> = {
  motorway:        25,   // rare in Uganda, usually clear
  motorway_link:   20,
  trunk:           65,   // Entebbe Rd, Jinja Rd — notorious for jams
  trunk_link:      55,
  primary:         45,   // major inter-city roads
  primary_link:    35,
  secondary:       30,   // regional connectors
  secondary_link:  25,
  tertiary:        20,
  tertiary_link:   15,
  unclassified:    15,
  residential:     18,
  track:           5,
  path:            5,
}

// ── Time-of-day multipliers ───────────────────────────────────────────────
// Kampala peak hours: 7–9 AM and 5–8 PM (typical East African urban pattern)

type PeakSlot = { start: number; end: number; multiplier: number }

const PEAK_SLOTS: PeakSlot[] = [
  { start: 6,  end: 9,  multiplier: 1.55 },  // morning rush
  { start: 12, end: 13, multiplier: 1.15 },  // lunch
  { start: 17, end: 20, multiplier: 1.65 },  // evening rush (worst)
  { start: 20, end: 22, multiplier: 1.20 },  // post-rush
  { start: 0,  end: 5,  multiplier: 0.35 },  // overnight
]

function peakMultiplier(hour: number): number {
  for (const slot of PEAK_SLOTS) {
    if (hour >= slot.start && hour < slot.end) return slot.multiplier
  }
  return 1.0 // off-peak baseline
}

// ── Deterministic per-road jitter (stable, not random each render) ────────
// Uses the OSM way ID to add consistent variance — same road always gets
// roughly the same relative congestion vs its neighbours.

function roadJitter(osmId: number): number {
  // Simple but stable hash → -15 to +15 offset
  const h = Math.abs(Math.sin(osmId * 0.00137) * 10000)
  return ((h % 30) - 15)
}

// ── Named road overrides from static dataset ──────────────────────────────
// Build a name→congestionIndex lookup from UGANDA_ROUTES

const NAMED_ROAD_INDEX: Map<string, number> = new Map(
  UGANDA_ROUTES
    .filter((r) => r.name)
    .map((r) => [r.name.toLowerCase(), r.congestionIndex]),
)

function namedRoadOverride(name: string): number | null {
  if (!name) return null
  // exact match
  const exact = NAMED_ROAD_INDEX.get(name.toLowerCase())
  if (exact !== undefined) return exact
  // partial match (road names in OSM often differ slightly)
  for (const [key, val] of NAMED_ROAD_INDEX) {
    if (name.toLowerCase().includes(key) || key.includes(name.toLowerCase())) return val
  }
  return null
}

// ── Main scoring function ─────────────────────────────────────────────────

/**
 * Calculate a congestion score (0–100) for an OSM road segment.
 *
 * @param highway  OSM highway tag value
 * @param name     Road name (may be empty)
 * @param osmId    OSM way ID (for stable per-road jitter)
 * @param hour     Hour of day 0–23 (defaults to current local hour)
 */
export function calcRoadCongestion(
  highway: OsmHighwayType | string,
  name: string,
  osmId: number,
  hour: number = new Date().getHours(),
): RoadCongestion {
  // 1. Base risk from road type
  const base = BASE_RISK[highway] ?? 20

  // 2. Time-of-day multiplier
  const withPeak = base * peakMultiplier(hour)

  // 3. Stable per-road variance
  const withJitter = withPeak + roadJitter(osmId)

  // 4. Override with named road data if available
  const override = namedRoadOverride(name)
  const score = Math.min(100, Math.max(0, Math.round(
    override !== null
      ? override * peakMultiplier(hour)   // apply peak to override too
      : withJitter,
  )))

  const status = scoreToStatus(score)
  return {
    score,
    status,
    color:  STATUS_COLOR[status],
    label:  STATUS_LABEL[status],
  }
}

/**
 * Returns a descriptive summary of the current Uganda traffic condition.
 * Used in the map overlay legend.
 */
export function ugandaTrafficSummary(): { period: string; description: string } {
  const hour = new Date().getHours()
  if (hour >= 6  && hour < 9)  return { period: 'Morning Rush',   description: 'Heavy congestion on trunk roads. Allow extra time.' }
  if (hour >= 9  && hour < 12) return { period: 'Mid-Morning',    description: 'Moderate traffic on major routes.' }
  if (hour >= 12 && hour < 13) return { period: 'Lunch Hour',     description: 'Slight increase in urban congestion.' }
  if (hour >= 13 && hour < 17) return { period: 'Afternoon',      description: 'Traffic flowing steadily on most roads.' }
  if (hour >= 17 && hour < 20) return { period: 'Evening Rush',   description: 'Peak congestion. Expect delays on all major routes.' }
  if (hour >= 20 && hour < 22) return { period: 'Post-Rush',      description: 'Traffic easing. Secondary roads clearing.' }
  return { period: 'Off-Peak / Night', description: 'Roads generally clear across Uganda.' }
}
