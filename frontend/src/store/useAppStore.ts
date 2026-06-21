import { create } from 'zustand'
import { KAMPALA_ROUTES, type Route } from '../utils/kampalaRoutes'
import { type CongestionLevel } from '../utils/congestion'
import { api } from '../api/client'
import { mapIncident, mapPrediction } from '../api/mappers'

export type Prediction = {
  routeId: string
  routeName: string
  congestionLevel: CongestionLevel
  congestionIndex: number
  confidence: number
  predictedAvgSpeedKmh: number
  estimatedClearanceMins: number
  contributingFactors: string[]
  predictedAt: string
}

export type Incident = {
  id: string
  routeId: string | null
  type: 'JAM' | 'ACCIDENT' | 'WORKS' | 'FLOODING' | 'LIGHT' | 'CONVOY' | 'OTHER'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  latitude: number
  longitude: number
  address: string
  description: string
  status: 'PENDING' | 'VERIFIED' | 'RESOLVED' | 'REJECTED'
  createdAt: string
}

type AppState = {
  routes: Route[]
  predictions: Prediction[]
  incidents: Incident[]
  isConnected: boolean
  lastUpdated: string | null
  isFetching: boolean

  setPredictions: (predictions: Prediction[]) => void
  setIncidents: (incidents: Incident[]) => void
  addIncident: (incident: Incident) => void
  updateIncident: (id: string, patch: Partial<Incident>) => void
  setConnected: (v: boolean) => void
  setLastUpdated: (ts: string) => void
  fetchIncidents: () => Promise<void>
  fetchPredictions: () => Promise<void>
}

// Seed mock predictions from routes (shown while API loads)
const MOCK_PREDICTIONS: Prediction[] = KAMPALA_ROUTES.map((r) => ({
  routeId: r.id,
  routeName: r.name,
  congestionLevel: r.status === 'UNKNOWN' ? 'CLEAR' : r.status,
  congestionIndex: r.congestionIndex,
  confidence: 0.72 + Math.random() * 0.2,
  predictedAvgSpeedKmh: Math.max(5, 60 - r.congestionIndex * 0.55),
  estimatedClearanceMins: Math.round(r.congestionIndex * 0.6),
  contributingFactors: ['rush_hour', 'rainfall'].slice(0, r.congestionIndex > 50 ? 2 : 1),
  predictedAt: new Date().toISOString(),
}))

const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1', routeId: 'R002', type: 'JAM', severity: 'HIGH',
    latitude: 0.3350, longitude: 32.6100, address: 'Jinja Road, Nakawa Junction',
    description: 'Heavy standstill near Nakawa market.', status: 'VERIFIED',
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: '2', routeId: 'R004', type: 'ACCIDENT', severity: 'CRITICAL',
    latitude: 0.3200, longitude: 32.5850, address: 'Kampala Road, City Square',
    description: 'Multi-vehicle accident blocking 2 lanes.', status: 'VERIFIED',
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
  {
    id: '3', routeId: 'R001', type: 'WORKS', severity: 'MEDIUM',
    latitude: 0.2900, longitude: 32.5600, address: 'Entebbe Road, Kajjansi',
    description: 'Road construction — one lane closed.', status: 'PENDING',
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: '4', routeId: 'R010', type: 'FLOODING', severity: 'HIGH',
    latitude: 0.3611, longitude: 32.5135, address: 'Nansana Corridor, Kalerwe',
    description: 'Flash flooding after heavy rain — road partially submerged.', status: 'VERIFIED',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
]

export const useAppStore = create<AppState>((set) => ({
  routes: KAMPALA_ROUTES,
  predictions: MOCK_PREDICTIONS,
  incidents: MOCK_INCIDENTS,
  isConnected: false,
  lastUpdated: new Date().toISOString(),
  isFetching: false,

  setPredictions: (predictions) => set({ predictions, lastUpdated: new Date().toISOString() }),
  setIncidents:   (incidents)   => set({ incidents }),
  addIncident: (incident) =>
    set((s) => ({ incidents: [incident, ...s.incidents] })),
  updateIncident: (id, patch) =>
    set((s) => ({
      incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  setConnected:   (v)  => set({ isConnected: v }),
  setLastUpdated: (ts) => set({ lastUpdated: ts }),

  async fetchIncidents() {
    try {
      const { data } = await api.get('/incidents', { params: { limit: 100 } })
      const items: Incident[] = (data.items ?? []).map(mapIncident)
      if (items.length) set({ incidents: items })
    } catch {
      // silently keep mock data if API is unreachable
    }
  },

  async fetchPredictions() {
    try {
      const { data } = await api.get('/predict/latest')
      const items: Prediction[] = (data.items ?? []).map(mapPrediction)
      if (items.length) set({ predictions: items, lastUpdated: new Date().toISOString() })
    } catch {
      // silently keep mock data if API is unreachable
    }
  },
}))
