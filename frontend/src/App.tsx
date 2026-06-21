import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useAppStore } from './store/useAppStore'
import { getSocket } from './api/socket'
import { mapIncident, mapPrediction } from './api/mappers'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import IncidentReportPage from './pages/IncidentReportPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RegisterPage from './pages/RegisterPage'
import RoutePlannerPage from './pages/RoutePlannerPage'
import AlertsPage from './pages/AlertsPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import OfficerDashboardPage from './pages/OfficerDashboardPage'
import AnalystDashboardPage from './pages/AnalystDashboardPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function OfficerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'OFFICER') return <Navigate to="/" replace />
  return <>{children}</>
}

function AnalystRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'ANALYST') return <Navigate to="/" replace />
  return <>{children}</>
}

/** At the root path, redirect each role to their own dashboard. */
function RootRoute() {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'ADMIN')   return <Navigate to="/admin/dashboard"   replace />
  if (user?.role === 'OFFICER') return <Navigate to="/officer/dashboard" replace />
  if (user?.role === 'ANALYST') return <Navigate to="/analyst/dashboard" replace />
  return <DashboardPage />
}

/** Fetch initial data and wire real-time socket events after authentication. */
function DataSync() {
  const { isAuthenticated, user } = useAuth()
  const { fetchIncidents, fetchPredictions, setPredictions, addIncident, updateIncident, setConnected } = useAppStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Initial fetch
    fetchIncidents()
    fetchPredictions()

    // Attach socket event listeners
    const socket = getSocket()
    if (!socket) return

    function onConnect()    { setConnected(true) }
    function onDisconnect() { setConnected(false) }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onPredictions({ predictions }: any) {
      setPredictions(predictions.map(mapPrediction))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onIncidentNew({ incident }: any) {
      addIncident(mapIncident(incident))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function onIncidentUpdated({ incident }: any) {
      updateIncident(incident.id, mapIncident(incident))
    }

    socket.on('connect',            onConnect)
    socket.on('disconnect',         onDisconnect)
    socket.on('prediction:updated', onPredictions)
    socket.on('incident:new',       onIncidentNew)
    socket.on('incident:updated',   onIncidentUpdated)

    // If already connected before listeners attached, mark connected
    if (socket.connected) setConnected(true)

    return () => {
      socket.off('connect',            onConnect)
      socket.off('disconnect',         onDisconnect)
      socket.off('prediction:updated', onPredictions)
      socket.off('incident:new',       onIncidentNew)
      socket.off('incident:updated',   onIncidentUpdated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  return null
}

function AppRoutes() {
  return (
    <>
      <DataSync />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/"                    element={<RootRoute />} />
        <Route path="/admin/dashboard"   element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/officer/dashboard" element={<OfficerRoute><OfficerDashboardPage /></OfficerRoute>} />
        <Route path="/analyst/dashboard" element={<AnalystRoute><AnalystDashboardPage /></AnalystRoute>} />
        <Route path="/map"               element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
        <Route path="/report"   element={<ProtectedRoute><IncidentReportPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/planner"   element={<ProtectedRoute><RoutePlannerPage /></ProtectedRoute>} />
        <Route path="/alerts"    element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin"     element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*"          element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
