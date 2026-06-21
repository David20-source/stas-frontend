/**
 * Uganda-wide road network data for congestion prediction and scoring.
 * Covers major highways, regional roads, and urban corridors across all regions.
 */

export type UgandaRoute = {
  id: string
  name: string
  region: 'CENTRAL' | 'EASTERN' | 'NORTHERN' | 'WESTERN'
  startLocation: string
  endLocation: string
  lengthKm: number
  congestionIndex: number   // 0–100
  status: 'CLEAR' | 'MODERATE' | 'HEAVY' | 'CRITICAL' | 'UNKNOWN'
  lat: number               // midpoint lat
  lng: number               // midpoint lng
  coords: [number, number][]  // [lat, lng][] polyline
}

export const UGANDA_ROUTES: UgandaRoute[] = [
  // ── CENTRAL REGION ──────────────────────────────────────────────────────
  {
    id: 'UC001', name: 'Entebbe Road', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Entebbe Airport',
    lengthKm: 42, congestionIndex: 72, status: 'HEAVY', lat: 0.1900, lng: 32.5100,
    coords: [[0.3163, 32.5812], [0.2800, 32.5550], [0.2100, 32.5000], [0.1400, 32.4700], [0.0424, 32.4437]],
  },
  {
    id: 'UC002', name: 'Jinja Road / A109', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Jinja City',
    lengthKm: 82, congestionIndex: 85, status: 'CRITICAL', lat: 0.3900, lng: 32.9200,
    coords: [[0.3163, 32.5812], [0.3350, 32.6100], [0.3450, 32.6700], [0.3533, 32.7530], [0.4100, 32.8500], [0.4353, 33.2041]],
  },
  {
    id: 'UC003', name: 'Northern Bypass', region: 'CENTRAL',
    startLocation: 'Busega Junction', endLocation: 'Kyebando',
    lengthKm: 22, congestionIndex: 38, status: 'MODERATE', lat: 0.3400, lng: 32.5300,
    coords: [[0.3050, 32.5100], [0.3200, 32.5200], [0.3400, 32.5350], [0.3550, 32.5700], [0.3614, 32.6000]],
  },
  {
    id: 'UC004', name: 'Kampala Road', region: 'CENTRAL',
    startLocation: 'Clock Tower', endLocation: 'Mukono',
    lengthKm: 16, congestionIndex: 91, status: 'CRITICAL', lat: 0.3163, lng: 32.5812,
    coords: [[0.3163, 32.5812], [0.3220, 32.6000], [0.3350, 32.6300], [0.3450, 32.6900], [0.3533, 32.7530]],
  },
  {
    id: 'UC005', name: 'Ggaba Road', region: 'CENTRAL',
    startLocation: 'Centenary Park', endLocation: 'Ggaba',
    lengthKm: 9, congestionIndex: 28, status: 'MODERATE', lat: 0.2900, lng: 32.5870,
    coords: [[0.3100, 32.5750], [0.2900, 32.5870], [0.2650, 32.5980], [0.2380, 32.6100]],
  },
  {
    id: 'UC006', name: 'Gayaza Road', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Gayaza',
    lengthKm: 20, congestionIndex: 55, status: 'HEAVY', lat: 0.3700, lng: 32.5820,
    coords: [[0.3163, 32.5812], [0.3400, 32.5750], [0.3700, 32.5820], [0.4050, 32.6000]],
  },
  {
    id: 'UC007', name: 'Masaka Road / A109', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Masaka City',
    lengthKm: 135, congestionIndex: 32, status: 'MODERATE', lat: -0.1800, lng: 31.9000,
    coords: [[0.3163, 32.5812], [0.2900, 32.5400], [0.1500, 32.2000], [0.0000, 31.8000], [-0.3310, 31.7350]],
  },
  {
    id: 'UC008', name: 'Bombo Road / A1', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Bombo',
    lengthKm: 38, congestionIndex: 62, status: 'HEAVY', lat: 0.5800, lng: 32.5300,
    coords: [[0.3163, 32.5812], [0.3320, 32.5720], [0.3600, 32.5620], [0.5000, 32.5300], [0.5830, 32.5330]],
  },
  {
    id: 'UC009', name: 'Nansana Corridor', region: 'CENTRAL',
    startLocation: 'Kampala CBD', endLocation: 'Nansana',
    lengthKm: 9, congestionIndex: 77, status: 'CRITICAL', lat: 0.3611, lng: 32.5135,
    coords: [[0.3163, 32.5812], [0.3400, 32.5550], [0.3611, 32.5135]],
  },
  {
    id: 'UC010', name: 'Namirembe Road', region: 'CENTRAL',
    startLocation: 'Old Taxi Park', endLocation: 'Lubaga',
    lengthKm: 3, congestionIndex: 50, status: 'HEAVY', lat: 0.3110, lng: 32.5730,
    coords: [[0.3147, 32.5816], [0.3110, 32.5730], [0.3070, 32.5640]],
  },
  {
    id: 'UC011', name: 'Southern Bypass', region: 'CENTRAL',
    startLocation: 'Busega', endLocation: 'Gaba Road Junction',
    lengthKm: 28, congestionIndex: 25, status: 'CLEAR', lat: 0.2700, lng: 32.5500,
    coords: [[0.3050, 32.5100], [0.2850, 32.5200], [0.2700, 32.5500], [0.2600, 32.5900], [0.2550, 32.6200]],
  },
  {
    id: 'UC012', name: 'Portbell Road', region: 'CENTRAL',
    startLocation: 'Nakawa', endLocation: 'Portbell',
    lengthKm: 8, congestionIndex: 44, status: 'MODERATE', lat: 0.3250, lng: 32.6300,
    coords: [[0.3350, 32.6100], [0.3250, 32.6300], [0.3150, 32.6500]],
  },
  {
    id: 'UC013', name: 'Mukwano Road', region: 'CENTRAL',
    startLocation: 'Katwe', endLocation: 'Industrial Area',
    lengthKm: 4, congestionIndex: 33, status: 'MODERATE', lat: 0.3060, lng: 32.5690,
    coords: [[0.3100, 32.5750], [0.3060, 32.5690], [0.3010, 32.5630]],
  },
  {
    id: 'UC014', name: 'Kampala-Gulu Highway / A1', region: 'CENTRAL',
    startLocation: 'Kampala', endLocation: 'Gulu City',
    lengthKm: 340, congestionIndex: 30, status: 'MODERATE', lat: 1.5000, lng: 32.3000,
    coords: [[0.3163, 32.5812], [0.5830, 32.5330], [0.8000, 32.4500], [1.2000, 32.1000], [1.5500, 32.2000], [2.7740, 32.2990]],
  },
  {
    id: 'UC015', name: 'Kampala–Masaka–Mbarara Highway / A109', region: 'CENTRAL',
    startLocation: 'Kampala', endLocation: 'Mbarara City',
    lengthKm: 270, congestionIndex: 22, status: 'CLEAR', lat: -0.4800, lng: 31.3500,
    coords: [[0.3163, 32.5812], [-0.3310, 31.7350], [-0.7170, 30.6560]],
  },

  // ── EASTERN REGION ───────────────────────────────────────────────────────
  {
    id: 'UE001', name: 'Jinja–Iganga Road / A109', region: 'EASTERN',
    startLocation: 'Jinja City', endLocation: 'Iganga',
    lengthKm: 50, congestionIndex: 42, status: 'MODERATE', lat: 0.6100, lng: 33.4800,
    coords: [[0.4353, 33.2041], [0.5000, 33.3500], [0.6100, 33.4800]],
  },
  {
    id: 'UE002', name: 'Mbale Road / A109', region: 'EASTERN',
    startLocation: 'Iganga', endLocation: 'Mbale City',
    lengthKm: 80, congestionIndex: 35, status: 'MODERATE', lat: 1.0800, lng: 34.1750,
    coords: [[0.6100, 33.4800], [0.8000, 33.7500], [1.0800, 34.1750]],
  },
  {
    id: 'UE003', name: 'Mbale–Soroti Road / A1', region: 'EASTERN',
    startLocation: 'Mbale City', endLocation: 'Soroti',
    lengthKm: 120, congestionIndex: 18, status: 'CLEAR', lat: 1.5000, lng: 33.8000,
    coords: [[1.0800, 34.1750], [1.3000, 33.9000], [1.7143, 33.6129]],
  },
  {
    id: 'UE004', name: 'Tororo–Malaba Road', region: 'EASTERN',
    startLocation: 'Tororo', endLocation: 'Malaba Border',
    lengthKm: 25, congestionIndex: 55, status: 'HEAVY', lat: 0.6900, lng: 34.1700,
    coords: [[0.6919, 34.1810], [0.7100, 34.2500], [0.6300, 34.2950]],
  },
  {
    id: 'UE005', name: 'Jinja–Tororo Road', region: 'EASTERN',
    startLocation: 'Jinja', endLocation: 'Tororo',
    lengthKm: 110, congestionIndex: 28, status: 'MODERATE', lat: 0.5500, lng: 33.6500,
    coords: [[0.4353, 33.2041], [0.5500, 33.6500], [0.6919, 34.1810]],
  },
  {
    id: 'UE006', name: 'Busia Road', region: 'EASTERN',
    startLocation: 'Iganga', endLocation: 'Busia Border',
    lengthKm: 70, congestionIndex: 40, status: 'MODERATE', lat: 0.4200, lng: 33.8000,
    coords: [[0.6100, 33.4800], [0.4600, 33.7000], [0.4673, 34.0903]],
  },
  {
    id: 'UE007', name: 'Kumi–Soroti Road', region: 'EASTERN',
    startLocation: 'Kumi', endLocation: 'Soroti',
    lengthKm: 40, congestionIndex: 15, status: 'CLEAR', lat: 1.6000, lng: 33.7500,
    coords: [[1.4600, 33.9360], [1.5500, 33.8500], [1.7143, 33.6129]],
  },

  // ── NORTHERN REGION ──────────────────────────────────────────────────────
  {
    id: 'UN001', name: 'Gulu–Kitgum Road / A1', region: 'NORTHERN',
    startLocation: 'Gulu City', endLocation: 'Kitgum',
    lengthKm: 130, congestionIndex: 20, status: 'CLEAR', lat: 3.0000, lng: 32.7000,
    coords: [[2.7740, 32.2990], [3.0000, 32.7000], [3.2830, 32.8870]],
  },
  {
    id: 'UN002', name: 'Gulu–Lira Road', region: 'NORTHERN',
    startLocation: 'Gulu City', endLocation: 'Lira City',
    lengthKm: 115, congestionIndex: 25, status: 'CLEAR', lat: 2.2500, lng: 32.7000,
    coords: [[2.7740, 32.2990], [2.4000, 32.5000], [2.2497, 32.8998]],
  },
  {
    id: 'UN003', name: 'Lira–Soroti Road', region: 'NORTHERN',
    startLocation: 'Lira City', endLocation: 'Soroti',
    lengthKm: 95, congestionIndex: 18, status: 'CLEAR', lat: 2.0000, lng: 33.2500,
    coords: [[2.2497, 32.8998], [2.0000, 33.2500], [1.7143, 33.6129]],
  },
  {
    id: 'UN004', name: 'Arua–Gulu Road / A45', region: 'NORTHERN',
    startLocation: 'Arua City', endLocation: 'Gulu City',
    lengthKm: 195, congestionIndex: 15, status: 'CLEAR', lat: 2.9000, lng: 31.7000,
    coords: [[3.0207, 30.9106], [2.9000, 31.3000], [2.7740, 32.2990]],
  },
  {
    id: 'UN005', name: 'Lira–Kampala Road / A1', region: 'NORTHERN',
    startLocation: 'Lira City', endLocation: 'Kampala',
    lengthKm: 340, congestionIndex: 30, status: 'MODERATE', lat: 1.3000, lng: 32.5000,
    coords: [[2.2497, 32.8998], [1.7000, 32.5500], [1.2000, 32.3000], [0.5830, 32.5330], [0.3163, 32.5812]],
  },
  {
    id: 'UN006', name: 'Moyo–Adjumani Road', region: 'NORTHERN',
    startLocation: 'Moyo', endLocation: 'Adjumani',
    lengthKm: 90, congestionIndex: 12, status: 'CLEAR', lat: 3.5500, lng: 31.6000,
    coords: [[3.6544, 31.7184], [3.6000, 31.6000], [3.3797, 31.7828]],
  },

  // ── WESTERN REGION ───────────────────────────────────────────────────────
  {
    id: 'UW001', name: 'Mbarara–Fort Portal Road / A109', region: 'WESTERN',
    startLocation: 'Mbarara City', endLocation: 'Fort Portal City',
    lengthKm: 215, congestionIndex: 28, status: 'MODERATE', lat: 0.2000, lng: 30.7000,
    coords: [[-0.7170, 30.6560], [-0.2000, 30.5000], [0.2000, 30.7000], [0.6710, 30.2730]],
  },
  {
    id: 'UW002', name: 'Fort Portal–Kampala Highway / A109', region: 'WESTERN',
    startLocation: 'Fort Portal City', endLocation: 'Kampala',
    lengthKm: 300, congestionIndex: 35, status: 'MODERATE', lat: 0.4000, lng: 31.3000,
    coords: [[0.6710, 30.2730], [0.5000, 30.8000], [0.3500, 31.5000], [0.3163, 32.5812]],
  },
  {
    id: 'UW003', name: 'Mbarara–Kisoro Road / B7', region: 'WESTERN',
    startLocation: 'Mbarara', endLocation: 'Kisoro',
    lengthKm: 175, congestionIndex: 20, status: 'CLEAR', lat: -1.1000, lng: 29.9000,
    coords: [[-0.7170, 30.6560], [-1.0000, 30.2000], [-1.2892, 29.6980]],
  },
  {
    id: 'UW004', name: 'Kasese–Fort Portal Road', region: 'WESTERN',
    startLocation: 'Kasese', endLocation: 'Fort Portal City',
    lengthKm: 75, congestionIndex: 22, status: 'CLEAR', lat: 0.4500, lng: 30.0000,
    coords: [[0.1830, 30.0860], [0.4500, 30.1000], [0.6710, 30.2730]],
  },
  {
    id: 'UW005', name: 'Mbarara–Ntungamo Road', region: 'WESTERN',
    startLocation: 'Mbarara', endLocation: 'Ntungamo',
    lengthKm: 55, congestionIndex: 30, status: 'MODERATE', lat: -0.9000, lng: 30.2000,
    coords: [[-0.7170, 30.6560], [-0.9000, 30.2000], [-0.8789, 30.2655]],
  },
  {
    id: 'UW006', name: 'Kabale–Kisoro Road', region: 'WESTERN',
    startLocation: 'Kabale', endLocation: 'Kisoro',
    lengthKm: 95, congestionIndex: 15, status: 'CLEAR', lat: -1.2500, lng: 29.8500,
    coords: [[-1.2517, 29.9856], [-1.2700, 29.9000], [-1.2892, 29.6980]],
  },
  {
    id: 'UW007', name: 'Kampala–Mbarara Expressway / A109', region: 'WESTERN',
    startLocation: 'Kampala', endLocation: 'Mbarara',
    lengthKm: 270, congestionIndex: 22, status: 'CLEAR', lat: -0.2000, lng: 31.5000,
    coords: [[0.3163, 32.5812], [0.0000, 31.8000], [-0.3310, 31.7350], [-0.7170, 30.6560]],
  },
  {
    id: 'UW008', name: 'Hoima–Kampala Road', region: 'WESTERN',
    startLocation: 'Hoima City', endLocation: 'Kampala',
    lengthKm: 200, congestionIndex: 38, status: 'MODERATE', lat: 0.8500, lng: 31.8000,
    coords: [[1.4303, 31.3525], [1.1000, 31.6000], [0.8500, 31.8000], [0.5000, 32.0000], [0.3163, 32.5812]],
  },
]

/**
 * All combined routes for lookup by ID (Kampala short IDs R001-R012 map to UC001-UC013)
 */
export const ALL_ROUTE_IDS = UGANDA_ROUTES.map((r) => r.id)

/** Uganda bounding box for Nominatim search */
export const UGANDA_BOUNDS = {
  north: 4.2500,
  south: -1.4900,
  east: 35.0000,
  west: 29.5500,
}

/** Center of Uganda (near Kampala) */
export const UGANDA_CENTER: [number, number] = [1.3733, 32.2903]

/** Major city coordinates for quick-select suggestions */
export const UGANDA_CITIES: { name: string; coords: [number, number] }[] = [
  { name: 'Kampala CBD',        coords: [0.3163, 32.5812] },
  { name: 'Entebbe Airport',    coords: [0.0424, 32.4437] },
  { name: 'Jinja City',         coords: [0.4353, 33.2041] },
  { name: 'Mbale City',         coords: [1.0800, 34.1750] },
  { name: 'Gulu City',          coords: [2.7740, 32.2990] },
  { name: 'Mbarara City',       coords: [-0.7170, 30.6560] },
  { name: 'Fort Portal City',   coords: [0.6710, 30.2730] },
  { name: 'Lira City',          coords: [2.2497, 32.8998] },
  { name: 'Arua City',          coords: [3.0207, 30.9106] },
  { name: 'Soroti',             coords: [1.7143, 33.6129] },
  { name: 'Hoima City',         coords: [1.4303, 31.3525] },
  { name: 'Kabale',             coords: [-1.2517, 29.9856] },
  { name: 'Kisoro',             coords: [-1.2892, 29.6980] },
  { name: 'Masaka City',        coords: [-0.3310, 31.7350] },
  { name: 'Kasese',             coords: [0.1830, 30.0860] },
  { name: 'Tororo',             coords: [0.6919, 34.1810] },
  { name: 'Busia',              coords: [0.4673, 34.0903] },
  { name: 'Kitgum',             coords: [3.2830, 32.8870] },
  { name: 'Moyo',               coords: [3.6544, 31.7184] },
  { name: 'Ntungamo',           coords: [-0.8789, 30.2655] },
  { name: 'Mukono',             coords: [0.3533, 32.7530] },
  { name: 'Wakiso',             coords: [0.4067, 32.4581] },
  { name: 'Nansana',            coords: [0.3611, 32.5135] },
  { name: 'Gayaza',             coords: [0.4050, 32.6000] },
  { name: 'Old Taxi Park',      coords: [0.3147, 32.5816] },
  { name: 'Clock Tower',        coords: [0.3163, 32.5812] },
  { name: 'Nakawa',             coords: [0.3350, 32.6100] },
  { name: 'Kireka',             coords: [0.3450, 32.6547] },
  { name: 'Ntinda',             coords: [0.3614, 32.6245] },
  { name: 'Kololo',             coords: [0.3349, 32.5931] },
]

/** Hex colors for congestion status */
export const CONGESTION_COLOR: Record<string, string> = {
  CLEAR:    '#00e676',
  MODERATE: '#ffcc02',
  HEAVY:    '#ff8c00',
  CRITICAL: '#ff2222',
  UNKNOWN:  '#6b7280',
}
