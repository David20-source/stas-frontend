import { AlertTriangle, Droplets, Construction, Car, TrafficCone, Star, Info } from 'lucide-react'
import { useAppStore, type Incident } from '../../store/useAppStore'
import Badge from '../ui/Badge'
import GlassCard from '../layout/GlassCard'
import { timeAgo } from '../../utils/formatters'

function incidentIcon(type: Incident['type']) {
  switch (type) {
    case 'JAM':      return <Car className="h-4 w-4" />
    case 'ACCIDENT': return <AlertTriangle className="h-4 w-4" />
    case 'WORKS':    return <Construction className="h-4 w-4" />
    case 'FLOODING': return <Droplets className="h-4 w-4" />
    case 'LIGHT':    return <TrafficCone className="h-4 w-4" />
    case 'CONVOY':   return <Star className="h-4 w-4" />
    default:         return <Info className="h-4 w-4" />
  }
}

function incidentColor(type: Incident['type']): string {
  switch (type) {
    case 'JAM':      return 'var(--status-heavy)'
    case 'ACCIDENT': return 'var(--status-critical)'
    case 'WORKS':    return 'var(--status-moderate)'
    case 'FLOODING': return 'var(--accent-primary)'
    case 'LIGHT':    return 'var(--status-incident)'
    case 'CONVOY':   return 'var(--status-moderate)'
    default:         return 'var(--text-secondary)'
  }
}

function severityVariant(sev: Incident['severity']): 'danger' | 'info' | 'warning' | 'neutral' {
  switch (sev) {
    case 'CRITICAL': return 'danger'
    case 'HIGH':     return 'info'
    case 'MEDIUM':   return 'warning'
    default:         return 'neutral'
  }
}

export default function IncidentStream() {
  const incidents = useAppStore((s) => s.incidents)
  const active = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED')

  return (
    <GlassCard className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[var(--status-critical)]"
            style={{ boxShadow: '0 0 6px var(--status-critical)', animation: 'pulse 2s infinite' }}
          />
          <span
            className="font-semibold text-sm text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Live Incidents
          </span>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">{active.length} active</span>
      </div>

      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
        {active.length === 0 ? (
          <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">
            No active incidents
          </div>
        ) : (
          active.map((inc) => (
            <div
              key={inc.id}
              className="rounded-lg border border-[var(--border-subtle)] p-3"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="mt-0.5 shrink-0"
                  style={{ color: incidentColor(inc.type) }}
                >
                  {incidentIcon(inc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="text-sm text-[var(--text-primary)]">{inc.type}</span>
                    <Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                    {inc.address}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(inc.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}
