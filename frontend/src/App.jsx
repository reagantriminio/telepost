import { useAuth } from './context/AuthContext.jsx'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminDestinationsPage from './pages/AdminDestinationsPage'
import AuditLogsPage from './pages/AuditLogsPage'
import SignUpPage from './pages/SignUpPage'
import AdminUsersPage from './pages/AdminUsersPage'

function App() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    // Optionally return a splash screen or null while we check auth
    return null
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" replace /> : <SignUpPage />}
          />
          <Route 
            path="/dashboard" 
            element={
              user ? <DashboardPage user={user} onLogout={logout} /> : <Navigate to="/login" replace />
            } 
          />
          {user?.is_admin && (
            <>
              <Route path="/admin/destinations" element={<AdminDestinationsPage />} />
              <Route path="/admin/logs" element={<AuditLogsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </>
          )}
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App 