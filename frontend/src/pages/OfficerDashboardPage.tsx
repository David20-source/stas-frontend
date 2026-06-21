import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, BarChart2, Bell, CheckCircle,
  Clock, Cog, Home, Map as MapIcon, Navigation,
  ShieldCheck, TriangleAlert, XCircle,
} from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import GlassCard from '../components/layout/GlassCard'
import Navbar from '../components/layout/Navbar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import MapView from '../components/map/MapView'
import PredictionFeed from '../components/dashboard/PredictionFeed'
import WeatherWidget from '../components/dashboard/WeatherWidget'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'

// ── Types ──────────────────────────────────────────────────────────────────

type IncidentStatus = 'PENDING' | 'VERIFIED' | 'RESOLVED' | 'REJECTED'

// ── Count-up hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setValue(Math.round(p * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({ label, target, icon, accentVar, sub }: {
  label: string; target: number; icon: React.ReactNode; accentVar: string; sub?: string
}) {
  const count = useCountUp(target)
  return (
    <GlassCard className="p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-(--text-secondary) truncate">{label}</div>
        <div className="mt-1.5 text-2xl font-bold text-(--text-primary)" style={{ fontFamily: 'var(--font-display)' }}>
          {count}
        </div>
        {sub && <div className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</div>}
      </div>
      <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${accentVar}`, boxShadow: `0 0 16px ${accentVar}55` }}>
        {icon}
      </div>
    </GlassCard>
  )
}

// ── Officer Sidebar ────────────────────────────────────────────────────────

function OfficerSidebar() {
  const incidents = useAppStore((s) => s.incidents)
  const pendingCount = incidents.filter((i) => i.status === 'PENDING').length

  const items = [
    { to: '/officer/dashboard', label: 'Dashboard',       icon: <Home          className="h-4 w-4" />, end: true },
    { to: '/map',               label: 'Live Map',         icon: <MapIcon       className="h-4 w-4" /> },
    { to: '/report',            label: 'File Incident',    icon: <AlertTriangle className="h-4 w-4" />, badge: pendingCount },
    { to: '/analytics',         label: 'Analytics',        icon: <BarChart2     className="h-4 w-4" /> },
    { to: '/planner',           label: 'Route Planner',    icon: <Navigation    className="h-4 w-4" /> },
    { to: '/alerts',            label: 'Alerts',           icon: <Bell          className="h-4 w-4" /> },
    { to: '/settings',          label: 'Settings',         icon: <Cog           className="h-4 w-4" /> },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ['flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
      isActive
        ? 'bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.4)] text-[#3b82f6]'
        : 'hover:bg-[rgba(255,255,255,0.04)] text-(--text-secondary)',
    ].join(' ')

  return (
    <aside className="p-3 glass-card flex flex-col gap-1 self-start sticky top-4">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <ShieldCheck className="h-4 w-4 text-[#3b82f6]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#3b82f6]">Officer</span>
      </div>
      {items.map((item) => (
        <NavLink key={item.label} to={item.to} end={item.end} className={linkClass}>
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? '#3b82f6' : undefined }}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(255,45,45,0.15)', color: 'var(--status-critical)', border: '1px solid rgba(255,45,45,0.3)' }}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </aside>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<IncidentStatus, { bg: string; color: string }> = {
  PENDING:  { bg: 'rgba(249,115,22,0.15)',  color: '#f97316' },
  VERIFIED: { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  RESOLVED: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  REJECTED: { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e',
}

// ── Incident Queue ─────────────────────────────────────────────────────────

function IncidentQueue({ onUpdate }: { onUpdate: () => void }) {
  const storeIncidents = useAppStore((s) => s.incidents)
  const updateIncident = useAppStore((s) => s.updateIncident)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast,   setToast]   = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function setStatus(id: string, status: IncidentStatus) {
    setLoading(id + status)
    try {
      const { data } = await api.patch(`/incidents/${id}/status`, { status })
      updateIncident(id, { status: data.status })
      showToast(`Incident marked as ${status}`)
      onUpdate()
    } catch {
      showToast('Action failed — check your connection')
    } finally {
      setLoading(null)
    }
  }

  async function verify(id: string) {
    setLoading(id + 'VERIFY')
    try {
      const { data } = await api.post(`/incidents/${id}/verify`)
      updateIncident(id, { status: data.status })
      showToast('Incident verified')
      onUpdate()
    } catch {
      showToast('Verification failed')
    } finally {
      setLoading(null)
    }
  }

  const queue = storeIncidents.filter((i) => i.status === 'PENDING' || i.status === 'VERIFIED')

  return (
    <GlassCard className="overflow-hidden">
      {toast && (
        <div className="mx-4 mt-4 px-3 py-2 rounded-lg text-xs text-center"
          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent-primary)' }}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#f97316]" />
          <span className="text-sm font-semibold text-(--text-primary)">Incident Queue</span>
          <span className="text-[10px] text-(--text-tertiary)">({queue.length})</span>
        </div>
        <Link to="/report" className="text-[10px] px-2 py-1 rounded text-(--accent-primary)"
          style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
          + File New
        </Link>
      </div>

      <div className="divide-y divide-(--border-subtle) max-h-96 overflow-y-auto">
        {queue.length === 0 && (
          <p className="px-4 py-6 text-xs text-(--text-tertiary) text-center">No active incidents</p>
        )}
        {queue.map((inc) => (
          <div key={inc.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold shrink-0" style={{ color: SEVERITY_COLOR[inc.severity] ?? '#6b7280' }}>
                  {inc.type}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: (SEVERITY_COLOR[inc.severity] ?? '#6b7280') + '22', color: SEVERITY_COLOR[inc.severity] ?? '#6b7280' }}>
                  {inc.severity}
                </span>
                <span className="text-[10px] truncate text-(--text-tertiary)">{inc.address}</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                style={STATUS_STYLE[inc.status as IncidentStatus] ?? { bg: 'transparent', color: '#6b7280' }}>
                {inc.status}
              </span>
            </div>
            <p className="text-[11px] text-(--text-secondary) mb-2 line-clamp-2">{inc.description}</p>
            <div className="flex items-center gap-1.5">
              {inc.status === 'PENDING' && (
                <>
                  <button type="button"
                    disabled={loading !== null}
                    onClick={() => void verify(inc.id)}
                    className="h-6 px-2 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                    style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}>
                    <CheckCircle className="h-3 w-3" />
                    Verify
                  </button>
                  <button type="button"
                    disabled={loading !== null}
                    onClick={() => void setStatus(inc.id, 'REJECTED')}
                    className="h-6 px-2 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                    style={{ background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.3)', color: '#6b7280' }}>
                    <XCircle className="h-3 w-3" />
                    Reject
                  </button>
                </>
              )}
              {inc.status === 'VERIFIED' && (
                <button type="button"
                  disabled={loading !== null}
                  onClick={() => void setStatus(inc.id, 'RESOLVED')}
                  className="h-6 px-2 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                  <CheckCircle className="h-3 w-3" />
                  Resolve
                </button>
              )}
              <span className="ml-auto text-[10px] text-(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function OfficerDashboardPage() {
  const incidents = useAppStore((s) => s.incidents)
  const routes    = useAppStore((s) => s.routes)
  const { fetchIncidents } = useAppStore()

  const refresh = useCallback(() => { void fetchIncidents() }, [fetchIncidents])
  useEffect(() => { refresh() }, [refresh])

  const pending   = incidents.filter((i) => i.status === 'PENDING').length
  const verified  = incidents.filter((i) => i.status === 'VERIFIED').length
  const critical  = incidents.filter((i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'REJECTED').length
  const affected  = routes.filter((r) => r.status === 'HEAVY' || r.status === 'CRITICAL').length

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      {/* Body */}
      <div className="flex-1 px-3 sm:px-4 pt-4 pb-2 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 h-full">

          <div className="hidden lg:block"><OfficerSidebar /></div>

          <main className="min-w-0 flex flex-col gap-4">
            <GlassCard className="p-0 overflow-hidden shrink-0">
              <MapView height="40vh" showHeatmap pulsingHotspots showZoomControls autoPan={false} className="w-full" />
            </GlassCard>
            <IncidentQueue onUpdate={refresh} />
          </main>

          <aside className="min-w-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-80px)]">
            <PredictionFeed />
            <WeatherWidget />
          </aside>
        </div>
      </div>

      {/* KPI bar */}
      <div className="px-3 sm:px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Pending"        target={pending}  accentVar="#f97316" icon={<Clock          className="h-5 w-5 text-[#f97316]" />} sub="awaiting review" />
        <KPICard label="Verified"       target={verified} accentVar="#3b82f6" icon={<CheckCircle    className="h-5 w-5 text-[#3b82f6]" />} sub="confirmed active" />
        <KPICard label="Critical"       target={critical} accentVar="#ef4444" icon={<TriangleAlert  className="h-5 w-5 text-[#ef4444]" />} sub="needs attention" />
        <KPICard label="Affected Routes" target={affected} accentVar="#a855f7" icon={<AlertTriangle className="h-5 w-5 text-[#a855f7]" />} sub="heavy or critical" />
      </div>

      <MobileBottomNav />
    </div>
  )
}
