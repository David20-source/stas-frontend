import { useRef, useState, useEffect } from 'react'
import {
  BarChart2, Bell, Cog, Home,
  Map as MapIcon, Navigation, TrendingUp,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import GlassCard from '../components/layout/GlassCard'
import Navbar from '../components/layout/Navbar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import MapView from '../components/map/MapView'
import PredictionFeed from '../components/dashboard/PredictionFeed'
import HourlyTrendChart from '../components/charts/HourlyTrendChart'
import RouteCongestionBar from '../components/charts/RouteCongestionBar'
import CongestionBadge from '../components/ui/CongestionBadge'
import { useAppStore } from '../store/useAppStore'
import { congestionColor } from '../utils/congestion'
import { timeAgo } from '../utils/formatters'

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

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-(--text-secondary)">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color }}>{value}</div>
    </GlassCard>
  )
}

// ── Analyst Sidebar ────────────────────────────────────────────────────────

function AnalystSidebar() {
  const items = [
    { to: '/analyst/dashboard', label: 'Dashboard',    icon: <Home       className="h-4 w-4" />, end: true },
    { to: '/map',               label: 'Live Map',      icon: <MapIcon    className="h-4 w-4" /> },
    { to: '/analytics',         label: 'Analytics',     icon: <BarChart2  className="h-4 w-4" /> },
    { to: '/planner',           label: 'Route Planner', icon: <Navigation className="h-4 w-4" /> },
    { to: '/alerts',            label: 'Alerts',        icon: <Bell       className="h-4 w-4" /> },
    { to: '/settings',          label: 'Settings',      icon: <Cog        className="h-4 w-4" /> },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ['flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
      isActive
        ? 'bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.4)] text-[#a855f7]'
        : 'hover:bg-[rgba(255,255,255,0.04)] text-(--text-secondary)',
    ].join(' ')

  return (
    <aside className="p-3 glass-card flex flex-col gap-1 self-start sticky top-4">
      <div className="flex items-center gap-2 px-3 py-2 mb-1">
        <TrendingUp className="h-4 w-4 text-[#a855f7]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#a855f7]">Analyst</span>
      </div>
      {items.map((item) => (
        <NavLink key={item.label} to={item.to} end={item.end} className={linkClass}>
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? '#a855f7' : undefined }}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  )
}

// ── Incident Breakdown ─────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e',
}

function IncidentBreakdown() {
  const incidents = useAppStore((s) => s.incidents)

  const byType = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {})

  const bySeverity = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <GlassCard className="p-4">
        <div className="text-sm font-semibold text-(--text-primary) mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Incidents by Type
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <div className="w-16 text-xs text-(--text-secondary) shrink-0">{type}</div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <div className="h-full rounded-full" style={{ width: `${(count / incidents.length) * 100}%`, background: 'var(--accent-primary)' }} />
              </div>
              <div className="text-xs text-(--text-secondary) w-5 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{count}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="text-sm font-semibold text-(--text-primary) mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Incidents by Severity
        </div>
        <div className="flex flex-col gap-2">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
            const count = bySeverity[sev] ?? 0
            return (
              <div key={sev} className="flex items-center gap-3">
                <div className="w-16 text-xs shrink-0" style={{ color: SEV_COLOR[sev] }}>{sev}</div>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <div className="h-full rounded-full" style={{ width: incidents.length ? `${(count / incidents.length) * 100}%` : '0%', background: SEV_COLOR[sev] }} />
                </div>
                <div className="text-xs text-(--text-secondary) w-5 text-right" style={{ fontFamily: 'var(--font-mono)' }}>{count}</div>
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}

// ── Route Table ────────────────────────────────────────────────────────────

function RouteTable() {
  const routes = useAppStore((s) => s.routes)
  return (
    <GlassCard className="p-4">
      <div className="text-sm font-semibold text-(--text-primary) mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        All Routes — Current Status
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-(--border-subtle)">
              {['Route', 'Name', 'Length', 'Index', 'Status'].map((h) => (
                <th key={h} className="pb-2 pr-4 text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.id} className="border-b border-(--border-subtle) hover:bg-[rgba(255,255,255,0.02)]">
                <td className="py-2.5 pr-4 text-(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>{r.id}</td>
                <td className="py-2.5 pr-4 text-(--text-primary)">{r.name}</td>
                <td className="py-2.5 pr-4 text-(--text-secondary)" style={{ fontFamily: 'var(--font-mono)' }}>{r.lengthKm} km</td>
                <td className="py-2.5 pr-4" style={{ fontFamily: 'var(--font-mono)', color: congestionColor(r.status) }}>{r.congestionIndex}</td>
                <td className="py-2.5"><CongestionBadge level={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

// ── Recent Activity ────────────────────────────────────────────────────────

function RecentActivity() {
  const incidents = useAppStore((s) => s.incidents)
  return (
    <GlassCard className="p-4">
      <div className="text-sm font-semibold text-(--text-primary) mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Recent Activity
      </div>
      <div className="flex flex-col gap-2">
        {incidents.slice(0, 6).map((inc) => (
          <div key={inc.id} className="flex items-start justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 font-semibold" style={{ color: SEV_COLOR[inc.severity] ?? '#6b7280' }}>{inc.type}</span>
              <span className="text-(--text-secondary) truncate">{inc.address}</span>
            </div>
            <div className="text-(--text-tertiary) shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>{timeAgo(inc.createdAt)}</div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AnalystDashboardPage() {
  const routes      = useAppStore((s) => s.routes)
  const incidents   = useAppStore((s) => s.incidents)
  const predictions = useAppStore((s) => s.predictions)

  const avgCongest = useCountUp(
    routes.length ? Math.round(routes.reduce((a, r) => a + r.congestionIndex, 0) / routes.length) : 0
  )

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr_280px] gap-4">

        <div className="hidden lg:block"><AnalystSidebar /></div>

        {/* Main content — analytics heavy */}
        <main className="min-w-0 flex flex-col gap-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Total Routes"     value={routes.length}     color="var(--accent-primary)" />
            <KPICard label="Avg Congestion"   value={`${avgCongest}/100`} color="var(--status-moderate)" />
            <KPICard label="Total Incidents"  value={incidents.length}  color="var(--status-critical)" />
            <KPICard label="Predictions"      value={predictions.length} color="var(--status-clear)" />
          </div>

          {/* Map — compact */}
          <GlassCard className="p-0 overflow-hidden shrink-0">
            <MapView height="28vh" showHeatmap pulsingHotspots showZoomControls autoPan={false} className="w-full" />
          </GlassCard>

          <HourlyTrendChart />
          <RouteCongestionBar />
          <RouteTable />
          <IncidentBreakdown />
        </main>

        {/* Right — predictions + recent activity */}
        <aside className="min-w-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-80px)]">
          <PredictionFeed />
          <RecentActivity />
        </aside>
      </div>

      <MobileBottomNav />
    </div>
  )
}
