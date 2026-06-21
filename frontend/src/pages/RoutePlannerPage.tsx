import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  Crosshair, Loader2, Navigation, RefreshCw, RotateCcw, Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import GlassCard from '../components/layout/GlassCard'
import MapView from '../components/map/MapView'
import LocationSearchInput from '../components/ui/LocationSearchInput'
import { useAppStore } from '../store/useAppStore'
import {
  fetchOsrmRoutes, scoreAndLabel, fmtDist, fmtDuration, maneuverIcon,
  type RawRoute, type RouteResult,
} from '../api/routing'
import { reverseGeocode, type LocationSuggestion } from '../api/nominatim'
import { UGANDA_ROUTES } from '../utils/ugandaRoutes'

// ── Helpers ────────────────────────────────────────────────────────────────

const LABEL_COLOR: Record<RouteResult['label'], string> = {
  RECOMMENDED: '#00e676',
  SHORTEST:    '#3b82f6',
  ALTERNATIVE: '#9ca3af',
}

const LABEL_BG: Record<RouteResult['label'], string> = {
  RECOMMENDED: 'rgba(0,230,118,0.12)',
  SHORTEST:    'rgba(59,130,246,0.12)',
  ALTERNATIVE: 'rgba(156,163,175,0.12)',
}

function congestionColor(score: number) {
  if (score < 25)  return '#00e676'
  if (score < 50)  return '#ffcc02'
  if (score < 75)  return '#ff8c00'
  return '#ff2222'
}
function congestionLabel(score: number) {
  if (score < 25)  return 'Clear'
  if (score < 50)  return 'Moderate'
  if (score < 75)  return 'Heavy'
  return 'Critical'
}

// Congestion stats across Uganda routes — shown as live predictions panel
function ugandaCongestionSummary() {
  const byRegion = UGANDA_ROUTES.reduce(
    (acc, r) => {
      if (!acc[r.region]) acc[r.region] = { total: 0, count: 0 }
      acc[r.region].total += r.congestionIndex
      acc[r.region].count++
      return acc
    },
    {} as Record<string, { total: number; count: number }>,
  )
  return Object.entries(byRegion).map(([region, { total, count }]) => ({
    region,
    avg: Math.round(total / count),
  }))
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RouteCard({
  r, active, onClick,
}: { r: RouteResult; active: boolean; onClick: () => void }) {
  const color = LABEL_COLOR[r.label]
  const bg    = LABEL_BG[r.label]
  const cScore = r.congestionScore

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border p-3 transition-all"
      style={{
        background:  active ? bg : 'transparent',
        borderColor: active ? color : 'var(--border-subtle)',
        boxShadow:   active ? `0 0 0 1px ${color}44` : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold tracking-wider" style={{ color }}>
          {r.label === 'RECOMMENDED' && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
          {r.label}
        </span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: congestionColor(cScore) + '22', color: congestionColor(cScore) }}
        >
          {congestionLabel(cScore)} traffic
        </span>
      </div>
      <div className="flex gap-4 text-sm" style={{ color: 'var(--text-primary)' }}>
        <span><strong>{fmtDist(r.distance)}</strong></span>
        <span><strong>{fmtDuration(r.duration)}</strong></span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${cScore}%`, background: congestionColor(cScore) }}
        />
      </div>
      <div className="mt-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        Congestion score {cScore}/100
      </div>
    </button>
  )
}

function UgandaCongestionPanel() {
  const summary = useMemo(() => ugandaCongestionSummary(), [])
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          Uganda Road Conditions
        </span>
        <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-primary)' }}>
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {summary.map(({ region, avg }) => (
          <div key={region} className="rounded-lg p-2.5 border" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>
              {region.charAt(0) + region.slice(1).toLowerCase()} Region
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${avg}%`, background: congestionColor(avg) }} />
              </div>
              <span className="text-xs font-bold" style={{ color: congestionColor(avg) }}>
                {congestionLabel(avg)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        Based on {UGANDA_ROUTES.length} monitored roads across Uganda.
        Predictions updated every 5 minutes.
      </div>
    </GlassCard>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RoutePlannerPage() {
  const predictions     = useAppStore((s) => s.predictions)
  const fetchPredictions = useAppStore((s) => s.fetchPredictions)

  // Waypoint state
  const [originPin,   setOriginPin]   = useState<[number, number] | null>(null)
  const [originLabel, setOriginLabel] = useState('')
  const [destPin,     setDestPin]     = useState<[number, number] | null>(null)
  const [destLabel,   setDestLabel]   = useState('')

  // Map interaction
  const [pinMode,  setPinMode]  = useState<'origin' | 'destination' | null>(null)
  const [flyTo,    setFlyTo]    = useState<[number, number] | null>(null)

  // Route results
  const [rawRoutes,      setRawRoutes]      = useState<RawRoute[]>([])
  const [activeRouteIdx, setActiveRouteIdx] = useState(0)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [dirOpen,        setDirOpen]        = useState(false)
  const [isRefreshing,   setIsRefreshing]   = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // Re-score when predictions update
  const routeResults = useMemo(
    () => scoreAndLabel(rawRoutes, predictions),
    [rawRoutes, predictions],
  )

  const recommendedRoute = routeResults.find((r) => r.label === 'RECOMMENDED') ?? routeResults[0]
  const activeRoute      = routeResults.find((r) => r.index === activeRouteIdx)
  const canPlan          = !!originPin && !!destPin

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation not supported by this browser.'); return }
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

  async function handleFindRoute() {
    if (!originPin || !destPin) { setError('Set both origin and destination first.'); return }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    setRawRoutes([])
    setDirOpen(false)

    try {
      const raw = await fetchOsrmRoutes(originPin, destPin, abortRef.current.signal)
      setRawRoutes(raw)
      const scored = scoreAndLabel(raw, predictions)
      const rec = scored.find((r) => r.label === 'RECOMMENDED')
      setActiveRouteIdx(rec?.index ?? 0)
      setDirOpen(true)
      // Fly to midpoint of recommended route
      const geo = (rec ?? scored[0]).geometry
      setFlyTo(geo[Math.floor(geo.length / 2)])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Routing failed'
      if (msg !== 'The user aborted a request.') setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setOriginPin(null); setOriginLabel('')
    setDestPin(null);   setDestLabel('')
    setRawRoutes([]);   setActiveRouteIdx(0)
    setError(null);     setDirOpen(false)
    setPinMode(null)
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await fetchPredictions()
    setIsRefreshing(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="hidden lg:block"><Sidebar /></div>

        <main className="min-w-0 flex flex-col gap-4">
          {/* ── Header ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="transition-colors" style={{ color: 'var(--text-tertiary)' }}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Navigation className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Route Planner
            </h1>
            <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>— All Uganda Roads</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
                title="Refresh congestion predictions"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              {rawRoutes.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-8 px-3 rounded-lg border flex items-center gap-1.5 text-xs transition-colors"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
            {/* ── LEFT PANEL ── */}
            <div className="flex flex-col gap-4">

              {/* Origin + Destination inputs */}
              <GlassCard className="p-4 flex flex-col gap-4">
                {/* Origin */}
                <div>
                  <LocationSearchInput
                    label="From (Origin)"
                    placeholder="Search start location in Uganda…"
                    value={originLabel}
                    pinColor="#00c853"
                    onSelect={handleOriginSelect}
                    onClear={() => { setOriginPin(null); setOriginLabel(''); setRawRoutes([]) }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={useMyLocation}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}
                    >
                      <Crosshair className="h-3 w-3" /> Use my location
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinMode(pinMode === 'origin' ? null : 'origin')}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: pinMode === 'origin' ? '#00c853' : 'var(--border-subtle)',
                        color:       pinMode === 'origin' ? '#00c853' : 'var(--text-secondary)',
                        background:  pinMode === 'origin' ? 'rgba(0,200,83,0.1)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <Navigation className="h-3 w-3" />
                      {pinMode === 'origin' ? 'Click map…' : 'Pin on map'}
                    </button>
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <LocationSearchInput
                    label="To (Destination)"
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
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{
                        borderColor: pinMode === 'destination' ? '#f44336' : 'var(--border-subtle)',
                        color:       pinMode === 'destination' ? '#f44336' : 'var(--text-secondary)',
                        background:  pinMode === 'destination' ? 'rgba(244,67,54,0.1)' : 'var(--bg-tertiary)',
                      }}
                    >
                      <Navigation className="h-3 w-3" />
                      {pinMode === 'destination' ? 'Click map…' : 'Pin on map'}
                    </button>
                  </div>
                </div>

                {/* Find Route button */}
                <button
                  type="button"
                  disabled={!canPlan || loading}
                  onClick={handleFindRoute}
                  className="w-full h-11 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2"
                  style={{
                    background:  canPlan && !loading ? 'rgba(0,212,255,0.1)' : 'transparent',
                    color:       canPlan && !loading ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    borderColor: canPlan && !loading ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    cursor:      canPlan && !loading ? 'pointer' : 'not-allowed',
                    boxShadow:   canPlan && !loading ? 'var(--shadow-glow-cyan)' : 'none',
                  }}
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding best route…</>
                    : <><Navigation className="h-4 w-4" /> Find Best Route</>
                  }
                </button>

                {error && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border"
                    style={{ background: 'rgba(255,34,34,0.08)', borderColor: '#ff222244', color: '#ff4444' }}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
                  </div>
                )}
              </GlassCard>

              {/* Route alternatives */}
              {routeResults.length > 0 && (
                <GlassCard className="p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                    Route Options — Best First
                  </div>
                  <div className="flex flex-col gap-2">
                    {[...routeResults]
                      .sort((a, b) => {
                        // Sort: RECOMMENDED first, then SHORTEST, then ALTERNATIVE
                        const order = { RECOMMENDED: 0, SHORTEST: 1, ALTERNATIVE: 2 }
                        return order[a.label] - order[b.label]
                      })
                      .map((r) => (
                        <RouteCard
                          key={r.index}
                          r={r}
                          active={r.index === activeRouteIdx}
                          onClick={() => setActiveRouteIdx(r.index)}
                        />
                      ))}
                  </div>
                  <div className="mt-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Congestion scores updated live from traffic predictions.
                    The <strong style={{ color: LABEL_COLOR.RECOMMENDED }}>RECOMMENDED</strong> route
                    has the least jam &amp; congestion.
                  </div>
                </GlassCard>
              )}

              {/* Uganda-wide congestion panel */}
              <UgandaCongestionPanel />

              {/* Turn-by-turn directions */}
              {activeRoute && (
                <GlassCard className="p-4">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-semibold mb-1"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                    onClick={() => setDirOpen((o) => !o)}
                  >
                    <span>Turn-by-Turn Directions</span>
                    {dirOpen
                      ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                      : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </button>
                  {dirOpen && (
                    <div className="flex flex-col gap-0 mt-2 max-h-[320px] overflow-y-auto">
                      {activeRoute.steps.map((step, i) => (
                        <div key={i} className="flex gap-3 py-2.5 border-b last:border-0"
                          style={{ borderColor: 'var(--border-subtle)' }}>
                          <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                            style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-primary)' }}>
                            {maneuverIcon(step.maneuverType, step.instruction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {step.instruction}
                            </div>
                            {step.distance > 0 && (
                              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {fmtDist(step.distance)} · {fmtDuration(step.duration)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}
            </div>

            {/* ── RIGHT PANEL: Map ── */}
            <div className="flex flex-col gap-4">
              {/* Summary stats when route is found */}
              {recommendedRoute && (
                <div className="grid grid-cols-3 gap-3">
                  <GlassCard className="p-3">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Distance</div>
                    <div className="mt-1 text-xl font-bold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
                      {fmtDist(recommendedRoute.distance)}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Est. Time</div>
                    <div className="mt-1 text-xl font-bold"
                      style={{ color: 'var(--status-moderate)', fontFamily: 'var(--font-display)' }}>
                      {fmtDuration(recommendedRoute.duration)}
                    </div>
                  </GlassCard>
                  <GlassCard className="p-3">
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Traffic</div>
                    <span
                      className="text-sm font-bold px-2 py-0.5 rounded"
                      style={{
                        background: congestionColor(recommendedRoute.congestionScore) + '22',
                        color:      congestionColor(recommendedRoute.congestionScore),
                      }}
                    >
                      {congestionLabel(recommendedRoute.congestionScore)}
                    </span>
                  </GlassCard>
                </div>
              )}

              {/* Map */}
              <div className="glass-card p-0 overflow-hidden flex-1" style={{ minHeight: '420px' }}>
                <MapView
                  height="100%"
                  showHeatmap
                  pulsingHotspots
                  showZoomControls
                  scrollWheelZoom
                  routeResults={routeResults}
                  activeRouteIdx={activeRouteIdx}
                  originPin={originPin}
                  destinationPin={destPin}
                  flyTo={flyTo}
                  pinMode={pinMode}
                  onMapClick={handleMapClick}
                  className="min-h-[420px]"
                />
              </div>

              {/* Pin mode hint */}
              {pinMode && (
                <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--accent-primary)' }}>
                  <Navigation className="h-4 w-4 animate-pulse shrink-0" />
                  Click anywhere on the map to set your <strong>{pinMode === 'origin' ? 'starting point' : 'destination'}</strong>
                </div>
              )}

              {/* Empty state */}
              {rawRoutes.length === 0 && !loading && (
                <GlassCard className="p-6 text-center">
                  <Navigation className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--text-tertiary)' }} />
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Search any <strong style={{ color: 'var(--text-primary)' }}>From</strong> and{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>To</strong> location in Uganda,
                    then click <strong style={{ color: 'var(--accent-primary)' }}>Find Best Route</strong>.
                    <br /><br />
                    The system will automatically find all available routes and recommend the one
                    with <strong style={{ color: '#00e676' }}>least jam &amp; congestion</strong>.
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
