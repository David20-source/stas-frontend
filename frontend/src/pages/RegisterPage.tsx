import { useState } from 'react'
import { AlertCircle, Eye, EyeOff, Layers, Lock, Mail, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import MapView from '../components/map/MapView'
import GlassCard from '../components/layout/GlassCard'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register, continueAsGuest, isLoading, authError, clearError } = useAuth()
  const navigate = useNavigate()

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)

  const canSubmit = name.trim().length >= 2 && email.includes('@') && password.length >= 6

  async function handleRegister() {
    if (!canSubmit) return
    try {
      await register(name.trim(), email, password)
      navigate('/')
    } catch {
      // error is set in AuthContext
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRegister()
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-(--bg-primary)">
      <div className="absolute inset-0 z-0">
        <MapView height="100vh" showHeatmap autoPan pulsingHotspots showZoomControls={false} />
      </div>

      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'rgba(8,13,26,0.55)' }} />

      <div className="absolute inset-0 flex items-center justify-center p-6 z-20">
        <GlassCard className="w-full max-w-sm p-7">

          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-lg glass-card flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-(--accent-primary)" />
            </div>
            <div>
              <div className="text-xl font-bold text-(--text-primary)" style={{ fontFamily: 'var(--font-display)' }}>
                Create Account
              </div>
              <div className="text-xs text-(--text-secondary)">STAS — Kampala Metro</div>
            </div>
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

          <div className="flex flex-col gap-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-tertiary)" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError() }}
                onKeyDown={handleKeyDown}
                className="w-full h-11 pl-9 pr-3 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
                style={{ background: 'var(--bg-secondary)' }}
              />
            </div>

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
                placeholder="Password (min 6 characters)"
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

            <button
              type="button"
              disabled={isLoading || !canSubmit}
              onClick={handleRegister}
              className="h-11 w-full rounded-lg text-sm font-semibold border border-(--border-primary) mt-1 transition-colors flex items-center justify-center gap-2"
              style={{
                background: 'rgba(0,212,255,0.1)',
                color: 'var(--accent-primary)',
                opacity: isLoading || !canSubmit ? 0.5 : 1,
                cursor: isLoading || !canSubmit ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-(--border-subtle)" />
              <span className="text-xs text-(--text-tertiary)">or</span>
              <div className="flex-1 h-px bg-(--border-subtle)" />
            </div>

            <button
              type="button"
              className="h-11 w-full rounded-lg text-sm text-(--text-primary) border border-(--border-subtle) hover:border-(--border-primary) transition-colors"
              onClick={() => { continueAsGuest(); navigate('/') }}
            >
              Continue as Guest
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-(--text-tertiary)">
            Already have an account?{' '}
            <Link to="/login" className="text-(--accent-primary) hover:underline">Sign in</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
