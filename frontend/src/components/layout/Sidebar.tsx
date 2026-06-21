import React from 'react'
import {
  AlertTriangle,
  BarChart2,
  Bell,
  Cog,
  Home,
  Map as MapIcon,
  Navigation,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useAuth } from '../../context/AuthContext'

type Item = {
  to?: string
  label: string
  disabled?: boolean
  badge?: number
  icon: React.ReactNode
}

function SidebarItem({ item }: { item: Item }) {
  const base = 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors'

  if (item.disabled || !item.to) {
    return (
      <div className={`${base} opacity-40 cursor-not-allowed`}>
        <span className="text-(--text-tertiary)">{item.icon}</span>
        <span className="text-sm text-(--text-tertiary)">{item.label}</span>
        <span className="ml-auto text-[10px] text-(--text-tertiary) border border-(--border-subtle) rounded px-1">
          Soon
        </span>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        [
          base,
          isActive
            ? 'bg-[rgba(0,136,204,0.12)] border border-(--border-primary) text-(--accent-primary)'
            : 'hover:bg-[rgba(255,255,255,0.04)] text-(--text-secondary)',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? 'var(--accent-primary)' : undefined }}>
            {item.icon}
          </span>
          <span className="text-sm">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span
              className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-4.5 text-center"
              style={{
                background: 'rgba(255,45,45,0.15)',
                color: 'var(--status-critical)',
                border: '1px solid rgba(255,45,45,0.3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const incidents = useAppStore((s) => s.incidents)
  const { role } = useAuth()
  const activeIncidents = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED'
  ).length

  const items: Item[] = [
    { to: '/',          label: 'Dashboard',             icon: <Home          className="h-4 w-4" /> },
    { to: '/map',       label: 'Live Map',               icon: <MapIcon       className="h-4 w-4" /> },
    // Guests can see incidents but not file them
    ...(role !== 'GUEST'
      ? [{ to: '/report', label: 'Report Incident', icon: <AlertTriangle className="h-4 w-4" />, badge: activeIncidents }]
      : [{ label: 'Report Incident', icon: <AlertTriangle className="h-4 w-4" />, disabled: true }]
    ),
    { to: '/analytics', label: 'Analytics',              icon: <BarChart2     className="h-4 w-4" /> },
    { to: '/planner',   label: 'Route Planner',          icon: <Navigation    className="h-4 w-4" /> },
    { to: '/alerts',    label: 'Alerts & Notifications', icon: <Bell          className="h-4 w-4" /> },
    { to: '/settings',  label: 'Settings',               icon: <Cog           className="h-4 w-4" /> },
  ]

  return (
    <aside className="p-3 glass-card flex flex-col gap-1 self-start sticky top-4">
      {items.map((item) => (
        <SidebarItem key={item.label} item={item} />
      ))}
    </aside>
  )
}
