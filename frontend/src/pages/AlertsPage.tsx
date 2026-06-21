import { useState } from 'react'
import { AlertTriangle, ArrowLeft, Bell, BellOff, CheckCheck, Info, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import GlassCard from '../components/layout/GlassCard'
import { useAppStore } from '../store/useAppStore'
import { timeAgo } from '../utils/formatters'

type Filter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: 'ALL',      label: 'All' },
  { key: 'CRITICAL', label: 'Critical' },
  { key: 'WARNING',  label: 'Warning' },
  { key: 'INFO',     label: 'Info' },
]

export default function AlertsPage() {
  const incidents   = useAppStore((s) => s.incidents)
  const predictions = useAppStore((s) => s.predictions)
  const [filter, setFilter]   = useState<Filter>('ALL')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Build alerts from incidents + predictions
  const alerts = [
    ...incidents.map((i) => ({
      id:      i.id,
      title:   `${i.type} on ${i.address}`,
      body:    i.description,
      time:    i.createdAt,
      level:   i.severity === 'CRITICAL' ? 'CRITICAL'
               : i.severity === 'HIGH'    ? 'WARNING'
               : 'INFO' as Filter,
      icon:    <AlertTriangle className="h-4 w-4" />,
    })),
    ...predictions.map((p) => ({
      id:    `pred-${p.routeId}`,
      title: `Prediction: ${p.routeName}`,
      body:  `Expected congestion level ${p.congestionLevel} at ${new Date(p.predictedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      time:  p.predictedAt,
      level: p.congestionLevel === 'CRITICAL' ? 'CRITICAL'
             : p.congestionLevel === 'HEAVY'   ? 'WARNING'
             : 'INFO' as Filter,
      icon: <Zap className="h-4 w-4" />,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const filtered = filter === 'ALL' ? alerts : alerts.filter((a) => a.level === filter)

  const levelColor: Record<string, string> = {
    CRITICAL: 'var(--status-critical)',
    WARNING:  'var(--status-heavy)',
    INFO:     'var(--accent-primary)',
  }

  function markAllRead() {
    setReadIds(new Set(alerts.map((a) => a.id)))
  }

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="hidden lg:block"><Sidebar /></div>

        <main className="min-w-0 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="text-(--text-tertiary) hover:text-(--text-secondary) transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Bell className="h-4 w-4 text-(--accent-primary)" />
            <h1
              className="text-xl font-bold text-(--text-primary)"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Alerts &amp; Notifications
            </h1>
            {unreadCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,45,45,0.15)', color: 'var(--status-critical)', border: '1px solid rgba(255,45,45,0.3)' }}
              >
                {unreadCount} unread
              </span>
            )}
            <button
              type="button"
              onClick={markAllRead}
              className="ml-auto flex items-center gap-1.5 text-xs text-(--text-tertiary) hover:text-(--text-secondary) transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const count = tab.key === 'ALL' ? alerts.length : alerts.filter((a) => a.level === tab.key).length
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    background:   filter === tab.key ? 'rgba(0,212,255,0.12)' : 'transparent',
                    borderColor:  filter === tab.key ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color:        filter === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {tab.label} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              )
            })}
          </div>

          {/* Alert list */}
          <GlassCard className="p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <BellOff className="h-8 w-8 text-(--text-tertiary) opacity-40" />
                <span className="text-sm text-(--text-tertiary)">No alerts in this category</span>
              </div>
            ) : (
              <div className="divide-y divide-(--border-subtle)">
                {filtered.map((alert) => {
                  const isRead = readIds.has(alert.id)
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
                      onClick={() => setReadIds((prev) => new Set([...prev, alert.id]))}
                    >
                      {/* Icon */}
                      <div
                        className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                        style={{
                          background: `${levelColor[alert.level]}18`,
                          border: `1px solid ${levelColor[alert.level]}44`,
                          color: levelColor[alert.level],
                        }}
                      >
                        {alert.icon}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium text-(--text-primary) truncate"
                            style={{ opacity: isRead ? 0.6 : 1 }}
                          >
                            {alert.title}
                          </span>
                          {!isRead && (
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ background: levelColor[alert.level] }}
                            />
                          )}
                        </div>
                        <p className="text-xs text-(--text-tertiary) mt-0.5 line-clamp-2">{alert.body}</p>
                      </div>

                      {/* Time */}
                      <span
                        className="text-[10px] text-(--text-tertiary) shrink-0 mt-0.5"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {timeAgo(alert.time)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>

          {/* Info note */}
          <GlassCard className="p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-(--accent-primary) shrink-0 mt-0.5" />
            <p className="text-xs text-(--text-tertiary)">
              Real-time push notifications will be available once backend alert subscriptions are connected.
              Alerts are currently derived from incident reports and AI predictions.
            </p>
          </GlassCard>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
