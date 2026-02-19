import { createClient, SupabaseClient, Session, AuthResponse } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || ''

export const supabase: SupabaseClient | null = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function login(email: string, password: string): Promise<AuthResponse['data']> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.session?.access_token) {
    localStorage.setItem('auth_token', data.session.access_token)
  }
  return data
}

export async function logout(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
  localStorage.removeItem('auth_token')
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    localStorage.setItem('auth_token', session.access_token)
  }
  return session
}
