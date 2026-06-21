/**
 * Nominatim (OpenStreetMap) geocoding for Uganda locations.
 * Used for free-text location search in the Route Planner.
 */

export type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
}

export type LocationSuggestion = {
  id: string
  label: string          // short human-readable name
  fullName: string       // full Nominatim display_name
  coords: [number, number]  // [lat, lng]
}

/** Nominatim search restricted to Uganda. Returns up to `limit` suggestions. */
export async function searchUgandaLocations(
  query: string,
  signal?: AbortSignal,
  limit = 6,
): Promise<LocationSuggestion[]> {
  if (!query.trim()) return []

  const params = new URLSearchParams({
    q:               query,
    format:          'json',
    addressdetails:  '1',
    limit:           String(limit),
    // Restrict results to Uganda bounding box: south,west,north,east
    viewbox:         '29.55,-1.49,35.00,4.25',
    bounded:         '1',
    countrycodes:    'ug',
  })

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`

  const res = await fetch(url, {
    signal,
    headers: { 'Accept-Language': 'en' },
  })
  if (!res.ok) throw new Error(`Nominatim returned ${res.status}`)

  const data: NominatimResult[] = await res.json()

  return data.map((item) => {
    // Build a short label: first 2 parts of display_name
    const parts = item.display_name.split(', ')
    const label = parts.slice(0, 2).join(', ')

    return {
      id:       String(item.place_id),
      label,
      fullName: item.display_name,
      coords:   [parseFloat(item.lat), parseFloat(item.lon)],
    }
  })
}

/** Reverse-geocode coordinates to a human-readable name. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string> {
  const params = new URLSearchParams({
    lat:    String(lat),
    lon:    String(lng),
    format: 'json',
    zoom:   '16',
  })
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } })
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`

  const data = await res.json()
  const parts = (data.display_name as string).split(', ')
  return parts.slice(0, 3).join(', ')
}
