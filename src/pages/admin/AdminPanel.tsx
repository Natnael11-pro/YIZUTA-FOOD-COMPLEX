/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Shield, Settings, UserPlus, Search, Edit, Trash2 } from 'lucide-react'
import AddUserModal from '../../components/AddUserModal'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  department: string | null
  created_at: string
}

const AdminPanel = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      setUsers(users.filter(u => u.id !== userId))
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700',
      production_manager: 'bg-blue-100 text-blue-700',
      storekeeper: 'bg-green-100 text-green-700',
      sales: 'bg-orange-100 text-orange-700',
      finance: 'bg-cyan-100 text-cyan-700',
      executive: 'bg-indigo-100 text-indigo-700',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  const getRoleDisplayName = (role: string) => {
    const names: Record<string, string> = {
      admin: 'Admin',
      production_manager: 'Production Manager',
      storekeeper: 'Storekeeper',
      sales: 'Sales Personnel',
      finance: 'Finance Officer',
      executive: 'Executive Manager',
    }
    return names[role] || role
  }

  return (
    <div className="space-y-6">
      {/* Header with Add User Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-500">User management and system configuration</p>
        </div>
        <button 
          type="button"
          onClick={() => {
            console.log('Add User button clicked!')
            setIsModalOpen(true)
          }}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-10 h-10 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">6</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Role Management</h3>
          <p className="mt-1 text-xs text-gray-500">Manage user roles and permissions</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <Settings className="w-10 h-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">12</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">System Settings</h3>
          <p className="mt-1 text-xs text-gray-500">Configure system preferences</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <UserPlus className="w-10 h-10 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{users.length}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">User Registration</h3>
          <p className="mt-1 text-xs text-gray-500">Register new users</p>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm mr-3 flex-shrink-0">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || 'Unnamed User'}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button className="text-sm text-blue-600 hover:text-blue-800 transition flex items-center">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-sm text-red-600 hover:text-red-800 transition flex items-center"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal - MUST BE OUTSIDE THE TABLE */}
      {isModalOpen && (
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUserAdded={fetchUsers}
        />
      )}
    </div>
  )
}

export default AdminPanel