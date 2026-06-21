import { Bell, DoorOpen, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useAppStore } from '../../store/useAppStore'

export default function Navbar() {
  const { role, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const incidents = useAppStore((s) => s.incidents)
  const activeCount = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED'
  ).length

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg glass-card flex items-center justify-center shrink-0">
          {/* Traffic light icon */}
          <svg viewBox="0 0 20 34" width="18" height="30" aria-hidden="true">
            <rect x="3" y="0" width="14" height="34" rx="4" fill="currentColor" opacity="0.15" />
            <rect x="3" y="0" width="14" height="34" rx="4" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.4" />
            <circle cx="10" cy="7" r="4" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 3px #ef4444)' }} />
            <circle cx="10" cy="17" r="4" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 3px #f59e0b)' }} />
            <circle cx="10" cy="27" r="4" fill="#22c55e" style={{ filter: 'drop-shadow(0 0 3px #22c55e)' }} />
          </svg>
        </div>
        <div className="leading-tight">
          <div
            className="text-lg font-semibold text-(--text-primary)"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            STAS
          </div>
          <div className="text-xs text-(--text-secondary)">Kampala Metropolitan</div>
        </div>
      </div>

      {/* Live badge */}
      <div className="hidden md:flex items-center gap-2 glass-card px-3 py-1.5">
        <span
          className="h-2 w-2 rounded-full bg-(--status-clear) shrink-0"
          style={{ animation: 'pulse 2s infinite', boxShadow: '0 0 6px var(--status-clear)' }}
        />
        <span className="text-xs text-(--text-secondary)">
          LIVE — Monitoring 12 routes across Kampala
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg glass-card flex items-center justify-center hover:border-(--border-primary) transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark'
            ? <Sun  className="h-4 w-4 text-(--status-moderate)" />
            : <Moon className="h-4 w-4 text-(--accent-primary)" />
          }
        </button>

        {/* Alerts bell */}
        <button
          type="button"
          onClick={() => navigate('/alerts')}
          className="h-9 w-9 rounded-lg glass-card flex items-center justify-center relative hover:border-(--border-primary) transition-colors"
          aria-label={`Alerts — ${activeCount} active`}
        >
          <Bell className="h-4 w-4 text-(--accent-primary)" />
          {activeCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: 'var(--status-critical)', color: '#fff', boxShadow: '0 0 6px var(--status-critical)' }}
            >
              {activeCount > 9 ? '9+' : activeCount}
            </span>
          )}
        </button>

        {/* User / role */}
        <button
          type="button"
          className="h-9 rounded-lg glass-card px-3 text-xs flex items-center gap-2 hover:border-(--border-primary) transition-colors"
          onClick={() => { logout(); navigate('/login') }}
          title={user ? `Sign out (${user.full_name || role})` : 'Sign out'}
        >
          <DoorOpen className="h-3.5 w-3.5 text-(--text-secondary)" />
          <span className="text-(--text-secondary)">{role}</span>
        </button>
      </div>
    </header>
  )
}
