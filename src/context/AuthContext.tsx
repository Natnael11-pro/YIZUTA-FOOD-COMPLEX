/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { type User, type Session, type AuthError } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  userRole: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Define fetchUserRole BEFORE useEffect
  const fetchUserRole = async (userId: string) => {
    console.log('🔍 Fetching role for user:', userId)
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
      })

      const fetchPromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('❌ Error fetching role:', error.message)
        setUserRole(null)
      } else {
        console.log('✅ Role found:', data?.role)
        setUserRole(data?.role || null)
      }
    } catch (err) {
      console.error('❌ Exception fetching role:', err)
      setUserRole(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('📥 Initial session loaded:', session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false) // ← Set loading to false IMMEDIATELY
      
      // Fetch role in background (don't block the UI)
      if (session?.user) {
        fetchUserRole(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('🔄 Auth state changed:', session?.user?.email || 'Signed out')
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false) // ← Set loading to false IMMEDIATELY
        
        if (session?.user) {
          fetchUserRole(session.user.id)
        } else {
          setUserRole(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in:', email)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('❌ Sign in error:', error.message)
    }
    return { error }
  }

  const signOut = async () => {
    console.log('👋 Signing out')
    await supabase.auth.signOut()
    setUserRole(null)
  }

  const value = { user, session, userRole, loading, signIn, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider')
  return context
}