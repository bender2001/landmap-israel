import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { login as apiLogin, logout as apiLogout, getSession } from '../api/auth.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    setSession(data.session)
    return data
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
