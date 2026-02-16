import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function login(email, password) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.session?.access_token) {
    localStorage.setItem('auth_token', data.session.access_token)
  }
  return data
}

export async function logout() {
  if (!supabase) return
  await supabase.auth.signOut()
  localStorage.removeItem('auth_token')
}

export async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    localStorage.setItem('auth_token', session.access_token)
  }
  return session
}
