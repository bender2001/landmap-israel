import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { login as apiLogin, logout as apiLogout, getSession } from '../api/auth'

type AuthUser = Record<string, unknown>
type AuthSession = { user?: AuthUser | null } & Record<string, unknown>
type LoginResponse = { session: AuthSession | null } & Record<string, unknown>

type AuthContextValue = {
  session: AuthSession | null
  user: AuthUser | null | undefined
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    getSession()
      .then((s) => {
        setSession(s as AuthSession | null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    const data = (await apiLogin(email, password)) as LoginResponse
    setSession(data.session)
    return data
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await apiLogout()
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
