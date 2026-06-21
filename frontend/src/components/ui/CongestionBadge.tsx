import { type CongestionLevel, congestionColor, congestionBg } from '../../utils/congestion'

export default function CongestionBadge({ level }: { level: CongestionLevel }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{
        color: congestionColor(level),
        background: congestionBg(level),
        borderColor: congestionColor(level) + '44',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
      }}
    >
      {level}
    </span>
  )
}
