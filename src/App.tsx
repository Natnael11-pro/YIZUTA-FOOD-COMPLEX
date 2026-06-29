import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import DashboardLayout from './components/layout/DashboardLayout'

// Import Pages
import DashboardPage from './pages/DashboardPage'
import AdminPanel from './pages/admin/AdminPanel'
import WarehousePage from './pages/warehouse/WarehousePage'
import ProductionPage from './pages/production/ProductionPage'
import FinancePage from './pages/finance/FinancePage'
import SalesPage from './pages/sales/SalesPage'

// Secure Route Component - SIMPLIFIED
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, userRole, loading } = useAuth()

  console.log('🔒 Route check - loading:', loading, 'user:', user?.email, 'role:', userRole)

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If role is still loading, show a simple message
  if (userRole === null && allowedRoles) {
    console.log('⏳ Role still loading...')
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading your role...</div>
  }

  // Check permissions
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log('⛔ Access denied for role:', userRole)
    const roleRedirects: Record<string, string> = {
      admin: '/',
      executive: '/',
      production_manager: '/production',
      storekeeper: '/warehouse',
      sales: '/sales',
      finance: '/finance',
    }
    return <Navigate to={roleRedirects[userRole] || '/login'} replace />
  }

  console.log('✅ Access granted')
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<DashboardLayout />}>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['admin', 'executive']}>
                <DashboardPage />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/warehouse" element={
              <ProtectedRoute allowedRoles={['storekeeper', 'admin']}>
                <WarehousePage />
              </ProtectedRoute>
            } />
            
            <Route path="/production" element={
              <ProtectedRoute allowedRoles={['production_manager', 'admin']}>
                <ProductionPage />
              </ProtectedRoute>
            } />
            
            <Route path="/finance" element={
              <ProtectedRoute allowedRoles={['finance', 'admin', 'executive']}>
                <FinancePage />
              </ProtectedRoute>
            } />
            
            <Route path="/sales" element={
              <ProtectedRoute allowedRoles={['sales', 'admin']}>
                <SalesPage />
              </ProtectedRoute>
            } />
            
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App