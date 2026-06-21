import { useEffect, useRef, useState } from 'react'
import { Activity, Clock, RouteIcon, TriangleAlert } from 'lucide-react'
import GlassCard from '../components/layout/GlassCard'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import MapView from '../components/map/MapView'
import PredictionFeed from '../components/dashboard/PredictionFeed'
import IncidentStream from '../components/dashboard/IncidentStream'
import WeatherWidget from '../components/dashboard/WeatherWidget'
import HourlyTrendChart from '../components/charts/HourlyTrendChart'
import RouteCongestionBar from '../components/charts/RouteCongestionBar'
import { useAppStore } from '../store/useAppStore'

/* ── Count-up hook ─────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setValue(Math.round(progress * target))
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return value
}

/* ── KPI Card ──────────────────────────────────────────────── */
function KPICard({
  label,
  target,
  suffix = '',
  icon,
  accentVar,
  sub,
}: {
  label: string
  target: number
  suffix?: string
  icon: React.ReactNode
  accentVar: string
  sub?: string
}) {
  const count = useCountUp(target)

  return (
    <GlassCard className="p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-(--text-secondary) truncate">{label}</div>
        <div
          className="mt-1.5 text-2xl font-bold text-(--text-primary)"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {count}{suffix}
        </div>
        {sub && (
          <div className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</div>
        )}
      </div>
      <div
        className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center"
        style={{
          background: 'rgba(0,0,0,0.2)',
          border: `1px solid ${accentVar}`,
          boxShadow: `0 0 16px ${accentVar}55`,
        }}
      >
        {icon}
      </div>
    </GlassCard>
  )
}

/* ── Page ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const incidents  = useAppStore((s) => s.incidents)
  const routes     = useAppStore((s) => s.routes)
  const predictions = useAppStore((s) => s.predictions)

  const activeIncidents = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED'
  ).length

  const avgCongestion = Math.round(
    routes.reduce((sum, r) => sum + r.congestionIndex, 0) / routes.length
  )

  const affectedRoutes = routes.filter(
    (r) => r.status === 'HEAVY' || r.status === 'CRITICAL'
  ).length

  const lastPredAt = predictions[0]?.predictedAt
  const lastPredLabel = lastPredAt
    ? new Date(lastPredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      {/* Body — stacks on mobile, 3-col on lg+ */}
      <div className="flex-1 px-3 sm:px-4 pt-4 pb-2 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 h-full">

          {/* Sidebar — desktop only */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Centre — map + trend chart */}
          <main className="min-w-0 flex flex-col gap-4">
            <GlassCard className="p-0 overflow-hidden shrink-0">
              <MapView
                height="45vh"
                showHeatmap
                pulsingHotspots
                showZoomControls
                autoPan={false}
                className="w-full"
              />
            </GlassCard>

            <HourlyTrendChart />
          </main>

          {/* Right panel — stacks below map on mobile */}
          <aside className="min-w-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-80px)]">
            <PredictionFeed />
            <IncidentStream />
            <WeatherWidget />
          </aside>
        </div>
      </div>

      {/* KPI bar */}
      <div className="px-3 sm:px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="Active Incidents"
          target={activeIncidents}
          accentVar="var(--status-critical)"
          icon={<TriangleAlert className="h-5 w-5 text-(--status-critical)" />}
          sub="across all routes"
        />
        <KPICard
          label="Avg Congestion Index"
          target={avgCongestion}
          accentVar="var(--status-moderate)"
          icon={<Activity className="h-5 w-5 text-(--status-moderate)" />}
          sub="0 – 100 scale"
        />
        <KPICard
          label="Affected Routes"
          target={affectedRoutes}
          accentVar="var(--status-heavy)"
          icon={<RouteIcon className="h-5 w-5 text-(--status-heavy)" />}
          sub="heavy or critical"
        />
        <KPICard
          label="Last Prediction"
          target={0}
          suffix=""
          accentVar="var(--accent-primary)"
          icon={<Clock className="h-5 w-5 text-(--accent-primary)" />}
          sub={`at ${lastPredLabel}`}
        />
      </div>

      {/* Charts row */}
      <div className="px-3 sm:px-4 pb-4 lg:pb-6">
        <RouteCongestionBar />
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  )
}
