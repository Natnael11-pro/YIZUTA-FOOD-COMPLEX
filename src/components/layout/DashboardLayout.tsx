import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'

const DashboardLayout = () => {
  const { userRole } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar is fixed on the left */}
      <Sidebar userRole={userRole} />
      
      {/* ✅ ACCESSIBILITY FIX: Added id, role, and aria-label for screen readers */}
      <main 
        id="main-content" 
        role="main" 
        aria-label="Main application content"
        className="ml-64 p-8"
      >
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout