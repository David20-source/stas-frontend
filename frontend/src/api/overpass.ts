/**
 * OpenStreetMap Overpass API client for Uganda road network.
 *
 * Source: OpenStreetMap contributors (2017). Uganda Roads (OpenStreetMap Export).
 * Humanitarian Data Exchange. https://data.humdata.org/dataset/304c24c5-2a71-4839-9d99-3562facbfb0d
 *
 * The HDX dataset is a periodic export of OSM data. Using Overpass API directly
 * gives the same data, always current, with no rate limits for reasonable queries.
 */

export type OsmHighwayType =
  | 'motorway' | 'motorway_link'
  | 'trunk'    | 'trunk_link'
  | 'primary'  | 'primary_link'
  | 'secondary'| 'secondary_link'
  | 'tertiary' | 'tertiary_link'
  | 'unclassified' | 'residential' | 'track' | 'path'

export type OsmRoadSegment = {
  id: number
  name: string
  ref: string            // e.g. "A109", "B7"
  highway: OsmHighwayType
  surface: string        // 'paved' | 'unpaved' | 'asphalt' | ...
  geometry: [number, number][]   // [lat, lng][]
  maxspeed: string       // e.g. "80", "100 mph"
  oneway: boolean
  lanes: number
}

type OverpassElement = {
  type: 'way'
  id: number
  tags: Record<string, string>
  geometry: { lat: number; lon: number }[]
}

type OverpassResponse = {
  elements: OverpassElement[]
}

/** Cache key for sessionStorage */
const CACHE_KEY = 'ug_roads_osm_v3'

/**
 * Overpass QL query for Uganda's road network.
 * Fetches motorway → tertiary roads within Uganda's admin boundary.
 * Uses area relation 192796 (Uganda in OSM) for reliability.
 */
function buildQuery(types: OsmHighwayType[]): string {
  const typeFilter = types.join('|')
  return `
[out:json][timeout:90][maxsize:134217728];
area(3600192796)->.uganda;
(
  way["highway"~"^(${typeFilter})$"](area.uganda);
);
out geom qt;
`.trim()
}

/** Parse a raw Overpass element into a clean OsmRoadSegment */
function parseElement(el: OverpassElement): OsmRoadSegment | null {
  if (!el.geometry || el.geometry.length < 2) return null
  const tags = el.tags ?? {}
  return {
    id:       el.id,
    name:     tags['name'] ?? tags['name:en'] ?? '',
    ref:      tags['ref'] ?? '',
    highway:  (tags['highway'] ?? 'unclassified') as OsmHighwayType,
    surface:  tags['surface'] ?? '',
    maxspeed: tags['maxspeed'] ?? '',
    oneway:   tags['oneway'] === 'yes',
    lanes:    parseInt(tags['lanes'] ?? '0') || 0,
    geometry: el.geometry.map((p) => [p.lat, p.lon] as [number, number]),
  }
}

/**
 * Fetch Uganda road segments from the Overpass API.
 * Results are cached in sessionStorage for the page session.
 *
 * @param types   OSM highway types to include (default: trunk + primary + secondary)
 * @param signal  Optional AbortSignal
 */
export async function fetchUgandaOsmRoads(
  types: OsmHighwayType[] = ['trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'],
  signal?: AbortSignal,
): Promise<OsmRoadSegment[]> {
  // Check session cache first
  const cacheKey = `${CACHE_KEY}_${types.join(',')}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try { return JSON.parse(cached) as OsmRoadSegment[] } catch { /* ignore */ }
  }

  const body = buildQuery(types)

  // Try multiple Overpass mirrors in sequence
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]

  let lastError: Error | null = null
  for (const endpoint of mirrors) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(body)}`,
        signal,
      })
      if (!res.ok) throw new Error(`Overpass ${res.status}`)
      const data: OverpassResponse = await res.json()
      const segments = data.elements
        .filter((e) => e.type === 'way')
        .map(parseElement)
        .filter((s): s is OsmRoadSegment => s !== null)

      // Cache for this session
      try { sessionStorage.setItem(cacheKey, JSON.stringify(segments)) } catch { /* quota full */ }
      return segments
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError ?? new Error('All Overpass mirrors failed')
}

/** Road display order (lower = drawn first = under other roads) */
export const HIGHWAY_Z_ORDER: Record<string, number> = {
  motorway:       10,
  motorway_link:  9,
  trunk:          8,
  trunk_link:     7,
  primary:        6,
  primary_link:   5,
  secondary:      4,
  secondary_link: 3,
  tertiary:       2,
  tertiary_link:  1,
  unclassified:   0,
  residential:    0,
}

/** Base stroke weight per road type */
export const HIGHWAY_WEIGHT: Record<string, number> = {
  motorway:    5,
  trunk:       4.5,
  primary:     3.5,
  secondary:   2.5,
  tertiary:    1.5,
  unclassified: 1,
  residential:  1,
}
