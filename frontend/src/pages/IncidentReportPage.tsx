import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, ArrowLeft, Loader2, Navigation, Send, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import GlassCard from '../components/layout/GlassCard'
import CongestionBadge from '../components/ui/CongestionBadge'
import { KAMPALA_ROUTES } from '../utils/kampalaRoutes'
import { fetchUgandaOsmRoads, type OsmHighwayType } from '../api/overpass'
import { useAppStore, type Incident } from '../store/useAppStore'
import { api } from '../api/client'
import { mapIncident } from '../api/mappers'

type RouteOption = {
  id: string
  name: string
  startLocation: string
  endLocation: string
  ref: string
  highway: string
  lat: number
  lng: number
  status: (typeof KAMPALA_ROUTES)[number]['status'] | 'UNKNOWN'
  isKampala: boolean
}

const ROAD_TYPE_LABEL: Record<string, string> = {
  motorway: 'Motorway', motorway_link: 'Motorway Link',
  trunk: 'Trunk Road', trunk_link: 'Trunk Link',
  primary: 'Primary Road', primary_link: 'Primary Link',
  secondary: 'Secondary Road', secondary_link: 'Secondary Link',
  tertiary: 'Tertiary Road', unclassified: 'Road', residential: 'Street',
}

const INCIDENT_TYPES = ['JAM', 'ACCIDENT', 'WORKS', 'FLOODING', 'LIGHT', 'CONVOY', 'OTHER'] as const
const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

const INCIDENT_ICONS: Record<string, string> = {
  JAM: '🚦', ACCIDENT: '💥', WORKS: '🚧', FLOODING: '🌊',
  LIGHT: '🔦', CONVOY: '🚛', OTHER: '⚠️',
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      'var(--text-secondary)',
  MEDIUM:   'var(--status-moderate)',
  HIGH:     'var(--status-heavy)',
  CRITICAL: 'var(--status-critical)',
}

