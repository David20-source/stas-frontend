import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, ChevronDown, ChevronUp,
  Crosshair, Layers, Loader2, MapPin, Navigation,
  RefreshCw, RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import MapView from '../components/map/MapView'
import GlassCard from '../components/layout/GlassCard'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import LocationSearchInput from '../components/ui/LocationSearchInput'
import { RoadLayerStatusBar, RoadCongestionLegend, type LoadState } from '../components/map/UgandaRoadLayer'
import { useAppStore } from '../store/useAppStore'
import { useTheme } from '../context/ThemeContext'
import { fetchOsrmRoutes, scoreAndLabel, fmtDist, fmtDuration, maneuverIcon, type RawRoute } from '../api/routing'
import { reverseGeocode, type LocationSuggestion } from '../api/nominatim'


// ── Layer toggle ───────────────────────────────────────────────────────────

function LayerToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox" checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-(--accent-primary)"
      />
      <span className="text-xs text-(--text-secondary)">{label}</span>
    </label>
  )
}

// ── Score badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const [color, label] =
    score < 25  ? ['#00e676', 'Clear']
    : score < 50 ? ['#ffcc02', 'Moderate']
    : score < 75 ? ['#ff8c00', 'Heavy']
    :              ['#ff2222', 'Critical']
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: color + '22', color }}
    >
      {label} traffic
    </span>
  )
}

