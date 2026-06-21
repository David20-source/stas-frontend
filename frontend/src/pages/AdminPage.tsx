import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, RefreshCw, Server,
  Shield, Trash2, Users, Wifi, XCircle, Zap,
} from 'lucide-react'
import GlassCard from '../components/layout/GlassCard'
import { api } from '../api/client'

// ── Types ──────────────────────────────────────────────────────────────────

type UserRow = {
  id: string
  email: string
  full_name: string
  role: 'CITIZEN' | 'OFFICER' | 'ANALYST' | 'ADMIN'
  created_at: string
}

type IncidentRow = {
  id: string
  type: string
  severity: string
  status: string
  address: string
  route_id: string | null
  created_at: string
}

type Stats = {
  uptime_seconds: number
  socket_connections: number
  total_users: number
  total_incidents: number
  pending_incidents: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  ADMIN:   '#ef4444',
  ANALYST: '#a855f7',
  OFFICER: '#3b82f6',
  CITIZEN: '#22c55e',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:  '#f97316',
  VERIFIED: '#3b82f6',
  RESOLVED: '#22c55e',
  REJECTED: '#6b7280',
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e',
}

function fmtUptime(s: number): string {
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <GlassCard className="flex items-center gap-3 px-4 py-3">
      <div className="p-2 rounded-lg" style={{ background: color + '22' }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-xs text-(--text-tertiary)">{label}</p>
        <p className="text-base font-bold text-(--text-primary)">{value}</p>
      </div>
    </GlassCard>
  )
}

