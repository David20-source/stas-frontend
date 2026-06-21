/**
 * UgandaRoadLayer
 *
 * Fetches Uganda's road network from the OpenStreetMap Overpass API
 * (same data source as the HDX Uganda Roads export:
 *  https://data.humdata.org/dataset/304c24c5-2a71-4839-9d99-3562facbfb0d)
 *
 * Renders each road segment as a Leaflet Polyline coloured by live
 * congestion score (calculated by congestionEngine.ts).
 *
 * Data is cached in sessionStorage so subsequent renders are instant.
 */

import { useEffect, useRef, useState } from 'react'
import { Polyline, Tooltip, useMap } from 'react-leaflet'
import { fetchUgandaOsmRoads, HIGHWAY_WEIGHT, type OsmRoadSegment, type OsmHighwayType } from '../../api/overpass'
import { calcRoadCongestion, ugandaTrafficSummary, STATUS_COLOR } from '../../utils/congestionEngine'

// ── Types ─────────────────────────────────────────────────────────────────

type LoadState = 'idle' | 'loading' | 'done' | 'error'

type Props = {
  /** Which OSM highway types to include */
  types?: OsmHighwayType[]
  /** Zoom threshold — road layer only renders at or above this zoom */
  minZoom?: number
  /** Called with load state changes so parent can show a spinner */
  onStateChange?: (state: LoadState, count?: number) => void
}

// ── Helper — road label ──────────────────────────────────────────────────

function roadLabel(r: OsmRoadSegment): string {
  const parts: string[] = []
  if (r.name) parts.push(r.name)
  if (r.ref)  parts.push(`(${r.ref})`)
  if (!parts.length) parts.push(r.highway.replace('_', ' '))
  return parts.join(' ')
}

// ── Zoom-aware wrapper ────────────────────────────────────────────────────

function ZoomGate({
  minZoom,
  segments,
  hour,
}: {
  minZoom: number
  segments: OsmRoadSegment[]
  hour: number
}) {
  const map = useMap()
  const [visible, setVisible] = useState(map.getZoom() >= minZoom)

  useEffect(() => {
    function onZoom() { setVisible(map.getZoom() >= minZoom) }
    map.on('zoomend', onZoom)
    return () => { map.off('zoomend', onZoom) }
  }, [map, minZoom])

  if (!visible || segments.length === 0) return null

  return (
    <>
      {segments.map((seg) => {
        const congestion = calcRoadCongestion(seg.highway, seg.name, seg.id, hour)
        const weight     = HIGHWAY_WEIGHT[seg.highway] ?? 1.5
        const isActive   = map.getZoom() >= minZoom

        return (
          <Polyline
            key={seg.id}
            positions={seg.geometry}
            pathOptions={{
              color:   congestion.color,
              weight:  isActive ? weight : weight * 0.6,
              opacity: 0.80,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          >
            <Tooltip sticky>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 12 }}>
                  {roadLabel(seg)}
                </div>
                <div style={{ fontSize: 11, marginBottom: 3 }}>
                  <span style={{
                    background: congestion.color + '22',
                    color:      congestion.color,
                    padding:    '1px 5px',
                    borderRadius: 4,
                    fontWeight: 600,
                  }}>
                    {congestion.label} · {congestion.score}/100
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>
                  {seg.highway.replace('_link', '').replace('_', ' ')}
                  {seg.ref   ? ` · ${seg.ref}`       : ''}
                  {seg.lanes ? ` · ${seg.lanes} lanes` : ''}
                  {seg.surface ? ` · ${seg.surface}`  : ''}
                </div>
              </div>
            </Tooltip>
          </Polyline>
        )
      })}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function UgandaRoadLayer({
  types = ['trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'],
  minZoom = 8,
  onStateChange,
}: Props) {
  const [segments,  setSegments]  = useState<OsmRoadSegment[]>([])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const [hour, setHour] = useState(new Date().getHours())

  // Re-compute congestion colours on the hour
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoadState('loading')
    onStateChange?.('loading')

    fetchUgandaOsmRoads(types, abortRef.current.signal)
      .then((segs) => {
        setSegments(segs)
        setLoadState('done')
        onStateChange?.('done', segs.length)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoadState('error')
        onStateChange?.('error')
      })

    return () => { abortRef.current?.abort() }
  }, [types.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadState !== 'done' || segments.length === 0) return null

  return <ZoomGate minZoom={minZoom} segments={segments} hour={hour} />
}

// ── Status bar sub-component (used in MapPage legend) ─────────────────────

export function RoadLayerStatusBar({
  loadState,
  count,
}: {
  loadState: LoadState
  count: number
}) {
  const summary = ugandaTrafficSummary()

  if (loadState === 'loading') {
    return (
      <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ffcc02] animate-pulse" />
        Loading Uganda road network…
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="flex items-center gap-2 text-[10px]" style={{ color: '#ff8c00' }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff8c00]" />
        Road network unavailable (offline?)
      </div>
    )
  }

  if (loadState === 'done') {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#00e676] animate-pulse" />
          {count.toLocaleString()} OSM roads · {summary.period}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {summary.description}
        </div>
      </div>
    )
  }

  return null
}

// Re-export types for parent components
export type { LoadState }

// ── Legend sub-component ──────────────────────────────────────────────────

export function RoadCongestionLegend() {
  const items = [
    { label: 'Clear',    color: STATUS_COLOR.CLEAR    },
    { label: 'Moderate', color: STATUS_COLOR.MODERATE },
    { label: 'Heavy',    color: STATUS_COLOR.HEAVY    },
    { label: 'Critical', color: STATUS_COLOR.CRITICAL },
  ]
  return (
    <div className="flex flex-col gap-1">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: color }} />
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}
