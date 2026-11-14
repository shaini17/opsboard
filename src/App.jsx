import { useEffect, useState } from 'react'

import MainLayout from './layouts/MainLayout'
import AuthPage from './pages/AuthPage'

import Dashboard from './pages/Dashboard'
import IncidentManagement from './pages/IncidentManagement'
import ServiceMonitoring from './pages/ServiceMonitoring'
import DeploymentManagement from './pages/DeploymentManagement'
import { MaintenanceScheduler } from './pages/MaintenanceScheduler'

import {
  TeamManagement,
  AuditLogs,
  SettingsPage,
} from './pages/OperationsPages'

import {
  apiRequest,
  getToken,
  saveToken,
  clearToken,
} from './services/api'

function App() {
  const [user, setUser] = useState(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      const token = getToken()

      if (!token) {
        setCheckingSession(false)
        return
      }

      try {
        const data = await apiRequest('/auth/me', { token })
        setUser(data.user)
      } catch (error) {
        console.error('Session restoration failed:', error.message)
        clearToken()
      } finally {
        setCheckingSession(false)
      }
    }

    restoreSession()
  }, [])

  function handleLogin(authData) {
    saveToken(authData.token, authData.remember)
    setUser(authData.user)
    setActivePage('Dashboard')
  }

  function handleLogout() {
    clearToken()
    setUser(null)
    setActivePage('Dashboard')
  }

  function renderPage() {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />
      case 'Incidents':
        return <IncidentManagement />
      case 'Services':
        return <ServiceMonitoring />
      case 'Deployments':
        return <DeploymentManagement />
      case 'Maintenance':
        return <MaintenanceScheduler />
      case 'Team':
        return <TeamManagement />
      case 'Audit Logs':
        return <AuditLogs />
      case 'Settings':
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Checking your session...</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthPage onLogin={handleLogin} />

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={setActivePage}
      user={user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </MainLayout>
  )
}

export default App
