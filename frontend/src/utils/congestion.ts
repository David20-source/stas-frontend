export type CongestionLevel = 'CLEAR' | 'MODERATE' | 'HEAVY' | 'CRITICAL' | 'UNKNOWN'

export function getCongestionLevel(index: number): CongestionLevel {
  if (index < 25) return 'CLEAR'
  if (index < 50) return 'MODERATE'
  if (index < 75) return 'HEAVY'
  return 'CRITICAL'
}

export function congestionColor(level: CongestionLevel): string {
  switch (level) {
    case 'CLEAR':    return 'var(--status-clear)'
    case 'MODERATE': return 'var(--status-moderate)'
    case 'HEAVY':    return 'var(--status-heavy)'
    case 'CRITICAL': return 'var(--status-critical)'
    default:         return 'var(--status-unknown)'
  }
}

export function congestionBg(level: CongestionLevel): string {
  switch (level) {
    case 'CLEAR':    return 'rgba(0,255,136,0.12)'
    case 'MODERATE': return 'rgba(255,184,0,0.12)'
    case 'HEAVY':    return 'rgba(255,107,53,0.12)'
    case 'CRITICAL': return 'rgba(255,45,45,0.12)'
    default:         return 'rgba(74,85,104,0.12)'
  }
}

export function congestionLabel(index: number): string {
  const level = getCongestionLevel(index)
  return level.charAt(0) + level.slice(1).toLowerCase()
}