// ── MapPage ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const { theme }        = useTheme()
  const incidents        = useAppStore((s) => s.incidents)
  const predictions      = useAppStore((s) => s.predictions)
  const lastUpdated      = useAppStore((s) => s.lastUpdated)
  const fetchPredictions = useAppStore((s) => s.fetchPredictions)
  const active           = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED').length

  // ── Layer toggles ────────────────────────────────────────────
  const [showHeatmap,      setShowHeatmap]      = useState(true)
  const [showHotspots,     setShowHotspots]     = useState(true)
  const [showIncidents,    setShowIncidents]    = useState(true)
  const [showUserLocation, setShowUserLocation] = useState(false)
  const [showUgandaRoads,  setShowUgandaRoads]  = useState(false)
  const [autoPan,          setAutoPan]          = useState(false)
  const [layersOpen,       setLayersOpen]       = useState(false)

  // ── Uganda road layer load state ─────────────────────────────
  const [roadLayerState, setRoadLayerState] = useState<LoadState>('idle')
  const [roadSegCount,   setRoadSegCount]   = useState(0)
  function handleRoadLayerState(state: LoadState, count?: number) {
    setRoadLayerState(state)
    if (count !== undefined) setRoadSegCount(count)
  }

  // ── Route finder state ───────────────────────────────────────
  const [finderOpen,  setFinderOpen]  = useState(true)
  const [dirOpen,     setDirOpen]     = useState(false)

  // Waypoints
  const [originPin,   setOriginPin]   = useState<[number, number] | null>(null)
  const [originLabel, setOriginLabel] = useState('')
  const [destPin,     setDestPin]     = useState<[number, number] | null>(null)
  const [destLabel,   setDestLabel]   = useState('')
  const [pinMode,     setPinMode]     = useState<'origin' | 'destination' | null>(null)

  // Results
  const [rawRoutes,      setRawRoutes]      = useState<RawRoute[]>([])
  const [activeRouteIdx, setActiveRouteIdx] = useState(0)
  const [isRefreshing,   setIsRefreshing]   = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [tick,           setTick]           = useState(0)

  // Fly-to
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Re-score routes every time predictions change (live re-ranking)
  const routeResults = useMemo(
    () => scoreAndLabel(rawRoutes, predictions),
    [rawRoutes, predictions],
  )

  // Keep "X ago" label fresh every 30 s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Auto-refresh predictions every 60 s while a route is loaded
  useEffect(() => {
    if (rawRoutes.length === 0) return
    const id = setInterval(() => { void fetchPredictions() }, 60_000)
    return () => clearInterval(id)
  }, [rawRoutes.length, fetchPredictions])

  async function handleRefresh() {
    setIsRefreshing(true)
    await fetchPredictions()
    setIsRefreshing(false)
  }

  function timeAgo(iso: string | null): string {
    void tick
    if (!iso) return ''
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (secs < 10) return 'just now'
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins} min ago`
    return `${Math.floor(mins / 60)} h ago`
  }

  const activeRoute = routeResults.find((r) => r.index === activeRouteIdx)

  // ── Handlers ─────────────────────────────────────────────────

  function handleOriginSelect(s: LocationSuggestion) {
    setOriginPin(s.coords)
    setOriginLabel(s.label)
    setFlyTo(s.coords)
    setPinMode(null)
    setRawRoutes([])
    setError(null)
  }

  function handleDestSelect(s: LocationSuggestion) {
    setDestPin(s.coords)
    setDestLabel(s.label)
    setFlyTo(s.coords)
    setPinMode(null)
    setRawRoutes([])
    setError(null)
  }

  function useMyLocation() {
    setShowUserLocation(true)
    if (!navigator.geolocation) { setError('Geolocation not available in this browser.'); return }
    navigator.geolocation.getCurrentPosition(
      async (geo) => {
        const pos: [number, number] = [geo.coords.latitude, geo.coords.longitude]
        const label = await reverseGeocode(pos[0], pos[1]).catch(() => 'My Location')
        setOriginPin(pos)
        setOriginLabel(label)
        setFlyTo(pos)
        setPinMode(null)
        setRawRoutes([])
      },
      () => setError('Could not get your location. Check browser permissions.'),
    )
  }

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const pos: [number, number] = [lat, lng]
    const label = await reverseGeocode(lat, lng).catch(() => `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    if (pinMode === 'origin') {
      setOriginPin(pos)
      setOriginLabel(label)
      setPinMode(null)
    } else if (pinMode === 'destination') {
      setDestPin(pos)
      setDestLabel(label)
      setPinMode(null)
    }
    setRawRoutes([])
    setError(null)
  }, [pinMode])

  async function findRoutes() {
    if (!originPin || !destPin) { setError('Set both origin and destination first.'); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    setRawRoutes([])
    try {
      const raw = await fetchOsrmRoutes(originPin, destPin, abortRef.current.signal)
      setRawRoutes(raw)
      const scored = scoreAndLabel(raw, predictions)
      const rec = scored.find((r) => r.label === 'RECOMMENDED')
      setActiveRouteIdx(rec?.index ?? 0)
      setDirOpen(true)
      const geo = (rec ?? scored[0]).geometry
      setFlyTo(geo[Math.floor(geo.length / 2)])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Routing failed'
      if (msg !== 'The user aborted a request.') setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    abortRef.current?.abort()
    setOriginPin(null); setOriginLabel('')
    setDestPin(null);   setDestLabel('')
    setRawRoutes([]);   setError(null)
    setPinMode(null);   setDirOpen(false)
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="relative h-screen w-full overflow-hidden bg-(--bg-primary) flex flex-col">

      {/* ── Full-screen map ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <MapView
          height="100%"
          showHeatmap={showHeatmap}
          pulsingHotspots={showHotspots}
          showIncidents={showIncidents}
          showUserLocation={showUserLocation}
          showUgandaRoads={showUgandaRoads}
          incidents={incidents}
          routeResults={routeResults}
          activeRouteIdx={activeRouteIdx}
          pinMode={pinMode}
          originPin={originPin}
          destinationPin={destPin}
          flyTo={flyTo}
          onUserLocation={(lat, lng) => {
            setOriginPin([lat, lng])
            setOriginLabel('My Location')
          }}
          onMapClick={handleMapClick}
          onRoadLayerState={handleRoadLayerState}
          autoPan={autoPan}
          scrollWheelZoom
          showZoomControls
        />
      </div>

      {/* ── Pin mode banner ──────────────────────────────────────── */}
      {pinMode && (
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-4 pointer-events-none">
          <div
            className="px-4 py-2 rounded-full text-sm font-semibold pointer-events-auto flex items-center gap-2"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--accent-primary)', backdropFilter: 'blur(12px)', color: 'var(--accent-primary)' }}
          >
            <MapPin className="h-4 w-4" />
            Click map to set {pinMode === 'origin' ? 'origin' : 'destination'}
            <button
              type="button"
              onClick={() => setPinMode(null)}
              className="ml-2 text-(--text-tertiary) hover:text-(--text-primary)"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ DESKTOP LAYOUT ══════════════ */}

      {/* Left: layers panel */}
      <div className="absolute left-4 top-4 hidden sm:flex flex-col gap-2 w-48 z-10">
        <Link to="/">
          <GlassCard className="px-3 py-2 flex items-center gap-2 hover:border-(--border-primary) transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 text-(--text-secondary)" />
            <span className="text-xs text-(--text-secondary)">Dashboard</span>
          </GlassCard>
        </Link>

        <GlassCard className="overflow-hidden">
          <button
            type="button"
            onClick={() => setLayersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[rgba(0,212,255,0.05)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-(--accent-primary)" />
              <span className="text-xs font-semibold text-(--text-primary)">Layers</span>
            </div>
            {layersOpen ? <ChevronUp className="h-3 w-3 text-(--text-tertiary)" /> : <ChevronDown className="h-3 w-3 text-(--text-tertiary)" />}
          </button>
          {layersOpen && (
            <div className="px-3 pb-3 flex flex-col gap-2 border-t border-(--border-subtle) pt-2">
              <LayerToggle label="Heatmap"      checked={showHeatmap}      onChange={setShowHeatmap} />
              <LayerToggle label="Hotspots"     checked={showHotspots}     onChange={setShowHotspots} />
              <LayerToggle label="Incidents"    checked={showIncidents}    onChange={setShowIncidents} />
              <LayerToggle label="Auto-pan"     checked={autoPan}          onChange={setAutoPan} />
              <div className="pt-1.5 border-t border-(--border-subtle)">
                <LayerToggle
                  label="Uganda Roads (OSM)"
                  checked={showUgandaRoads}
                  onChange={setShowUgandaRoads}
                />
                {showUgandaRoads && (
                  <div className="mt-2 pl-0.5">
                    <RoadLayerStatusBar loadState={roadLayerState} count={roadSegCount} />
                    <div className="mt-2">
                      <RoadCongestionLegend />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        {/* My location */}
        <button
          type="button"
          onClick={useMyLocation}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors"
          style={{
            background:     showUserLocation ? 'rgba(59,130,246,0.15)' : 'var(--glass-bg)',
            borderColor:    showUserLocation ? '#3b82f6' : 'var(--border-primary)',
            color:          showUserLocation ? '#3b82f6' : 'var(--text-secondary)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Crosshair className="h-3.5 w-3.5" />
          {showUserLocation ? 'Tracking…' : 'My Location'}
        </button>
      </div>

      {/* Right: Route Finder */}
      <div className="absolute right-4 top-4 hidden sm:flex flex-col gap-0 w-80 z-10">
        <GlassCard className="overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-(--accent-primary)" />
              <span className="text-sm font-semibold text-(--text-primary)">Route Finder</span>
              <span className="text-[10px] text-(--text-tertiary)">· All Uganda Roads</span>
            </div>
            <div className="flex items-center gap-2">
              {(originPin || destPin) && (
                <button type="button" onClick={reset} title="Clear route"
                  className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button type="button" onClick={() => setFinderOpen((v) => !v)}
                className="text-(--text-tertiary) hover:text-(--text-primary)">
                {finderOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {finderOpen && (
            <div>
              {/* ── From ── */}
              <div className="px-3 py-3 border-b border-(--border-subtle)">
                <LocationSearchInput
                  label="From"
                  placeholder="Search origin in Uganda…"
                  value={originLabel}
                  pinColor="#00c853"
                  onSelect={handleOriginSelect}
                  onClear={() => { setOriginPin(null); setOriginLabel(''); setRawRoutes([]) }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    <Crosshair className="h-3 w-3" /> GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinMode(pinMode === 'origin' ? null : 'origin')}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors"
                    style={{
                      background:  pinMode === 'origin' ? 'rgba(0,200,83,0.1)' : 'var(--bg-tertiary)',
                      borderColor: pinMode === 'origin' ? '#00c853' : 'var(--border-subtle)',
                      color:       pinMode === 'origin' ? '#00c853' : 'var(--text-secondary)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {pinMode === 'origin' ? 'Click map…' : 'Pin map'}
                  </button>
                </div>
              </div>

              {/* ── To ── */}
              <div className="px-3 py-3 border-b border-(--border-subtle)">
                <LocationSearchInput
                  label="To"
                  placeholder="Search destination in Uganda…"
                  value={destLabel}
                  pinColor="#f44336"
                  onSelect={handleDestSelect}
                  onClear={() => { setDestPin(null); setDestLabel(''); setRawRoutes([]) }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPinMode(pinMode === 'destination' ? null : 'destination')}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors"
                    style={{
                      background:  pinMode === 'destination' ? 'rgba(244,67,54,0.1)' : 'var(--bg-tertiary)',
                      borderColor: pinMode === 'destination' ? '#f44336' : 'var(--border-subtle)',
                      color:       pinMode === 'destination' ? '#f44336' : 'var(--text-secondary)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {pinMode === 'destination' ? 'Click map…' : 'Pin map'}
                  </button>
                </div>
              </div>

              {/* ── Find button ── */}
              <div className="px-4 py-3 border-b border-(--border-subtle)">
                <button
                  type="button"
                  disabled={loading || !originPin || !destPin}
                  onClick={findRoutes}
                  className="w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{
                    background:  originPin && destPin ? 'rgba(0,212,255,0.12)' : 'transparent',
                    color:       originPin && destPin ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    border:      `1px solid ${originPin && destPin ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    cursor:      loading || !originPin || !destPin ? 'not-allowed' : 'pointer',
                    opacity:     loading || !originPin || !destPin ? 0.6 : 1,
                    boxShadow:   originPin && destPin ? 'var(--shadow-glow-cyan)' : 'none',
                  }}
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding best route…</>
                    : <><Navigation className="h-4 w-4" /> Find Best Route</>
                  }
                </button>
                {error && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--status-critical)' }}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              {/* ── Route alternatives ── */}
              {routeResults.length > 0 && (
                <div className="border-b border-(--border-subtle)">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-(--border-subtle)">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#00e676] shrink-0"
                        style={{ animation: 'pulse 2s infinite' }}
                      />
                      <span className="text-[10px] text-(--text-tertiary)">
                        Live · {timeAgo(lastUpdated)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      title="Refresh congestion data"
                      className="flex items-center gap-1 text-[10px] text-(--text-tertiary) hover:text-(--accent-primary) transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  {routeResults.map((r) => {
                    const isActive = r.index === activeRouteIdx
                    const color =
                      r.label === 'RECOMMENDED' ? '#00e676'
                      : r.label === 'SHORTEST'   ? '#3b82f6'
                      :                            '#9ca3af'
                    return (
                      <button
                        key={r.index}
                        type="button"
                        onClick={() => { setActiveRouteIdx(r.index); setDirOpen(true) }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-(--border-subtle) last:border-0"
                        style={{ background: isActive ? `${color}0d` : undefined }}
                      >
                        <div className="mt-0.5 h-3 w-3 rounded-full shrink-0 border-2"
                          style={{ borderColor: color, background: isActive ? color : 'transparent' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold" style={{ color }}>{r.label}</span>
                            <ScoreBadge score={r.congestionScore} />
                          </div>
                          <div className="text-xs text-(--text-secondary)">
                            {fmtDist(r.distance)} · {fmtDuration(r.duration)}
                          </div>
                        </div>
                        {isActive && <span className="text-[10px] text-(--text-tertiary) shrink-0 mt-0.5">selected</span>}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ── Turn-by-turn ── */}
              {activeRoute && (
                <div>
                  <button
                    type="button"
                    onClick={() => setDirOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(0,212,255,0.05)] transition-colors"
                  >
                    <span className="text-xs font-semibold text-(--text-secondary)">
                      Turn-by-turn ({activeRoute.steps.length} steps)
                    </span>
                    {dirOpen
                      ? <ChevronUp className="h-3.5 w-3.5 text-(--text-tertiary)" />
                      : <ChevronDown className="h-3.5 w-3.5 text-(--text-tertiary)" />
                    }
                  </button>
                  {dirOpen && (
                    <div className="max-h-52 overflow-y-auto">
                      {activeRoute.steps.filter((s) => s.instruction.trim()).map((s, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-4 py-2 border-t border-(--border-subtle) hover:bg-[rgba(0,212,255,0.03)]"
                        >
                          <span className="text-base shrink-0 mt-0.5">{maneuverIcon(s.maneuverType, s.instruction)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-(--text-primary) leading-snug">{s.instruction}</p>
                            {s.distance > 0 && (
                              <p className="text-[10px] text-(--text-tertiary) mt-0.5">
                                {fmtDist(s.distance)} · {fmtDuration(s.duration)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ══════════════ MOBILE LAYOUT ══════════════ */}

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 p-3 sm:hidden">
        <Link to="/">
          <GlassCard className="h-9 w-9 flex items-center justify-center hover:border-(--border-primary) transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-(--text-secondary)" />
          </GlassCard>
        </Link>
        <button type="button" onClick={useMyLocation} className="shrink-0">
          <div
            className="h-9 w-9 flex items-center justify-center rounded-lg border transition-colors"
            style={{
              borderColor:    showUserLocation ? '#3b82f6' : 'var(--border-primary)',
              background:     'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Crosshair className="h-4 w-4" style={{ color: showUserLocation ? '#3b82f6' : 'var(--text-secondary)' }} />
          </div>
        </button>
        <button type="button" onClick={() => setFinderOpen((v) => !v)} className="flex-1">
          <GlassCard className="py-2 px-3 flex items-center gap-2">
            <Navigation className="h-4 w-4 text-(--accent-primary) shrink-0" />
            <span className="text-xs text-(--text-secondary) truncate">
              {activeRoute
                ? `${fmtDist(activeRoute.distance)} · ${fmtDuration(activeRoute.duration)}`
                : 'Search Uganda routes…'}
            </span>
          </GlassCard>
        </button>
      </div>

      {/* Mobile route finder bottom sheet */}
      {finderOpen && (
        <div className="relative z-10 px-3 pb-1 sm:hidden mt-auto">
          <GlassCard className="overflow-hidden max-h-[65vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--border-subtle) shrink-0">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-(--accent-primary)" />
                <span className="text-xs font-semibold text-(--text-primary)">Route Finder</span>
                <span className="text-[10px] text-(--text-tertiary)">· All Uganda Roads</span>
              </div>
              {(originPin || destPin) && (
                <button type="button" onClick={reset} className="text-(--text-tertiary)">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex flex-col gap-0">
              {/* Origin */}
              <div className="px-3 py-2.5 border-b border-(--border-subtle)">
                <LocationSearchInput
                  label="From"
                  placeholder="Origin in Uganda…"
                  value={originLabel}
                  pinColor="#00c853"
                  onSelect={handleOriginSelect}
                  onClear={() => { setOriginPin(null); setOriginLabel(''); setRawRoutes([]) }}
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="text-[11px] px-2 py-1 rounded border flex items-center gap-1"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                  >
                    <Crosshair className="h-3 w-3" /> GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinMode(pinMode === 'origin' ? null : 'origin')}
                    className="text-[11px] px-2 py-1 rounded border flex items-center gap-1"
                    style={{
                      background:  pinMode === 'origin' ? 'rgba(0,200,83,0.1)' : 'var(--bg-tertiary)',
                      borderColor: pinMode === 'origin' ? '#00c853' : 'var(--border-subtle)',
                      color:       pinMode === 'origin' ? '#00c853' : 'var(--text-secondary)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {pinMode === 'origin' ? 'Click map…' : 'Pin map'}
                  </button>
                </div>
              </div>

              {/* Destination */}
              <div className="px-3 py-2.5 border-b border-(--border-subtle)">
                <LocationSearchInput
                  label="To"
                  placeholder="Destination in Uganda…"
                  value={destLabel}
                  pinColor="#f44336"
                  onSelect={handleDestSelect}
                  onClear={() => { setDestPin(null); setDestLabel(''); setRawRoutes([]) }}
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPinMode(pinMode === 'destination' ? null : 'destination')}
                    className="text-[11px] px-2 py-1 rounded border flex items-center gap-1"
                    style={{
                      background:  pinMode === 'destination' ? 'rgba(244,67,54,0.1)' : 'var(--bg-tertiary)',
                      borderColor: pinMode === 'destination' ? '#f44336' : 'var(--border-subtle)',
                      color:       pinMode === 'destination' ? '#f44336' : 'var(--text-secondary)',
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                    {pinMode === 'destination' ? 'Click map…' : 'Pin map'}
                  </button>
                </div>
              </div>

              {/* Find button */}
              <div className="px-3 py-2 border-b border-(--border-subtle)">
                <button
                  type="button"
                  disabled={loading || !originPin || !destPin}
                  onClick={findRoutes}
                  className="w-full h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-colors"
                  style={{
                    background:  originPin && destPin ? 'rgba(0,212,255,0.12)' : 'transparent',
                    color:       originPin && destPin ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    borderColor: originPin && destPin ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    opacity:     !originPin || !destPin ? 0.5 : 1,
                  }}
                >
                  {loading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding…</>
                    : <><Navigation className="h-3.5 w-3.5" /> Find Best Route</>
                  }
                </button>
                {error && <p className="text-[10px] mt-1.5" style={{ color: 'var(--status-critical)' }}>{error}</p>}
              </div>

              {/* Results */}
              {routeResults.length > 0 && (
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-(--border-subtle)">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00e676] shrink-0" style={{ animation: 'pulse 2s infinite' }} />
                    <span className="text-[10px] text-(--text-tertiary)">Live · {timeAgo(lastUpdated)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 text-[10px] text-(--text-tertiary) hover:text-(--accent-primary) transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              )}
              {routeResults.map((r) => {
                const isActive = r.index === activeRouteIdx
                const color = r.label === 'RECOMMENDED' ? '#00e676' : r.label === 'SHORTEST' ? '#3b82f6' : '#9ca3af'
                return (
                  <button
                    key={r.index}
                    type="button"
                    onClick={() => setActiveRouteIdx(r.index)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-(--border-subtle) last:border-0 transition-colors"
                    style={{ background: isActive ? `${color}0d` : undefined }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full border-2 shrink-0"
                      style={{ borderColor: color, background: isActive ? color : 'transparent' }} />
                    <div className="flex-1">
                      <span className="text-xs font-bold mr-2" style={{ color }}>{r.label}</span>
                      <span className="text-xs text-(--text-secondary)">{fmtDist(r.distance)} · {fmtDuration(r.duration)}</span>
                    </div>
                    <ScoreBadge score={r.congestionScore} />
                  </button>
                )
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Bottom status bar (desktop) ── */}
      <div className="absolute left-4 bottom-4 hidden sm:block z-10">
        <GlassCard className="px-4 py-2 flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-(--status-clear) shrink-0" style={{ animation: 'pulse 2s infinite' }} />
          <span className="text-xs text-(--text-secondary)" style={{ fontFamily: 'var(--font-mono)' }}>
            {active} active incidents &nbsp;·&nbsp; {theme === 'dark' ? 'Dark' : 'Light'} mode
          </span>
        </GlassCard>
      </div>

      <MobileBottomNav />
    </div>
  )
}
