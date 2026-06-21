import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import GlassCard from '../components/layout/GlassCard'
import HourlyTrendChart from '../components/charts/HourlyTrendChart'
import RouteCongestionBar from '../components/charts/RouteCongestionBar'
import { useAppStore } from '../store/useAppStore'
import CongestionBadge from '../components/ui/CongestionBadge'
import { congestionColor } from '../utils/congestion'
import { timeAgo } from '../utils/formatters'

export default function AnalyticsPage() {
  const routes    = useAppStore((s) => s.routes)
  const incidents = useAppStore((s) => s.incidents)
  const predictions = useAppStore((s) => s.predictions)

  const avgCongest = Math.round(routes.reduce((a, r) => a + r.congestionIndex, 0) / routes.length)

  // Simple incident count by type
  const byType = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="hidden lg:block"><Sidebar /></div>

        <main className="min-w-0 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-(--text-tertiary) hover:text-(--text-secondary) transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1
              className="text-xl font-bold text-(--text-primary)"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Analytics
            </h1>
            <span className="text-xs text-(--text-tertiary) ml-1">— Kampala Metro</span>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Routes',        value: routes.length,     color: 'var(--accent-primary)' },
              { label: 'Avg Congestion',       value: `${avgCongest}/100`, color: 'var(--status-moderate)' },
              { label: 'Total Incidents',      value: incidents.length,  color: 'var(--status-critical)' },
              { label: 'Predictions Today',    value: predictions.length, color: 'var(--status-clear)' },
            ].map((k) => (
              <GlassCard key={k.label} className="p-4">
                <div className="text-xs text-(--text-secondary)">{k.label}</div>
                <div
                  className="mt-1 text-2xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: k.color }}
                >
                  {k.value}
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Charts */}
          <HourlyTrendChart />
          <RouteCongestionBar />

          {/* Route table */}
          <GlassCard className="p-4">
            <div
              className="text-sm font-semibold text-(--text-primary) mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              All Routes — Current Status
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-(--border-subtle)">
                    {['Route ID', 'Name', 'Length', 'Index', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} className="border-b border-(--border-subtle) hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-2.5 pr-4 text-(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)' }}>
                        {r.id}
                      </td>
                      <td className="py-2.5 pr-4 text-(--text-primary)">{r.name}</td>
                      <td className="py-2.5 pr-4 text-(--text-secondary)" style={{ fontFamily: 'var(--font-mono)' }}>
                        {r.lengthKm} km
                      </td>
                      <td className="py-2.5 pr-4" style={{ fontFamily: 'var(--font-mono)', color: congestionColor(r.status) }}>
                        {r.congestionIndex}
                      </td>
                      <td className="py-2.5">
                        <CongestionBadge level={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Incident breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <div
                className="text-sm font-semibold text-(--text-primary) mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Incidents by Type
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(byType).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-(--text-secondary)">{type}</div>
                    <div className="flex-1 h-2 rounded-full bg-(--border-subtle) overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / incidents.length) * 100}%`,
                          background: 'var(--accent-primary)',
                        }}
                      />
                    </div>
                    <div className="text-xs text-(--text-secondary) w-4 text-right" style={{ fontFamily: 'var(--font-mono)' }}>
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div
                className="text-sm font-semibold text-(--text-primary) mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Recent Activity
              </div>
              <div className="flex flex-col gap-2">
                {incidents.slice(0, 5).map((inc) => (
                  <div key={inc.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="text-(--text-secondary) truncate">{inc.address}</div>
                    <div className="text-(--text-tertiary) shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                      {timeAgo(inc.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