export default function IncidentReportPage() {
  const navigate    = useNavigate()
  const addIncident = useAppStore((s) => s.addIncident)

  const [type,     setType]     = useState<typeof INCIDENT_TYPES[number]>('JAM')
  const [severity, setSeverity] = useState<typeof SEVERITY_LEVELS[number]>('MEDIUM')
  const [desc,     setDesc]     = useState('')
  const [anonymous, setAnonymous] = useState(false)

  // Route selection
  const [routeQuery,    setRouteQuery]    = useState('')
  const [routeOpen,     setRouteOpen]     = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null)

  // Uganda-wide road search
  const [ugandaRoads,  setUgandaRoads]  = useState<RouteOption[]>([])
  const [roadsLoading, setRoadsLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    const types: OsmHighwayType[] = [
      'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
    ]
    fetchUgandaOsmRoads(types, ctrl.signal)
      .then((segs) => {
        const seen = new Set<string>()
        const roads: RouteOption[] = []
        for (const seg of segs) {
          const key = seg.name || seg.ref
          if (!key || seen.has(key)) continue
          seen.add(key)
          const mid = seg.geometry[Math.floor(seg.geometry.length / 2)]
          roads.push({
            id: `osm-${seg.id}`,
            name: seg.name || seg.ref,
            startLocation: '',
            endLocation: '',
            ref: seg.ref,
            highway: seg.highway,
            lat: mid[0],
            lng: mid[1],
            status: 'UNKNOWN',
            isKampala: false,
          })
        }
        setUgandaRoads(roads)
      })
      .catch(() => {})
      .finally(() => setRoadsLoading(false))
    return () => ctrl.abort()
  }, [])

  const allRoutes = useMemo<RouteOption[]>(() => [
    ...KAMPALA_ROUTES.map((r) => ({
      id: r.id, name: r.name,
      startLocation: r.startLocation, endLocation: r.endLocation,
      ref: '', highway: 'primary',
      lat: r.lat, lng: r.lng, status: r.status, isKampala: true,
    })),
    ...ugandaRoads,
  ], [ugandaRoads])

  const routeMatches = useMemo(() => {
    const q = routeQuery.toLowerCase()
    return allRoutes
      .filter((r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.ref.toLowerCase().includes(q) ||
        r.startLocation.toLowerCase().includes(q) ||
        r.endLocation.toLowerCase().includes(q),
      )
      .slice(0, 60)
  }, [routeQuery, allRoutes])

  function selectRoute(r: RouteOption) {
    setSelectedRoute(r)
    setRouteQuery(r.name)
    setRouteOpen(false)
  }

  function clearRoute() {
    setSelectedRoute(null)
    setRouteQuery('')
    setRouteOpen(false)
  }

  // Submission state
  const [submitted,    setSubmitted]    = useState(false)
  const [submittedInc, setSubmittedInc] = useState<Incident | null>(null)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const descLen = desc.length
  const valid   = desc.length >= 20 && selectedRoute !== null

  async function handleSubmit() {
    if (!valid || !selectedRoute) return
    setSubmitError(null)

    const routeId = selectedRoute.isKampala ? selectedRoute.id : ''
    const address = selectedRoute.name

    let newIncident: Incident
    try {
      const { data } = await api.post('/incidents', {
        route_id:     routeId || null,
        type,
        severity,
        latitude:     selectedRoute.lat,
        longitude:    selectedRoute.lng,
        address,
        description:  desc,
        is_anonymous: anonymous,
      })
      newIncident = mapIncident(data)
    } catch {
      newIncident = {
        id:          crypto.randomUUID(),
        routeId:     routeId || null,
        type,
        severity,
        latitude:    selectedRoute.lat,
        longitude:   selectedRoute.lng,
        address,
        description: desc,
        status:      'PENDING',
        createdAt:   new Date().toISOString(),
      }
      setSubmitError('Saved locally — server unreachable.')
    }

    addIncident(newIncident)
    setSubmittedInc(newIncident)
    setSubmitted(true)
    setTimeout(() => navigate('/'), 4000)
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-(--bg-primary) flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 pb-16">
          <GlassCard className="p-8 max-w-sm w-full text-center">
            <div
              className="h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-4"
              style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid var(--status-clear)' }}
            >
              <Send className="h-6 w-6" style={{ color: 'var(--status-clear)' }} />
            </div>
            <div className="text-xl font-bold text-(--text-primary) mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Incident Reported
            </div>
            <p className="text-sm text-(--text-secondary) mb-4">
              Your report has been submitted and is now visible to traffic authorities.
            </p>
            {submittedInc && (
              <div
                className="text-left rounded-lg p-3 border border-(--border-subtle) flex flex-col gap-1.5 mb-4"
                style={{ background: 'rgba(0,0,0,0.15)' }}
              >
                {[
                  ['Report ID', `#${submittedInc.id.slice(0, 8).toUpperCase()}`, 'var(--font-mono)'],
                  ['Type',      submittedInc.type,                               undefined],
                  ['Severity',  submittedInc.severity,                           undefined],
                  ['Location',  submittedInc.address,                            undefined],
                  ['Submitted', new Date(submittedInc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'var(--font-mono)'],
                ].map(([label, value, font]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-(--text-tertiary)">{label}</span>
                    <span
                      className="text-(--text-secondary) text-right max-w-[60%] truncate"
                      style={{
                        fontFamily: font ?? undefined,
                        color: label === 'Severity' ? SEVERITY_COLORS[submittedInc.severity] : undefined,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-(--text-tertiary)">Redirecting to dashboard…</p>
          </GlassCard>
        </div>
        <MobileBottomNav />
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-6 max-w-2xl mx-auto w-full pb-20 lg:pb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-(--text-secondary) hover:text-(--text-primary) mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <GlassCard className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,45,45,0.1)', border: '1px solid rgba(255,45,45,0.3)' }}
            >
              <AlertTriangle className="h-5 w-5 text-(--status-critical)" />
            </div>
            <div>
              <div className="font-bold text-(--text-primary)" style={{ fontFamily: 'var(--font-display)' }}>
                Report Incident
              </div>
              <div className="text-xs text-(--text-secondary)">
                Select a road anywhere in Uganda and describe what's happening
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">

            {/* ── Road / Route (required) ─────────────────────────────────── */}
            <div className="relative">
              <label className="block text-xs font-semibold text-(--text-secondary) mb-2 uppercase tracking-wider">
                Road / Route *
                {roadsLoading && (
                  <span className="ml-2 inline-flex items-center gap-1 normal-case font-normal text-(--text-tertiary)">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    loading Uganda roads…
                  </span>
                )}
                {!roadsLoading && ugandaRoads.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-(--text-tertiary)">
                    {(allRoutes.length).toLocaleString()} roads available
                  </span>
                )}
              </label>

              {/* Search input */}
              <div className="relative">
                <Navigation
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{ color: selectedRoute ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
                />
                <input
                  type="text"
                  value={routeQuery}
                  onChange={(e) => { setRouteQuery(e.target.value); setSelectedRoute(null); setRouteOpen(true) }}
                  onFocus={() => setRouteOpen(true)}
                  onBlur={() => setTimeout(() => setRouteOpen(false), 150)}
                  placeholder={roadsLoading ? 'Loading roads…' : 'Search any road or highway in Uganda…'}
                  className="w-full h-11 pl-9 pr-9 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border outline-none transition-colors"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: selectedRoute ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                />
                {routeQuery && (
                  <button
                    type="button"
                    onMouseDown={clearRoute}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-primary) transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {routeOpen && routeMatches.length > 0 && (
                <div
                  className="absolute z-20 mt-1 w-full rounded-lg border border-(--border-subtle) overflow-hidden"
                  style={{ background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="max-h-52 overflow-y-auto">
                    {routeMatches.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onMouseDown={() => selectRoute(r)}
                        className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-[rgba(0,212,255,0.07)] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-(--text-primary) font-medium">{r.name}</div>
                          <div className="text-xs text-(--text-tertiary) mt-0.5">
                            {r.isKampala
                              ? `${r.startLocation} → ${r.endLocation}`
                              : `${ROAD_TYPE_LABEL[r.highway] ?? 'Road'}${r.ref ? ` · ${r.ref}` : ''}`
                            }
                          </div>
                        </div>
                        {r.isKampala && <CongestionBadge level={r.status} />}
                      </button>
                    ))}
                  </div>
                  {routeMatches.length === 60 && (
                    <div
                      className="px-3 py-2 text-xs border-t border-(--border-subtle)"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--bg-primary)' }}
                    >
                      Showing first 60 results — type more to narrow down
                    </div>
                  )}
                </div>
              )}

              {/* Selected road card */}
              {selectedRoute && (
                <div
                  className="mt-2 rounded-lg p-3 border flex items-start gap-3"
                  style={{ background: 'rgba(0,212,255,0.05)', borderColor: 'var(--accent-primary)' }}
                >
                  <div
                    className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(0,212,255,0.12)' }}
                  >
                    <Navigation className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-(--text-primary)">{selectedRoute.name}</div>
                    <div className="text-xs text-(--text-tertiary) mt-0.5">
                      {selectedRoute.isKampala
                        ? `${selectedRoute.startLocation} → ${selectedRoute.endLocation}`
                        : `${ROAD_TYPE_LABEL[selectedRoute.highway] ?? 'Road'}${selectedRoute.ref ? ` · ${selectedRoute.ref}` : ''} · Uganda`
                      }
                    </div>
                  </div>
                  {selectedRoute.isKampala && (
                    <CongestionBadge level={selectedRoute.status} />
                  )}
                </div>
              )}
            </div>

            {/* ── Incident type ────────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-2 uppercase tracking-wider">
                Incident Type *
              </label>
              <div className="flex flex-wrap gap-2">
                {INCIDENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5"
                    style={{
                      background:  type === t ? 'rgba(0,212,255,0.12)' : 'transparent',
                      borderColor: type === t ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color:       type === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    <span>{INCIDENT_ICONS[t]}</span>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Severity ─────────────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-2 uppercase tracking-wider">
                Severity *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_LEVELS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    className="w-full py-2 rounded-lg text-xs font-semibold border transition-colors"
                    style={{
                      color:       severity === s ? SEVERITY_COLORS[s] : 'var(--text-tertiary)',
                      borderColor: severity === s ? SEVERITY_COLORS[s] : 'var(--border-subtle)',
                      background:  severity === s ? `${SEVERITY_COLORS[s]}18` : 'transparent',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Description ──────────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-(--text-secondary) mb-2 uppercase tracking-wider">
                Description * <span className="normal-case font-normal">(min 20 chars)</span>
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Describe the incident — what's happening, how many lanes affected, visible hazards…"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) resize-none transition-colors"
                style={{ background: 'var(--bg-secondary)' }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: descLen >= 20 ? 'var(--status-clear)' : 'var(--text-tertiary)' }}>
                  {descLen < 20 ? `${20 - descLen} more characters needed` : 'Minimum reached ✓'}
                </span>
                <span className="text-xs text-(--text-tertiary)">{descLen}/500</span>
              </div>
            </div>

            {/* ── Anonymous toggle ─────────────────────────────────────────── */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="accent-(--accent-primary)"
              />
              <span className="text-sm text-(--text-secondary)">Submit anonymously</span>
            </label>

            {/* ── Validation hint ──────────────────────────────────────────── */}
            {!selectedRoute && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                * Select a road above to enable submission
              </p>
            )}

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <button
              type="button"
              disabled={!valid}
              onClick={handleSubmit}
              className="h-12 w-full rounded-lg text-sm font-semibold border transition-colors flex items-center justify-center gap-2"
              style={{
                background:  valid ? 'rgba(0,212,255,0.1)' : 'transparent',
                color:       valid ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                borderColor: valid ? 'var(--accent-primary)' : 'var(--border-subtle)',
                cursor:      valid ? 'pointer' : 'not-allowed',
                boxShadow:   valid ? 'var(--shadow-glow-cyan)' : 'none',
              }}
            >
              <Send className="h-4 w-4" />
              Submit Incident Report
            </button>

            {submitError && (
              <p className="text-xs text-center" style={{ color: 'var(--status-moderate)' }}>
                {submitError}
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      <MobileBottomNav />
    </div>
  )
}
