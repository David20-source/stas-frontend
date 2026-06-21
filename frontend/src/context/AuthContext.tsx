import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { connectSocket, disconnectSocket } from '../api/socket'

export type UserRole = 'GUEST' | 'CITIZEN' | 'OFFICER' | 'ANALYST' | 'ADMIN'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  full_name: string
}

type AuthContextValue = {
  user: AuthUser | null
  role: UserRole
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<{ user: AuthUser }>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  continueAsGuest: () => void
  clearError: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  // legacy shim used by pages that still call setRole
  setRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'stas_token'
const USER_KEY  = 'stas_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') } catch { return null }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const isAuthenticated = user !== null

  // Connect / disconnect socket whenever auth state changes
  useEffect(() => {
    if (user && user.id !== 'guest') {
      connectSocket(user.id, user.role)
    } else {
      disconnectSocket()
    }
  }, [user])

  function _persist(token: string, u: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }

  async function login(email: string, password: string): Promise<{ user: AuthUser }> {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      const loggedInUser = data.user as AuthUser
      _persist(data.access_token, loggedInUser)
      return { user: loggedInUser }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed. Check your credentials.'
      setAuthError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  async function register(name: string, email: string, password: string) {
    setIsLoading(true)
    setAuthError(null)
    try {
      const { data } = await api.post('/auth/register', { full_name: name, email, password })
      _persist(data.access_token, data.user as AuthUser)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed. Try again.'
      setAuthError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    api.post('/auth/logout').catch(() => {})
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    disconnectSocket()
    setUser(null)
  }

  function continueAsGuest() {
    setUser({ id: 'guest', email: '', role: 'GUEST', full_name: 'Guest' })
  }

  function clearError() {
    setAuthError(null)
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    setIsLoading(true)
    setAuthError(null)
    try {
      await api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Password change failed. Please try again.'
      setAuthError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  function setRole(role: UserRole) {
    if (user) {
      const updated = { ...user, role }
      setUser(updated)
      localStorage.setItem(USER_KEY, JSON.stringify(updated))
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, role: user?.role ?? 'GUEST', isAuthenticated, isLoading, authError, login, register, logout, continueAsGuest, clearError, changePassword, setRole }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isAuthenticated, isLoading, authError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
