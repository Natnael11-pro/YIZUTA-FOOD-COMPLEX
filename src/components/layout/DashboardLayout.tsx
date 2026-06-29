import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'

const DashboardLayout = () => {
  const { userRole } = useAuth() // Now using cached role directly

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar is fixed on the left */}
      <Sidebar userRole={userRole} />
      
      {/* Main content area is pushed to the right */}
      <div className="ml-64 p-8">
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout