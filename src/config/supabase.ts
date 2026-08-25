import { createClient } from '@supabase/supabase-js'

// We use dummy keys here just to prevent the app from crashing.
// We will replace these with your REAL Supabase keys later!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)