import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  LayoutDashboard, Shield, Users, Package, 
  Factory, DollarSign, FileText, LogOut 
} from 'lucide-react'

interface SidebarProps {
  userRole: string | null
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Define menu items based on roles
  const getMenuItems = () => {
    const allItems = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'production_manager'] },
      { name: 'Admin', icon: Shield, path: '/admin', roles: ['admin'] },
      { name: 'Production', icon: Factory, path: '/production', roles: ['production_manager', 'admin'] },
      { name: 'Warehouse', icon: Package, path: '/warehouse', roles: ['storekeeper', 'admin'] },
      { name: 'Sales', icon: Users, path: '/sales', roles: ['sales', 'admin'] },
      { name: 'Finance', icon: DollarSign, path: '/finance', roles: ['finance', 'admin', 'executive'] },
      { name: 'Reports', icon: FileText, path: '/reports', roles: ['executive', 'admin'] },
    ]

    // Filter items based on the user's role
    return allItems.filter(item => item.roles.includes(userRole || ''))
  }

  const menuItems = getMenuItems()

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200 fixed left-0 top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900 leading-tight">YIZUTA Food Complex</h1>
        <p className="text-xs text-gray-500 mt-1">Management System</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          // Simple active state check (you can enhance this later with useLocation)
          const isActive = window.location.pathname === item.path
          
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          )
        })}
      </nav>

      {/* User Profile & Sign Out */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm mr-3">
            YF
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Admin User</p>
            <p className="text-xs text-gray-500">admin@yizuta.com</p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default Sidebar