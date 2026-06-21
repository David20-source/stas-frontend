export type Route = {
  id: string
  name: string
  startLocation: string
  endLocation: string
  lengthKm: number
  congestionIndex: number
  status: 'CLEAR' | 'MODERATE' | 'HEAVY' | 'CRITICAL' | 'UNKNOWN'
  lat: number
  lng: number
  /** Approximate polyline coordinates [lat, lng][] for map display */
  coords: [number, number][]
}

export const KAMPALA_ROUTES: Route[] = [
  {
    id: 'R001', name: 'Entebbe Road', startLocation: 'Kampala CBD', endLocation: 'Entebbe Airport',
    lengthKm: 42, congestionIndex: 72, status: 'HEAVY', lat: 0.3163, lng: 32.5812,
    coords: [[0.3163, 32.5812], [0.2800, 32.5550], [0.2100, 32.5000], [0.1400, 32.4700], [0.0424, 32.4437]],
  },
  {
    id: 'R002', name: 'Jinja Road', startLocation: 'Kampala CBD', endLocation: 'Mukono',
    lengthKm: 21, congestionIndex: 85, status: 'CRITICAL', lat: 0.3350, lng: 32.6100,
    coords: [[0.3163, 32.5812], [0.3280, 32.5980], [0.3350, 32.6100], [0.3450, 32.6700], [0.3533, 32.7530]],
  },
  {
    id: 'R003', name: 'Northern Bypass', startLocation: 'Busega Junction', endLocation: 'Kyebando',
    lengthKm: 22, congestionIndex: 38, status: 'MODERATE', lat: 0.3400, lng: 32.5300,
    coords: [[0.3050, 32.5100], [0.3200, 32.5200], [0.3400, 32.5350], [0.3550, 32.5700], [0.3614, 32.6000]],
  },
  {
    id: 'R004', name: 'Kampala Road', startLocation: 'Clock Tower', endLocation: 'Mukono',
    lengthKm: 16, congestionIndex: 91, status: 'CRITICAL', lat: 0.3163, lng: 32.5812,
    coords: [[0.3163, 32.5812], [0.3220, 32.6000], [0.3350, 32.6300], [0.3450, 32.6900], [0.3533, 32.7530]],
  },
  {
    id: 'R005', name: 'Ggaba Road', startLocation: 'Centenary Park', endLocation: 'Ggaba',
    lengthKm: 9, congestionIndex: 28, status: 'MODERATE', lat: 0.3150, lng: 32.5780,
    coords: [[0.3100, 32.5750], [0.2900, 32.5870], [0.2650, 32.5980], [0.2380, 32.6100]],
  },
  {
    id: 'R006', name: 'Gayaza Road', startLocation: 'Kampala CBD', endLocation: 'Gayaza',
    lengthKm: 20, congestionIndex: 55, status: 'HEAVY', lat: 0.3200, lng: 32.5850,
    coords: [[0.3163, 32.5812], [0.3400, 32.5750], [0.3700, 32.5820], [0.4050, 32.6000]],
  },
  {
    id: 'R007', name: 'Masaka Road', startLocation: 'Kampala CBD', endLocation: 'Nsangi',
    lengthKm: 12, congestionIndex: 18, status: 'CLEAR', lat: 0.3160, lng: 32.5760,
    coords: [[0.3163, 32.5812], [0.3100, 32.5650], [0.3000, 32.5400], [0.2900, 32.5150]],
  },
  {
    id: 'R008', name: 'Bombo Road', startLocation: 'Kampala CBD', endLocation: 'Bombo',
    lengthKm: 38, congestionIndex: 62, status: 'HEAVY', lat: 0.3200, lng: 32.5820,
    coords: [[0.3163, 32.5812], [0.3320, 32.5720], [0.3600, 32.5620], [0.4100, 32.5480]],
  },
  {
    id: 'R009', name: 'Portbell Road', startLocation: 'Nakawa', endLocation: 'Portbell',
    lengthKm: 8, congestionIndex: 44, status: 'MODERATE', lat: 0.3350, lng: 32.6100,
    coords: [[0.3350, 32.6100], [0.3250, 32.6300], [0.3150, 32.6500]],
  },
  {
    id: 'R010', name: 'Nansana Corridor', startLocation: 'Kampala CBD', endLocation: 'Nansana',
    lengthKm: 9, congestionIndex: 77, status: 'CRITICAL', lat: 0.3611, lng: 32.5135,
    coords: [[0.3163, 32.5812], [0.3400, 32.5550], [0.3611, 32.5135]],
  },
  {
    id: 'R011', name: 'Namirembe Road', startLocation: 'Old Taxi Park', endLocation: 'Lubaga',
    lengthKm: 3, congestionIndex: 50, status: 'HEAVY', lat: 0.3147, lng: 32.5816,
    coords: [[0.3147, 32.5816], [0.3110, 32.5730], [0.3070, 32.5640]],
  },
  {
    id: 'R012', name: 'Mukwano Road', startLocation: 'Katwe', endLocation: 'Industrial Area',
    lengthKm: 4, congestionIndex: 33, status: 'MODERATE', lat: 0.3100, lng: 32.5700,
    coords: [[0.3100, 32.5750], [0.3060, 32.5690], [0.3010, 32.5630]],
  },
]

export const KAMPALA_CENTER: [number, number] = [0.3476, 32.5825]

export const KAMPALA_METRO_BOUNDS = {
  north: 0.5500, south: 0.0800, east: 32.8500, west: 32.3500,
}

export const LANDMARKS = {
  clockTower:     [0.3163, 32.5812] as [number, number],
  oldTaxiPark:    [0.3147, 32.5816] as [number, number],
  nakaseroMarket: [0.3297, 32.5750] as [number, number],
  entebbeAirport: [0.0424, 32.4437] as [number, number],
  kololo:         [0.3349, 32.5931] as [number, number],
  ntinda:         [0.3614, 32.6245] as [number, number],
  nansana:        [0.3611, 32.5135] as [number, number],
  kireka:         [0.3450, 32.6547] as [number, number],
  mukono:         [0.3533, 32.7530] as [number, number],
}

/** Hex colors for each congestion status — used for route polylines */
export const CONGESTION_COLOR: Record<string, string> = {
  CLEAR:    '#00e676',
  MODERATE: '#ffcc02',
  HEAVY:    '#ff8c00',
  CRITICAL: '#ff2222',
  UNKNOWN:  '#6b7280',
}
