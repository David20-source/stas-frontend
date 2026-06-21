import { useAppStore } from '../../store/useAppStore'
import CongestionBadge from '../ui/CongestionBadge'
import GlassCard from '../layout/GlassCard'
import { Zap } from 'lucide-react'

export default function PredictionFeed() {
  const predictions = useAppStore((s) => s.predictions)

  const top = predictions
    .slice()
    .sort((a, b) => b.congestionIndex - a.congestionIndex)
    .slice(0, 6)

  return (
    <GlassCard className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[var(--accent-primary)]" />
          <span
            className="font-semibold text-sm text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ML Predictions
          </span>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]" style={{ fontFamily: 'var(--font-mono)' }}>
          Auto-refresh 5m
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {top.map((p) => (
          <div
            key={p.routeId}
            className="rounded-lg border border-[var(--border-subtle)] p-3 hover:border-[var(--border-primary)] transition-colors"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-sm text-[var(--text-primary)] truncate">{p.routeName}</div>
              <CongestionBadge level={p.congestionLevel} />
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(p.confidence * 100)}%`,
                    background: 'var(--accent-primary)',
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                {Math.round(p.confidence * 100)}%
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                ~{Math.round(p.predictedAvgSpeedKmh)} km/h
              </span>
              {p.estimatedClearanceMins > 0 && (
                <span>Clears in {p.estimatedClearanceMins}m</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
