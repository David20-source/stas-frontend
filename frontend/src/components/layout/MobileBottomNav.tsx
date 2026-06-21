import { AlertTriangle, BarChart2, Bell, Home, Map as MapIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

export default function MobileBottomNav() {
  const incidents = useAppStore((s) => s.incidents)
  const incidentBadge = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED'
  ).length

  const navItems = [
    { to: '/',          label: 'Home',      icon: <Home          className="h-5 w-5" />, end: true },
    { to: '/map',       label: 'Map',        icon: <MapIcon       className="h-5 w-5" /> },
    { to: '/report',    label: 'Report',     icon: <AlertTriangle className="h-5 w-5" />, badge: incidentBadge },
    { to: '/analytics', label: 'Analytics',  icon: <BarChart2     className="h-5 w-5" /> },
    { to: '/alerts',    label: 'Alerts',     icon: <Bell          className="h-5 w-5" /> },
  ]

  return (
    <nav className="lg:hidden sticky bottom-0 z-20 border-t border-(--border-subtle) glass-card">
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-(--accent-primary)'
                  : 'text-(--text-tertiary) hover:text-(--text-secondary)',
              ].join(' ')
            }
          >
            {item.icon}
            <span className="text-[10px] leading-none">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span
                className="absolute top-1 right-1 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: 'var(--status-critical)', color: '#fff' }}
              >
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
