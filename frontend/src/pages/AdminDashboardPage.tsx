import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart2, Bell,
  Clock, Cog, Home, Map as MapIcon, Navigation,
  RouteIcon, Server, Shield, Trash2, TriangleAlert,
  UserCog, UserPlus, Users, Wifi, X, Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import GlassCard from '../components/layout/GlassCard'
import Navbar from '../components/layout/Navbar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import MapView from '../components/map/MapView'
import PredictionFeed from '../components/dashboard/PredictionFeed'
import IncidentStream from '../components/dashboard/IncidentStream'
import WeatherWidget from '../components/dashboard/WeatherWidget'
import HourlyTrendChart from '../components/charts/HourlyTrendChart'
import RouteCongestionBar from '../components/charts/RouteCongestionBar'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'

// ── Types ──────────────────────────────────────────────────────────────────

type AdminStats = {
  uptime_seconds: number
  socket_connections: number
  total_users: number
  total_incidents: number
  pending_incidents: number
}

type Role = 'CITIZEN' | 'OFFICER' | 'ANALYST' | 'ADMIN'

type UserRow = {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<Role, string> = {
  ADMIN: '#ef4444', ANALYST: '#a855f7', OFFICER: '#3b82f6', CITIZEN: '#22c55e',
}

function apiErr(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong'
}

// ── Count-up hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setValue(Math.round(p * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KPICard({ label, target, suffix = '', icon, accentVar, sub }: {
  label: string; target: number; suffix?: string
  icon: React.ReactNode; accentVar: string; sub?: string
}) {
  const count = useCountUp(target)
  return (
    <GlassCard className="p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-(--text-secondary) truncate">{label}</div>
        <div className="mt-1.5 text-2xl font-bold text-(--text-primary)" style={{ fontFamily: 'var(--font-display)' }}>
          {count}{suffix}
        </div>
        {sub && <div className="mt-0.5 text-xs text-(--text-tertiary)">{sub}</div>}
      </div>
      <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${accentVar}`, boxShadow: `0 0 16px ${accentVar}55` }}>
        {icon}
      </div>
    </GlassCard>
  )
}

// ── Admin Stat Pill ────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: color + '15', border: `1px solid ${color}30` }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-xs text-(--text-tertiary)">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

// ── User Management Slide Panel ────────────────────────────────────────────

type PanelTab = 'manage' | 'add'

function UserPanel({
  open,
  initialTab,
  onClose,
  onSuccess,
}: {
  open: boolean
  initialTab: PanelTab
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [tab,       setTab]       = useState<PanelTab>(initialTab)
  const [users,     setUsers]     = useState<UserRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [actionId,  setActionId]  = useState<string | null>(null)
  const [panelErr,  setPanelErr]  = useState<string | null>(null)

  // Add-user form state
  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [newRole,    setNewRole]    = useState<Role>('CITIZEN')
  const [submitting, setSubmitting] = useState(false)
  const [formErr,    setFormErr]    = useState<string | null>(null)

  // Sync tab when parent changes initialTab
  useEffect(() => { if (open) setTab(initialTab) }, [open, initialTab])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setPanelErr(null)
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data.users)
    } catch {
      setPanelErr('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open && tab === 'manage') void fetchUsers() }, [open, tab, fetchUsers])

  async function changeRole(userId: string, role: Role) {
    setActionId(userId + role)
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.role } : u))
    } catch (err) {
      setPanelErr(apiErr(err))
    } finally {
      setActionId(null)
    }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setActionId(userId + 'del')
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      onSuccess('User deleted')
    } catch (err) {
      setPanelErr(apiErr(err))
    } finally {
      setActionId(null)
    }
  }

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormErr(null)
    setSubmitting(true)
    try {
      const { data } = await api.post('/auth/register', { full_name: fullName, email, password })
      if (newRole !== 'CITIZEN' && data.user?.id) {
        await api.patch(`/admin/users/${data.user.id}/role`, { role: newRole })
      }
      onSuccess(`User "${fullName}" created as ${newRole}`)
      setFullName(''); setEmail(''); setPassword(''); setNewRole('CITIZEN')
      setTab('manage')
      void fetchUsers()
    } catch (err) {
      setFormErr(apiErr(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: 'var(--bg-primary)',
          borderLeft: '1px solid var(--border-subtle)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border-subtle) shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#ef4444]" />
            <span className="text-sm font-bold text-(--text-primary)">User Management</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-(--text-tertiary) hover:text-(--text-primary) transition-colors"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 gap-2 shrink-0">
          {([
            { id: 'manage', label: 'Manage Users', icon: <UserCog className="h-3.5 w-3.5" /> },
            { id: 'add',    label: 'Add User',     icon: <UserPlus className="h-3.5 w-3.5" /> },
          ] as { id: PanelTab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'rgba(239,68,68,0.15)' : 'var(--bg-secondary)',
                border: `1px solid ${tab === t.id ? 'rgba(239,68,68,0.5)' : 'var(--border-subtle)'}`,
                color: tab === t.id ? '#ef4444' : 'var(--text-tertiary)',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── Manage Users tab ── */}
          {tab === 'manage' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-tertiary)">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                <button
                  type="button"
                  onClick={() => void fetchUsers()}
                  className="text-[10px] px-2 py-1 rounded text-(--accent-primary) transition-colors"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
                >
                  Refresh
                </button>
              </div>

              {panelErr && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  {panelErr}
                </div>
              )}

              {loading && (
                <p className="text-xs text-(--text-tertiary) text-center py-6">Loading users…</p>
              )}

              {!loading && users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Avatar */}
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: ROLE_COLOR[u.role] + '22', color: ROLE_COLOR[u.role] }}
                  >
                    {u.full_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-(--text-primary) truncate">{u.full_name}</p>
                    <p className="text-[10px] text-(--text-tertiary) truncate">{u.email}</p>
                  </div>

                  {/* Role select */}
                  <select
                    value={u.role}
                    disabled={actionId !== null}
                    onChange={(e) => void changeRole(u.id, e.target.value as Role)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer transition-colors"
                    style={{
                      background: ROLE_COLOR[u.role] + '22',
                      color: ROLE_COLOR[u.role],
                    }}
                  >
                    {(['CITIZEN', 'OFFICER', 'ANALYST', 'ADMIN'] as Role[]).map((r) => (
                      <option key={r} value={r} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {/* Delete */}
                  <button
                    type="button"
                    disabled={actionId !== null}
                    onClick={() => void deleteUser(u.id, u.full_name)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-tertiary)' }}
                    title="Delete user"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Add User tab ── */}
          {tab === 'add' && (
            <form onSubmit={handleAddUser} className="flex flex-col gap-4">
              {formErr && (
                <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  {formErr}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--text-secondary)">Full Name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-10 px-3 rounded-xl text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                  style={{ background: 'var(--bg-secondary)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--text-secondary)">Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="h-10 px-3 rounded-xl text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                  style={{ background: 'var(--bg-secondary)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--text-secondary)">Password</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-10 px-3 rounded-xl text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                  style={{ background: 'var(--bg-secondary)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-(--text-secondary)">Assign Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['CITIZEN', 'OFFICER', 'ANALYST', 'ADMIN'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className="h-9 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: newRole === r ? ROLE_COLOR[r] + '20' : 'var(--bg-secondary)',
                        border: `1px solid ${newRole === r ? ROLE_COLOR[r] : 'var(--border-subtle)'}`,
                        color: newRole === r ? ROLE_COLOR[r] : 'var(--text-tertiary)',
                        boxShadow: newRole === r ? `0 0 12px ${ROLE_COLOR[r]}33` : 'none',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-xl text-sm font-semibold transition-all mt-1"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#ef4444',
                  opacity: submitting ? 0.6 : 1,
                  boxShadow: submitting ? 'none' : '0 0 16px rgba(239,68,68,0.15)',
                }}
              >
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

// ── Admin Sidebar ──────────────────────────────────────────────────────────

function AdminSidebar({
  onOpenPanel,
  onBroadcast,
  broadcasting,
}: {
  onOpenPanel: (tab: PanelTab) => void
  onBroadcast: () => void
  broadcasting: boolean
}) {
  const incidents = useAppStore((s) => s.incidents)
  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED').length

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard',             icon: <Home          className="h-4 w-4" />, end: true },
    { to: '/map',             label: 'Live Map',               icon: <MapIcon       className="h-4 w-4" /> },
    { to: '/report',          label: 'Incident Reports',       icon: <AlertTriangle className="h-4 w-4" />, badge: activeIncidents },
    { to: '/analytics',       label: 'Analytics',              icon: <BarChart2     className="h-4 w-4" /> },
    { to: '/planner',         label: 'Route Planner',          icon: <Navigation    className="h-4 w-4" /> },
    { to: '/alerts',          label: 'Alerts & Notifications', icon: <Bell          className="h-4 w-4" /> },
    { to: '/settings',        label: 'Settings',               icon: <Cog           className="h-4 w-4" /> },
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ['flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
      isActive
        ? 'bg-[rgba(0,136,204,0.12)] border border-(--border-primary) text-(--accent-primary)'
        : 'hover:bg-[rgba(255,255,255,0.04)] text-(--text-secondary)',
    ].join(' ')

  return (
    <aside className="p-3 glass-card flex flex-col gap-1 self-start sticky top-4">

      {/* Standard nav links */}
      {navItems.map((item) => (
        <NavLink key={item.label} to={item.to} end={item.end} className={linkClass}>
          {({ isActive }) => (
            <>
              <span style={{ color: isActive ? 'var(--accent-primary)' : undefined }}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5"
                  style={{ background: 'rgba(255,45,45,0.15)', color: 'var(--status-critical)', border: '1px solid rgba(255,45,45,0.3)', fontFamily: 'var(--font-mono)' }}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}

      {/* Admin section divider */}
      <div className="mt-2 mb-1 px-3 flex items-center gap-2">
        <div className="flex-1 h-px bg-(--border-subtle)" />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#ef4444' }}>Admin</span>
        <div className="flex-1 h-px bg-(--border-subtle)" />
      </div>

      {/* Manage Users — opens slide panel on "manage" tab */}
      <button
        type="button"
        onClick={() => onOpenPanel('manage')}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left group"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <UserCog className="h-4 w-4 text-[#ef4444]" />
        <span className="text-sm">Manage Users</span>
        <span className="ml-auto text-[10px] text-(--text-tertiary)">→</span>
      </button>

      {/* Add User — opens slide panel on "add" tab */}
      <button
        type="button"
        onClick={() => onOpenPanel('add')}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <UserPlus className="h-4 w-4 text-[#ef4444]" />
        <span className="text-sm">Add User</span>
        <span className="ml-auto text-[10px] text-(--text-tertiary)">→</span>
      </button>

      {/* Divider before broadcast */}
      <div className="my-1.5 h-px bg-(--border-subtle)" />

      {/* Broadcast */}
      <button
        type="button"
        onClick={onBroadcast}
        disabled={broadcasting}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left"
        style={{
          background: broadcasting ? 'rgba(0,212,255,0.05)' : 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
        }}
      >
        <Zap className={`h-4 w-4 text-(--accent-primary) ${broadcasting ? 'animate-pulse' : ''}`} />
        <span className="text-sm text-(--accent-primary)">{broadcasting ? 'Broadcasting…' : 'Broadcast Now'}</span>
      </button>
    </aside>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

function fmtUptime(s: number): string {
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

export default function AdminDashboardPage() {
  const incidents   = useAppStore((s) => s.incidents)
  const routes      = useAppStore((s) => s.routes)
  const predictions = useAppStore((s) => s.predictions)

  const [adminStats,    setAdminStats]    = useState<AdminStats | null>(null)
  const [broadcasting,  setBroadcasting]  = useState(false)
  const [panelOpen,     setPanelOpen]     = useState(false)
  const [panelTab,      setPanelTab]      = useState<PanelTab>('manage')
  const [toast,         setToast]         = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function openPanel(tab: PanelTab) {
    setPanelTab(tab)
    setPanelOpen(true)
  }

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats')
      setAdminStats(data)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => { void loadStats() }, [loadStats])

  async function broadcast() {
    setBroadcasting(true)
    try {
      const { data } = await api.post('/admin/predict/broadcast')
      showToast(`Broadcast sent — ${data.routes} routes updated`)
      void loadStats()
    } catch {
      showToast('Broadcast failed')
    } finally {
      setBroadcasting(false)
    }
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'REJECTED').length
  const avgCongestion   = routes.length ? Math.round(routes.reduce((s, r) => s + r.congestionIndex, 0) / routes.length) : 0
  const affectedRoutes  = routes.filter((r) => r.status === 'HEAVY' || r.status === 'CRITICAL').length
  const lastPredLabel   = predictions[0]?.predictedAt
    ? new Date(predictions[0].predictedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-primary)', backdropFilter: 'blur(16px)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }}>
          {toast}

        </div>
      )}

      {/* User management slide panel */}
      <UserPanel
        open={panelOpen}
        initialTab={panelTab}
        onClose={() => setPanelOpen(false)}
        onSuccess={(msg) => { showToast(msg); void loadStats() }}
      />

      <Navbar />

      {/* Admin stats bar */}
      {adminStats && (
        <div className="px-3 sm:px-4 pt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Shield className="h-3.5 w-3.5 text-[#ef4444]" />
            <span className="text-xs font-semibold text-[#ef4444]">ADMIN</span>
          </div>
          <StatPill icon={<Server        className="h-3 w-3" />} label="Uptime"      value={fmtUptime(adminStats.uptime_seconds)} color="#00e676" />
          <StatPill icon={<Wifi          className="h-3 w-3" />} label="Connections" value={adminStats.socket_connections}         color="#3b82f6" />
          <StatPill icon={<Users         className="h-3 w-3" />} label="Users"       value={adminStats.total_users}                color="#a855f7" />
          <StatPill icon={<TriangleAlert className="h-3 w-3" />} label="Pending"     value={adminStats.pending_incidents}          color="#f97316" />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => openPanel('add')}
              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              <UserPlus className="h-3 w-3" />Add User
            </button>
            <button type="button" onClick={() => openPanel('manage')}
              className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              <UserCog className="h-3 w-3" />Manage
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 px-3 sm:px-4 pt-4 pb-2 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 h-full">
          <div className="hidden lg:block">
            <AdminSidebar onOpenPanel={openPanel} onBroadcast={broadcast} broadcasting={broadcasting} />
          </div>
          <main className="min-w-0 flex flex-col gap-4">
            <GlassCard className="p-0 overflow-hidden shrink-0">
              <MapView height="45vh" showHeatmap pulsingHotspots showZoomControls autoPan={false} className="w-full" />
            </GlassCard>
            <HourlyTrendChart />
          </main>
          <aside className="min-w-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-80px)]">
            <PredictionFeed />
            <IncidentStream />
            <WeatherWidget />
          </aside>
        </div>
      </div>

      {/* KPI bar */}
      <div className="px-3 sm:px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <KPICard label="Active Incidents"   target={activeIncidents} accentVar="var(--status-critical)" icon={<TriangleAlert className="h-5 w-5 text-(--status-critical)" />} sub="across all routes" />
        <KPICard label="Avg Congestion"     target={avgCongestion}   accentVar="var(--status-moderate)" icon={<Activity      className="h-5 w-5 text-(--status-moderate)" />} sub="0 – 100 scale" />
        <KPICard label="Affected Routes"    target={affectedRoutes}  accentVar="var(--status-heavy)"    icon={<RouteIcon     className="h-5 w-5 text-(--status-heavy)" />}    sub="heavy or critical" />
        <KPICard label="Last Prediction"    target={0}               accentVar="var(--accent-primary)"  icon={<Clock         className="h-5 w-5 text-(--accent-primary)" />}  sub={`at ${lastPredLabel}`} />
      </div>

      {/* Charts */}
      <div className="px-3 sm:px-4 pb-4 lg:pb-6">
        <RouteCongestionBar />
      </div>

      <MobileBottomNav />
    </div>
  )
}
