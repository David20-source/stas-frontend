import GlassCard from '../layout/GlassCard'

// Generate mock 24-hour congestion trend data
function generateHourlyData() {
  return Array.from({ length: 24 }, (_, h) => {
    // Simulate Kampala peak hours: 7-9:30 and 16:30-19:30
    let base = 20
    if (h >= 7 && h <= 9)   base = 70 + Math.random() * 20
    else if (h >= 17 && h <= 19) base = 65 + Math.random() * 25
    else if (h >= 12 && h <= 13) base = 35 + Math.random() * 15
    else base = 15 + Math.random() * 20
    return { hour: h, value: Math.round(base) }
  })
}

const DATA = generateHourlyData()
const MAX_VAL = Math.max(...DATA.map((d) => d.value))

export default function HourlyTrendChart() {
  const chartH = 80

  const points = DATA.map((d, i) => {
    const x = (i / (DATA.length - 1)) * 100
    const y = 100 - (d.value / MAX_VAL) * 100
    return `${x},${y}`
  }).join(' ')

  // Area points (closed path)
  const areaPoints = [
    `0,100`,
    ...DATA.map((d, i) => {
      const x = (i / (DATA.length - 1)) * 100
      const y = 100 - (d.value / MAX_VAL) * 100
      return `${x},${y}`
    }),
    `100,100`,
  ].join(' ')

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div
          className="text-sm font-semibold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Hourly Traffic Trend — 24h
        </div>
        <div className="text-xs text-[var(--text-tertiary)]" style={{ fontFamily: 'var(--font-mono)' }}>
          Avg Congestion Index
        </div>
      </div>

      <div style={{ height: chartH, position: 'relative' }}>
        <svg
          viewBox={`0 0 100 100`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,212,255,0.3)" />
              <stop offset="100%" stopColor="rgba(0,212,255,0.0)" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <polygon points={areaPoints} fill="url(#areaGrad)" />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Peak hour shading: 7–9 */}
          <rect x={`${(7 / 23) * 100}`} width={`${(2 / 23) * 100}`} y="0" height="100"
            fill="rgba(255,184,0,0.06)" />
          {/* Peak hour shading: 17–19 */}
          <rect x={`${(17 / 23) * 100}`} width={`${(2 / 23) * 100}`} y="0" height="100"
            fill="rgba(255,107,53,0.06)" />
        </svg>
      </div>

      {/* X-axis hours */}
      <div className="flex justify-between mt-1">
        {[0, 6, 12, 18, 23].map((h) => (
          <span
            key={h}
            className="text-[10px] text-[var(--text-tertiary)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
    </GlassCard>
  )
}
