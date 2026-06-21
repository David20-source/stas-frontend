import { useAppStore } from '../../store/useAppStore'
import GlassCard from '../layout/GlassCard'
import { congestionColor } from '../../utils/congestion'

export default function RouteCongestionBar() {
  const routes = useAppStore((s) => s.routes)
  const sorted = routes.slice().sort((a, b) => b.congestionIndex - a.congestionIndex).slice(0, 8)

  return (
    <GlassCard className="p-4">
      <div
        className="text-sm font-semibold text-[var(--text-primary)] mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Route Congestion Ranking
      </div>
      <div className="flex flex-col gap-2.5">
        {sorted.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-28 text-xs text-[var(--text-secondary)] truncate shrink-0">
              {r.name}
            </div>
            <div className="flex-1 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${r.congestionIndex}%`,
                  background: congestionColor(r.status),
                  boxShadow: `0 0 8px ${congestionColor(r.status)}66`,
                }}
              />
            </div>
            <div
              className="w-8 text-right text-xs shrink-0"
              style={{ fontFamily: 'var(--font-mono)', color: congestionColor(r.status) }}
            >
              {r.congestionIndex}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
