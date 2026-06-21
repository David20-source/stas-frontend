import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variantStyles: Record<BadgeVariant, { color: string; bg: string; border: string }> = {
  default:  { color: 'var(--accent-primary)',   bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.25)' },
  success:  { color: 'var(--status-clear)',     bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.25)' },
  warning:  { color: 'var(--status-moderate)',  bg: 'rgba(255,184,0,0.1)',   border: 'rgba(255,184,0,0.25)' },
  danger:   { color: 'var(--status-critical)',  bg: 'rgba(255,45,45,0.1)',   border: 'rgba(255,45,45,0.25)' },
  info:     { color: 'var(--status-heavy)',     bg: 'rgba(255,107,53,0.1)',  border: 'rgba(255,107,53,0.25)' },
  neutral:  { color: 'var(--text-secondary)',   bg: 'rgba(74,85,104,0.1)',   border: 'rgba(74,85,104,0.25)' },
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  const s = variantStyles[variant]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {children}
    </span>
  )
}