// ── AdminPage ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [users,        setUsers]        = useState<UserRow[]>([])
  const [incidents,    setIncidents]    = useState<IncidentRow[]>([])
  const [stats,        setStats]        = useState<Stats | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, i, s] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/incidents'),
        api.get('/admin/stats'),
      ])
      setUsers(u.data.users)
      setIncidents(i.data.items)
      setStats(s.data)
    } catch {
      showToast('Failed to load admin data — are you logged in as ADMIN?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── User actions ─────────────────────────────────────────────────

  async function changeRole(userId: string, role: UserRow['role']) {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: data.role } : u))
      showToast(`Role updated to ${role}`)
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update role')
    }
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      showToast('User deleted')
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete user')
    }
  }

  // ── Broadcast ────────────────────────────────────────────────────

  async function broadcast() {
    setBroadcasting(true)
    try {
      const { data } = await api.post('/admin/predict/broadcast')
      showToast(`Broadcast sent — ${data.routes} routes updated`)
      void load() // refresh stats
    } catch {
      showToast('Broadcast failed')
    } finally {
      setBroadcasting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-(--bg-primary) p-4 sm:p-6">

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-primary)', backdropFilter: 'blur(16px)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-card)' }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <button type="button" className="h-9 w-9 rounded-lg border border-(--border-subtle) flex items-center justify-center hover:border-(--border-primary) transition-colors" style={{ background: 'var(--glass-bg)' }}>
              <ArrowLeft className="h-4 w-4 text-(--text-secondary)" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#ef4444]" />
            <h1 className="text-lg font-bold text-(--text-primary)">Admin Panel</h1>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#ef444422', color: '#ef4444' }}>SUPERADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="h-9 px-3 rounded-lg border border-(--border-subtle) flex items-center gap-1.5 text-xs text-(--text-secondary) hover:border-(--border-primary) transition-colors"
            style={{ background: 'var(--glass-bg)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={broadcast}
            disabled={broadcasting}
            className="h-9 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{
              background: 'rgba(0,212,255,0.1)',
              borderColor: 'var(--accent-primary)',
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          >
            <Zap className={`h-3.5 w-3.5 ${broadcasting ? 'animate-spin' : ''}`} />
            {broadcasting ? 'Broadcasting…' : 'Broadcast Now'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard icon={<Server className="h-4 w-4" />}   label="Uptime"             value={fmtUptime(stats.uptime_seconds)} color="#00e676" />
          <StatCard icon={<Wifi className="h-4 w-4" />}     label="Live connections"   value={stats.socket_connections}        color="#3b82f6" />
          <StatCard icon={<Users className="h-4 w-4" />}    label="Total users"        value={stats.total_users}               color="#a855f7" />
          <StatCard icon={<CheckCircle className="h-4 w-4"/>} label="Total incidents"  value={stats.total_incidents}           color="#f97316" />
          <StatCard icon={<XCircle className="h-4 w-4" />}  label="Pending incidents"  value={stats.pending_incidents}         color="#ef4444" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Users ──────────────────────────────────────────────── */}
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-(--accent-primary)" />
              <span className="text-sm font-semibold text-(--text-primary)">Users</span>
              <span className="text-[10px] text-(--text-tertiary)">({users.length})</span>
            </div>
          </div>
          <div className="divide-y divide-(--border-subtle)">
            {loading && <p className="px-4 py-6 text-xs text-(--text-tertiary) text-center">Loading…</p>}
            {!loading && users.length === 0 && <p className="px-4 py-6 text-xs text-(--text-tertiary) text-center">No users found</p>}
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: (ROLE_COLOR[u.role] ?? '#6b7280') + '22', color: ROLE_COLOR[u.role] ?? '#6b7280' }}
                >
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-(--text-primary) truncate">{u.full_name}</p>
                  <p className="text-[10px] text-(--text-tertiary) truncate">{u.email}</p>
                </div>
                {/* Role dropdown */}
                <select
                  value={u.role}
                  onChange={(e) => void changeRole(u.id, e.target.value as UserRow['role'])}
                  className="text-[10px] font-semibold px-2 py-1 rounded border-0 outline-none cursor-pointer"
                  style={{
                    background: (ROLE_COLOR[u.role] ?? '#6b7280') + '22',
                    color: ROLE_COLOR[u.role] ?? '#6b7280',
                  }}
                >
                  {(['CITIZEN', 'OFFICER', 'ANALYST', 'ADMIN'] as const).map((r) => (
                    <option key={r} value={r} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{r}</option>
                  ))}
                </select>
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => void deleteUser(u.id, u.full_name)}
                  className="h-6 w-6 rounded flex items-center justify-center text-(--text-tertiary) hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Incidents ────────────────────────────────────────────── */}
        <GlassCard className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-(--border-subtle)">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-[#f97316]" />
              <span className="text-sm font-semibold text-(--text-primary)">Incidents</span>
              <span className="text-[10px] text-(--text-tertiary)">({incidents.length})</span>
            </div>
          </div>
          <div className="max-h-[480px] overflow-y-auto divide-y divide-(--border-subtle)">
            {loading && <p className="px-4 py-6 text-xs text-(--text-tertiary) text-center">Loading…</p>}
            {!loading && incidents.length === 0 && <p className="px-4 py-6 text-xs text-(--text-tertiary) text-center">No incidents</p>}
            {incidents.map((inc) => (
              <div key={inc.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: SEVERITY_COLOR[inc.severity] ?? '#6b7280' }}>
                      {inc.type}
                    </span>
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: (SEVERITY_COLOR[inc.severity] ?? '#6b7280') + '22', color: SEVERITY_COLOR[inc.severity] ?? '#6b7280' }}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: (STATUS_COLOR[inc.status] ?? '#6b7280') + '22', color: STATUS_COLOR[inc.status] ?? '#6b7280' }}
                  >
                    {inc.status}
                  </span>
                </div>
                <p className="text-[10px] text-(--text-secondary) truncate">{inc.address}</p>
                <p className="text-[9px] text-(--text-tertiary) mt-0.5">{fmtDate(inc.created_at)}{inc.route_id ? ` · ${inc.route_id}` : ''}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Dev credentials hint */}
      <div className="mt-6 px-4 py-3 rounded-lg border border-(--border-subtle) text-xs text-(--text-tertiary)" style={{ background: 'var(--bg-secondary)' }}>
        <strong className="text-(--text-secondary)">Dev accounts:</strong>
        {' '}admin@stas.local / admin123 &nbsp;·&nbsp; officer@stas.local / officer123 &nbsp;·&nbsp; citizen@stas.local / citizen123
      </div>
    </div>
  )
}
