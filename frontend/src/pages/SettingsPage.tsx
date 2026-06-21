import { AlertCircle, ArrowLeft, Bell, CheckCircle, Cog, Eye, EyeOff, Info, KeyRound, Lock, Monitor, Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import MobileBottomNav from '../components/layout/MobileBottomNav'
import GlassCard from '../components/layout/GlassCard'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 rounded-full border transition-colors shrink-0"
      style={{
        background: checked ? 'rgba(0,212,255,0.2)' : 'transparent',
        borderColor: checked ? 'var(--accent-primary)' : 'var(--border-subtle)',
      }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full transition-transform"
        style={{
          left: '2px',
          background: checked ? 'var(--accent-primary)' : 'var(--text-tertiary)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: checked ? '0 0 8px var(--accent-primary)' : 'none',
        }}
      />
    </button>
  )
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-(--border-subtle) last:border-0">
      <div
        className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid var(--border-subtle)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-(--text-primary)">{label}</div>
        {description && (
          <div className="text-xs text-(--text-tertiary) mt-0.5">{description}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function ls<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback } catch { return fallback }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ }
}

function PasswordField({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-tertiary)" />
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pl-9 pr-10 rounded-lg text-sm text-(--text-primary) placeholder:text-(--text-tertiary) border border-(--border-subtle) outline-none focus:border-(--border-primary) transition-colors"
        style={{ background: 'var(--bg-secondary)' }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-tertiary) hover:text-(--text-secondary)"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { changePassword, isLoading, user } = useAuth()

  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [pwError,    setPwError]    = useState<string | null>(null)
  const [pwSuccess,  setPwSuccess]  = useState(false)

  async function handleChangePassword() {
    setPwError(null)
    setPwSuccess(false)
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return }
    try {
      await changePassword(currentPw, newPw)
      setPwSuccess(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch {
      // error message comes from AuthContext via authError, but we catch it here
      // so we can show it inline instead
      setPwError('Password change failed. Please check your current password.')
    }
  }

  const [notifIncidents,    setNotifIncidentsRaw]    = useState(() => ls('stas-notif-incidents',    true))
  const [notifPredictions,  setNotifPredictionsRaw]  = useState(() => ls('stas-notif-predictions',  true))
  const [notifCriticalOnly, setNotifCriticalOnlyRaw] = useState(() => ls('stas-notif-critical-only', false))
  const [soundAlerts,       setSoundAlertsRaw]       = useState(() => ls('stas-sound-alerts',       false))
  const [autoRefresh,       setAutoRefreshRaw]       = useState(() => ls('stas-auto-refresh',       true))
  const [compactMode,       setCompactModeRaw]       = useState(() => ls('stas-compact',            false))

  // Persist each setting to localStorage on change
  function setNotifIncidents(v: boolean)    { setNotifIncidentsRaw(v);    lsSet('stas-notif-incidents',    v) }
  function setNotifPredictions(v: boolean)  { setNotifPredictionsRaw(v);  lsSet('stas-notif-predictions',  v) }
  function setNotifCriticalOnly(v: boolean) { setNotifCriticalOnlyRaw(v); lsSet('stas-notif-critical-only', v) }
  function setSoundAlerts(v: boolean)       { setSoundAlertsRaw(v);       lsSet('stas-sound-alerts',       v) }
  function setAutoRefresh(v: boolean)       { setAutoRefreshRaw(v);       lsSet('stas-auto-refresh',       v) }
  function setCompactMode(v: boolean)       { setCompactModeRaw(v);       lsSet('stas-compact',            v) }

  // Wire compact mode to html attribute so CSS can respond
  useEffect(() => {
    document.documentElement.setAttribute('data-compact', compactMode ? 'true' : 'false')
  }, [compactMode])

  return (
    <div className="min-h-screen bg-(--bg-primary) flex flex-col">
      <Navbar />

      <div className="flex-1 px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="hidden lg:block"><Sidebar /></div>

        <main className="min-w-0 flex flex-col gap-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Link to="/" className="text-(--text-tertiary) hover:text-(--text-secondary) transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Cog className="h-4 w-4 text-(--accent-primary)" />
            <h1
              className="text-xl font-bold text-(--text-primary)"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Settings
            </h1>
          </div>

          {/* Appearance */}
          <GlassCard className="p-4">
            <div
              className="text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider mb-3"
            >
              Appearance
            </div>

            <SettingRow
              icon={theme === 'dark' ? <Moon className="h-4 w-4 text-(--accent-primary)" /> : <Sun className="h-4 w-4 text-(--status-moderate)" />}
              label="Theme"
              description={theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}
            >
              <div className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-(--text-tertiary)" />
                <ToggleSwitch checked={theme === 'dark'} onChange={() => toggleTheme()} />
                <Moon className="h-3.5 w-3.5 text-(--text-tertiary)" />
              </div>
            </SettingRow>

            <SettingRow
              icon={<Monitor className="h-4 w-4 text-(--text-secondary)" />}
              label="Compact Mode"
              description="Reduce padding and spacing throughout the UI"
            >
              <ToggleSwitch checked={compactMode} onChange={setCompactMode} />
            </SettingRow>
          </GlassCard>

          {/* Notifications */}
          <GlassCard className="p-4">
            <div
              className="text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider mb-3"
            >
              Notifications
            </div>

            <SettingRow
              icon={<Bell className="h-4 w-4 text-(--accent-primary)" />}
              label="Incident Alerts"
              description="Get notified when new incidents are reported"
            >
              <ToggleSwitch checked={notifIncidents} onChange={setNotifIncidents} />
            </SettingRow>

            <SettingRow
              icon={<Bell className="h-4 w-4 text-(--status-moderate)" />}
              label="Prediction Alerts"
              description="Receive AI-generated traffic predictions"
            >
              <ToggleSwitch checked={notifPredictions} onChange={setNotifPredictions} />
            </SettingRow>

            <SettingRow
              icon={<Bell className="h-4 w-4 text-(--status-critical)" />}
              label="Critical Only"
              description="Only notify for critical severity events"
            >
              <ToggleSwitch checked={notifCriticalOnly} onChange={setNotifCriticalOnly} />
            </SettingRow>

            <SettingRow
              icon={soundAlerts
                ? <Volume2 className="h-4 w-4 text-(--text-secondary)" />
                : <VolumeX className="h-4 w-4 text-(--text-tertiary)" />
              }
              label="Sound Alerts"
              description="Play a sound for critical notifications"
            >
              <ToggleSwitch checked={soundAlerts} onChange={setSoundAlerts} />
            </SettingRow>
          </GlassCard>

          {/* Data */}
          <GlassCard className="p-4">
            <div
              className="text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider mb-3"
            >
              Data &amp; Refresh
            </div>

            <SettingRow
              icon={<Cog className="h-4 w-4 text-(--text-secondary)" />}
              label="Auto Refresh"
              description="Automatically refresh traffic data every 30 seconds"
            >
              <ToggleSwitch checked={autoRefresh} onChange={setAutoRefresh} />
            </SettingRow>
          </GlassCard>

          {/* Security */}
          {user && user.id !== 'guest' && (
            <GlassCard className="p-4">
              <div className="text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider mb-3">
                Security
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid var(--border-subtle)' }}
                >
                  <KeyRound className="h-4 w-4 text-(--accent-primary)" />
                </div>
                <div>
                  <div className="text-sm text-(--text-primary)">Change Password</div>
                  <div className="text-xs text-(--text-tertiary)">Update your account password</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <PasswordField placeholder="Current password" value={currentPw} onChange={setCurrentPw} />
                <PasswordField placeholder="New password" value={newPw} onChange={setNewPw} />
                <PasswordField placeholder="Confirm new password" value={confirmPw} onChange={setConfirmPw} />

                {pwError && (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border"
                    style={{ background: 'rgba(255,45,45,0.08)', borderColor: 'rgba(255,45,45,0.3)', color: 'var(--status-critical)' }}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{pwError}</span>
                  </div>
                )}

                {pwSuccess && (
                  <div
                    className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs border"
                    style={{ background: 'rgba(0,212,100,0.08)', borderColor: 'rgba(0,212,100,0.3)', color: 'var(--status-clear)' }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Password updated successfully.</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isLoading || !currentPw || !newPw || !confirmPw}
                  onClick={handleChangePassword}
                  className="h-10 w-full rounded-lg text-sm font-semibold border border-(--border-primary) transition-colors"
                  style={{
                    background: 'rgba(0,212,255,0.1)',
                    color: 'var(--accent-primary)',
                    opacity: isLoading || !currentPw || !newPw || !confirmPw ? 0.5 : 1,
                    cursor: isLoading || !currentPw || !newPw || !confirmPw ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </GlassCard>
          )}

          {/* About */}
          <GlassCard className="p-4">
            <div
              className="text-xs font-semibold text-(--text-tertiary) uppercase tracking-wider mb-3"
            >
              About
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { label: 'Application',  value: 'STAS — Smart Traffic Alert System' },
                { label: 'City',         value: 'Kampala Metropolitan Area' },
                { label: 'Version',      value: '0.1.0-alpha' },
                { label: 'Routes',       value: '12 monitored corridors' },
                { label: 'Backend',      value: 'Coming soon — Express + Supabase' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-(--text-tertiary)">{label}</span>
                  <span className="text-(--text-secondary) text-right">{value}</span>
                </div>
              ))}
            </div>

            <div
              className="mt-4 flex items-start gap-2 rounded-lg p-3 border border-(--border-subtle) text-xs text-(--text-tertiary)"
              style={{ background: 'rgba(0,212,255,0.04)' }}
            >
              <Info className="h-4 w-4 text-(--accent-primary) shrink-0 mt-0.5" />
              Settings are saved locally in your browser. Backend preferences will sync once authentication is wired.
            </div>
          </GlassCard>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
