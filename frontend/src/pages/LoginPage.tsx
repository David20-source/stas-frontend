import { useState } from 'react'
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import MapView from '../components/map/MapView'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { login, continueAsGuest, isLoading, authError, clearError } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    try {
      const { user: loggedInUser } = await login(email, password)
      if (remember) localStorage.setItem('stas_remember', email)
      const roleDestMap: Partial<Record<string, string>> = {
        ADMIN:   '/admin/dashboard',
        OFFICER: '/officer/dashboard',
        ANALYST: '/analyst/dashboard',
      }
      navigate(roleDestMap[loggedInUser?.role ?? ''] ?? '/')
    } catch {
      // error is set in AuthContext
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-(--bg-primary)">
      {/* Live map background */}
      <div className="absolute inset-0 z-0">
        <MapView
          height="100vh"
          showHeatmap
          autoPan
          pulsingHotspots
          showZoomControls={false}
        />
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: theme === 'dark'
            ? 'rgba(8,13,26,0.55)'
            : 'rgba(238,242,248,0.45)',
        }}
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 h-9 w-9 rounded-lg glass-card flex items-center justify-center z-30"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <span className="text-sm">☀️</span> : <span className="text-sm">🌙</span>}
      </button>

      {/* Auth card */}
      <div className="absolute inset-0 flex items-center justify-center p-6 z-20">

        {/* Outer double-blue border ring */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '384px',
            borderRadius: '22px',
            padding: '3px',
            background: 'linear-gradient(135deg, #38bdf8, #1d4ed8)',
            boxShadow: '0 0 0 6px rgba(14,165,233,0.18), 0 0 40px rgba(29,78,216,0.4)',
          }}
        >
          {/* Inner accent ring */}
          <div
            style={{
              position: 'absolute',
              inset: '7px',
              borderRadius: '16px',
              border: '1.5px solid rgba(56,189,248,0.45)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Card body */}
          <div
            className="glass-card w-full p-7"
            style={{ borderRadius: '19px', border: 'none' }}
          >

            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
              {/* Traffic light logo */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  height: '56px',
                  width: '34px',
                  borderRadius: '10px',
                  background: 'rgba(14,165,233,0.1)',
                  border: '1.5px solid rgba(14,165,233,0.35)',
                }}
              >
                <svg viewBox="0 0 20 44" width="18" height="40" aria-hidden="true">
                  <rect x="2" y="0" width="16" height="44" rx="5" fill="rgba(15,23,42,0.75)" />
                  <rect x="2" y="0" width="16" height="44" rx="5" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" fill="none" />
                  <circle cx="10" cy="8.5"  r="5" fill="#ef4444" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} />
                  <circle cx="10" cy="22"   r="5" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
                  <circle cx="10" cy="35.5" r="5" fill="#22c55e" style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
                </svg>
              </div>

              <div>
                <div
                  className="text-2xl font-bold text-(--text-primary)"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  STAS
                </div>
                <div
                  className="text-xs pb-0.5"
                  style={{
                    color: '#38bdf8',
                    borderBottom: '1.5px solid #1d4ed8',
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                  }}
                >
                  Kampala Metropolitan
                </div>
              </div>
            </div>

            <div className="mt-3 mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-(--text-secondary) border border-(--border-subtle)">
              <span className="h-1.5 w-1.5 rounded-full bg-(--status-clear)" style={{ animation: 'pulse 2s infinite' }} />
              LIVE — Monitoring 12 routes across Kampala
            </div>

            {/* Error banner */}
            {authError && (
              <div
                className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border"
                style={{ background: 'rgba(255,45,45,0.08)', borderColor: 'rgba(255,45,45,0.3)', color: 'var(--status-critical)' }}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-tertiary)" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError() }}
                  onKeyDown={handleKeyDown}
                  className="w-full h-11 pl-9 pr-3 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                  style={{ background: 'var(--bg-secondary)' }}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-tertiary)" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  onKeyDown={handleKeyDown}
                  className="w-full h-11 pl-9 pr-10 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                  style={{ background: 'var(--bg-secondary)' }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-secondary)"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-(--accent-primary)"
                />
                <span className="text-xs text-(--text-secondary)">Remember me</span>
              </label>

              <button
                type="button"
                disabled={isLoading || !email || !password}
                onClick={handleLogin}
                className="h-11 w-full rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(29,78,216,0.25))',
                  border: '1.5px solid rgba(56,189,248,0.5)',
                  color: '#38bdf8',
                  opacity: isLoading || !email || !password ? 0.5 : 1,
                  cursor: isLoading || !email || !password ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-(--border-subtle)" />
                <span className="text-xs text-(--text-tertiary)">or</span>
                <div className="flex-1 h-px bg-(--border-subtle)" />
              </div>

              <button
                type="button"
                className="h-11 w-full rounded-lg text-sm text-(--text-primary) border border-(--border-subtle) hover:border-(--border-primary) hover:bg-[rgba(0,212,255,0.05)] transition-colors"
                onClick={() => { continueAsGuest(); navigate('/') }}
              >
                Continue as Guest
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-(--text-tertiary)">
              Don't have an account?{' '}
              <Link to="/register" className="text-(--accent-primary) hover:underline">Create one</Link>
            </p>

          </div>{/* end card body */}
        </div>{/* end outer border ring */}
      </div>{/* end auth card container */}
    </div>
  )
}
