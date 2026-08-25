import { useState } from 'react'
import { supabase } from '../config/supabase'
import { X } from 'lucide-react'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserAdded: () => void
}

const AddUserModal = ({ isOpen, onClose, onUserAdded }: AddUserModalProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'sales',
    department: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔵 Starting user creation for:', formData.email)

      // Step 1: Create in Auth ONLY
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role,
            department: formData.department
          }
        }
      })

      if (authError) {
        console.error('❌ Auth error details:', authError)
        throw new Error(authError.message || 'Authentication failed')
      }

      if (!authData.user) {
        throw new Error('No user created')
      }

      console.log('✅ Auth user created:', authData.user.id)

      // Step 2: Wait and verify profile was created by trigger
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Check if profile exists
      const { data: profile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileCheckError || !profile) {
        console.warn('⚠️ Profile not found, creating manually...')
        
        // Manual creation as fallback
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            role: formData.role,
            department: formData.department,
            status: 'Active'
          })

        if (insertError) {
          console.error(' Manual insert failed:', insertError)
          throw new Error('Profile creation failed: ' + insertError.message)
        }
      }

      alert('User created successfully!')
      onUserAdded()
      onClose()
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        role: 'sales',
        department: ''
      })
      
    } catch (err) {
      console.error('❌ Full error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block mb-1.5 text-sm font-medium">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block mb-1.5 text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1.5 text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="role" className="block mb-1.5 text-sm font-medium">Role</label>
            <select
              id="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="admin">Admin</option>
              <option value="production_manager">Production Manager</option>
              <option value="storekeeper">Storekeeper</option>
              <option value="sales">Sales Personnel</option>
              <option value="finance">Finance Officer</option>
              <option value="executive">Executive Manager</option>
            </select>
          </div>

          <div>
            <label htmlFor="department" className="block mb-1.5 text-sm font-medium">Department</label>
            <input
              id="department"
              type="text"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddUserModal