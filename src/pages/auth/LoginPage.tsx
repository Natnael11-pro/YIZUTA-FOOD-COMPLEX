import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user, userRole } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      console.log('✅ User logged in with role:', userRole)
      const routes: Record<string, string> = {
        admin: '/',
        executive: '/',
        production_manager: '/production',
        storekeeper: '/warehouse',
        sales: '/sales',
        finance: '/finance',
      }
      navigate(routes[userRole] || '/')
    }
  }, [user, userRole, navigate])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('🔑 Attempting sign in for:', email)
      const { error } = await signIn(email, password)
      
      if (error) {
        console.error('❌ Sign in error:', error.message)
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      console.log('✅ Sign in successful! Waiting for role...')
      // The useEffect will handle redirect when userRole loads
      
    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 text-xl font-bold text-white bg-blue-600 rounded-xl">
            YF
          </div>
          <h1 className="text-2xl font-bold text-gray-900">YIZUTA Food Complex</h1>
          <p className="text-sm text-gray-500">Management System</p>
        </div>

        <div className="p-8 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Sign in to your account</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yizuta.com" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" 
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 mt-2 text-white font-medium bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-center text-gray-400">
            Demo credentials: admin@yizuta.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage