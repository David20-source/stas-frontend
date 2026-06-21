import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker, MapContainer, Marker, Polyline,
  Popup, TileLayer, Tooltip, useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import AutoPanDrift from './AutoPanDrift'
import HeatmapLayer from './HeatmapLayer'
import UserLocationLayer from './UserLocationLayer'
import UgandaRoadLayer, { type LoadState } from './UgandaRoadLayer'
import { useTheme } from '../../context/ThemeContext'
import type { Incident } from '../../store/useAppStore'
import type { RouteResult } from '../../api/routing'

// ── Types ──────────────────────────────────────────────────────────────────

type StatusColor = 'CLEAR' | 'MODERATE' | 'HEAVY' | 'CRITICAL' | 'INCIDENT' | 'UNKNOWN'

type Hotspot = {
  id: string; name: string
  lat: number; lng: number
  status: StatusColor; baseRadius: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const KAMPALA_CENTER: [number, number] = [0.3476, 32.5825]
const DEFAULT_ZOOM = 13
const MIN_ZOOM = 10
const MAX_ZOOM = 18
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const ROUTE_COLORS: Record<RouteResult['label'], string> = {
  RECOMMENDED: '#00e676',
  SHORTEST:    '#3b82f6',
  ALTERNATIVE: '#9ca3af',
}

const INCIDENT_COLORS: Record<string, string> = {
  JAM: '#f97316', ACCIDENT: '#ef4444', WORKS: '#eab308',
  FLOODING: '#3b82f6', LIGHT: '#a855f7', CONVOY: '#6b7280', OTHER: '#6b7280',
}

const HOTSPOTS: Hotspot[] = [
  { id: 'clock-tower',   name: 'Clock Tower',  lat: 0.3163, lng: 32.5812, status: 'CRITICAL', baseRadius: 6 },
  { id: 'old-taxi-park', name: 'Old Taxi Park', lat: 0.3147, lng: 32.5816, status: 'HEAVY',    baseRadius: 5 },
  { id: 'nakasero',      name: 'Nakasero',      lat: 0.3297, lng: 32.5750, status: 'MODERATE', baseRadius: 4 },
  { id: 'kololo',        name: 'Kololo',        lat: 0.3349, lng: 32.5931, status: 'HEAVY',    baseRadius: 5 },
  { id: 'ntinda',        name: 'Ntinda',        lat: 0.3614, lng: 32.6245, status: 'MODERATE', baseRadius: 4 },
  { id: 'nansana',       name: 'Nansana',       lat: 0.3611, lng: 32.5135, status: 'CLEAR',    baseRadius: 4 },
]

// ── Helper components ──────────────────────────────────────────────────────

function statusToColor(s: StatusColor) {
  return ({
    CLEAR: 'var(--status-clear)', MODERATE: 'var(--status-moderate)',
    HEAVY: 'var(--status-heavy)', CRITICAL: 'var(--status-critical)',
    INCIDENT: 'var(--status-incident)', UNKNOWN: 'var(--status-unknown)',
  } as Record<StatusColor, string>)[s]
}

function FlyToEffect({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 1.5 })
  }, [position, map])
  return null
}

function MapClickHandler({
  mode,
  onClick,
}: {
  mode: 'origin' | 'destination' | null
  onClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (mode) onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  // Change cursor when in pin mode
  const map = useMap()
  useEffect(() => {
    map.getContainer().style.cursor = mode ? 'crosshair' : ''
    return () => { map.getContainer().style.cursor = '' }
  }, [mode, map])
  return null
}

function makePinIcon(label: 'A' | 'B', color: string) {
  return L.divIcon({
    className: '',
    iconSize:   [28, 36],
    iconAnchor: [14, 36],
    html: `
      <div style="
        width:28px;height:36px;display:flex;flex-direction:column;
        align-items:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))
      ">
        <div style="
          width:24px;height:24px;border-radius:50%;
          background:${color};border:2px solid #fff;
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:12px;color:#fff;font-family:sans-serif
        ">${label}</div>
        <div style="
          width:2px;flex:1;background:${color};margin-top:1px
        "></div>
      </div>`,
  })
}

const ICON_A = makePinIcon('A', '#00c853')
const ICON_B = makePinIcon('B', '#f44336')

// ── Main component ─────────────────────────────────────────────────────────

export default function MapView({
  height = '520px',
  showHeatmap = false,
  autoPan = false,
  pulsingHotspots = true,
  zoom = DEFAULT_ZOOM,
  showZoomControls = false,
  scrollWheelZoom = false,
  showIncidents = false,
  showUserLocation = false,
  showUgandaRoads = false,
  incidents = [],
  routeResults = [],
  activeRouteIdx = 0,
  pinMode = null,
  originPin = null,
  destinationPin = null,
  flyTo = null,
  onUserLocation,
  onMapClick,
  onRoadLayerState,
  className = '',
}: {
  height?: string
  showHeatmap?: boolean
  autoPan?: boolean
  pulsingHotspots?: boolean
  zoom?: number
  showZoomControls?: boolean
  scrollWheelZoom?: boolean
  showIncidents?: boolean
  showUserLocation?: boolean
  /** Overlay the live OSM Uganda road network with congestion colours */
  showUgandaRoads?: boolean
  incidents?: Incident[]
  /** Calculated OSRM route alternatives to draw */
  routeResults?: RouteResult[]
  /** Which of the routeResults is currently active/selected */
  activeRouteIdx?: number
  /** 'origin' | 'destination' → next map click sets that waypoint */
  pinMode?: 'origin' | 'destination' | null
  originPin?: [number, number] | null
  destinationPin?: [number, number] | null
  flyTo?: [number, number] | null
  onUserLocation?: (lat: number, lng: number) => void
  onMapClick?: (lat: number, lng: number) => void
  /** Reports the road layer's load state (loading | done | error) + segment count */
  onRoadLayerState?: (state: LoadState, count?: number) => void
  className?: string
}) {
  const { theme } = useTheme()
  const [pulseTick, setPulseTick] = useState(0)

  useEffect(() => {
    if (!pulsingHotspots) return
    const id = setInterval(() => setPulseTick((t) => t + 1), 900)
    return () => clearInterval(id)
  }, [pulsingHotspots])

  const heatPoints = useMemo(
    () => HOTSPOTS.map((h) => {
      const intensity =
        h.status === 'CRITICAL' ? 1 : h.status === 'HEAVY' ? 0.85
        : h.status === 'MODERATE' ? 0.65 : h.status === 'INCIDENT' ? 0.95 : 0.35
      return [h.lat, h.lng, intensity] as [number, number, number]
    }),
    [],
  )

  const tileUrl = theme === 'light' ? TILE_LIGHT : TILE_DARK

  // Sort routeResults so active route renders on top (last in DOM)
  const sortedRoutes = useMemo(
    () => [...routeResults].sort((a, b) =>
      a.index === activeRouteIdx ? 1 : b.index === activeRouteIdx ? -1 : 0,
    ),
    [routeResults, activeRouteIdx],
  )

  return (
    <div className={className} style={{ height, width: '100%' }}>
      <MapContainer
        center={KAMPALA_CENTER}
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={scrollWheelZoom}
        zoomControl={showZoomControls}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer key={tileUrl} url={tileUrl} subdomains={['a', 'b', 'c', 'd']} />

        {showHeatmap     && <HeatmapLayer points={heatPoints} />}
        {showUgandaRoads && (
          <UgandaRoadLayer
            types={['trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link']}
            minZoom={8}
            onStateChange={onRoadLayerState}
          />
        )}
        {autoPan          && <AutoPanDrift enabled intervalMs={5000} driftDeg={0.001} />}
        {flyTo            && <FlyToEffect position={flyTo} />}
        {showUserLocation && <UserLocationLayer onLocation={onUserLocation} />}
        {onMapClick       && <MapClickHandler mode={pinMode ?? null} onClick={onMapClick} />}


        {/* ── OSRM calculated route(s) ─────────────────────────────────── */}
        {sortedRoutes.map((r) => {
          const isActive = r.index === activeRouteIdx
          const color    = ROUTE_COLORS[r.label]
          return (
            <Polyline
              key={`osrm-${r.index}`}
              positions={r.geometry}
              pathOptions={{
                color,
                weight:      isActive ? 6 : 3,
                opacity:     isActive ? 0.92 : 0.45,
                dashArray:   isActive ? undefined : '6 4',
              }}
            >
              <Tooltip sticky>
                <strong style={{ color }}>{r.label}</strong>
                <br />
                {(r.distance / 1000).toFixed(1)} km · {Math.round(r.duration / 60)} min
                <br />
                <span style={{ fontSize: 11, color: '#888' }}>
                  Congestion score: {r.congestionScore}/100
                </span>
              </Tooltip>
            </Polyline>
          )
        })}

        {/* ── Waypoint pins A (origin) & B (destination) ─────────────── */}
        {originPin && (
          <Marker position={originPin} icon={ICON_A}>
            <Tooltip permanent direction="top" offset={[0, -38]}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>Origin</span>
            </Tooltip>
          </Marker>
        )}
        {destinationPin && (
          <Marker position={destinationPin} icon={ICON_B}>
            <Tooltip permanent direction="top" offset={[0, -38]}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>Destination</span>
            </Tooltip>
          </Marker>
        )}

        {/* ── Pulsing hotspot markers ──────────────────────────────────── */}
        {pulsingHotspots && HOTSPOTS.map((h) => {
          const wave   = Math.sin(pulseTick / 2 + h.baseRadius)
          const radius = h.baseRadius + Math.max(0, wave) * 2
          const color  = statusToColor(h.status)
          return (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={radius}
              pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.25 }}
            >
              <Tooltip sticky><strong>{h.name}</strong> — {h.status}</Tooltip>
            </CircleMarker>
          )
        })}

        {/* ── Incident markers ─────────────────────────────────────────── */}
        {showIncidents && incidents.map((inc) => {
          const color = INCIDENT_COLORS[inc.type] ?? '#6b7280'
          return (
            <CircleMarker
              key={inc.id}
              center={[inc.latitude, inc.longitude]}
              radius={7}
              pathOptions={{ color, weight: 2.5, fillColor: color, fillOpacity: 0.85 }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{inc.type} — {inc.severity}</div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{inc.address}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{inc.description}</div>
                </div>
              </Popup>
              <Tooltip>{inc.type}: {inc.address}</Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
