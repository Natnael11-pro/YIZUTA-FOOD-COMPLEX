import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  LayoutDashboard, 
  Shield, 
  Package, 
  Factory, 
  ShoppingCart, 
  DollarSign, 
  LogOut,
  FileText
} from 'lucide-react'

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, user, userRole } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getMenuItems = () => {
    const allItems = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'executive_manager', 'executive'] },
      { name: 'Admin', icon: Shield, path: '/admin', roles: ['admin'] },
      { name: 'Production', icon: Factory, path: '/production', roles: ['production_manager', 'admin', 'executive_manager', 'executive'] },
      { name: 'Warehouse', icon: Package, path: '/warehouse', roles: ['storekeeper', 'admin', 'executive_manager', 'executive'] },
      { name: 'Sales', icon: ShoppingCart, path: '/sales', roles: ['sales_personnel', 'sales', 'admin', 'executive_manager', 'executive'] },
      { name: 'Finance', icon: DollarSign, path: '/finance', roles: ['finance_officer', 'finance', 'admin', 'executive_manager', 'executive'] },
      // ✅ FIXED: Paths now match App.tsx exactly
      { name: 'Invoices', icon: FileText, path: '/finance/invoices', roles: ['finance_officer', 'finance', 'admin', 'executive_manager', 'executive'] },
      { name: 'Reports', icon: FileText, path: '/finance/reports', roles: ['finance_officer', 'finance', 'admin', 'executive_manager', 'executive'] },
    ]

    // Filter items based on userRole
    const filteredItems = allItems.filter(item => {
      const hasAccess = userRole && item.roles.includes(userRole)
      return hasAccess
    })

    return filteredItems
  }

  const menuItems = getMenuItems()

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">YIZUTA Food Complex</h1>
        <p className="text-xs text-gray-500 mt-1">Management System</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No menu items<br/>
            <span className="text-xs">Role: {userRole || 'null'}</span>
          </div>
        ) : (
          menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            )
          })
        )}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userRole || 'Loading...'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default Sidebar
