import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Plot, Lead, Role, User, Filters } from './types'
import { plots as mockPlots } from './data'
import { normalizePlot } from './utils'
import * as api from './api'

// ── Plot Queries ──

export function useAllPlots(filters: Partial<Filters> = {}) {
  return useQuery<Plot[]>({
    queryKey: ['plots', filters],
    queryFn: async () => {
      try {
        const data = await api.getPlots(filters as Record<string, string>) as Plot[]
        return data.map(normalizePlot)
      } catch {
        return mockPlots.map(normalizePlot)
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function usePlot(id: string | undefined) {
  return useQuery<Plot>({
    queryKey: ['plot', id],
    queryFn: async () => {
      try {
        const data = await api.getPlot(id!) as Plot
        return normalizePlot(data)
      } catch {
        const found = mockPlots.find(p => p.id === id)
        if (found) return normalizePlot(found)
        throw new Error('Plot not found')
      }
    },
    enabled: !!id,
    staleTime: 120_000,
  })
}

export function useSimilarPlots(id: string | undefined) {
  return useQuery<Plot[]>({
    queryKey: ['similar-plots', id],
    queryFn: async () => {
      try {
        const data = await api.getSimilarPlots(id!) as Plot[]
        return data.map(normalizePlot)
      } catch {
        return mockPlots.filter(p => p.id !== id).map(normalizePlot)
      }
    },
    enabled: !!id,
    staleTime: 120_000,
  })
}

export function usePlotsBatch(ids: string[]) {
  return useQuery<Plot[]>({
    queryKey: ['plots-batch', ids],
    queryFn: async () => {
      try {
        const data = await api.getPlotsBatch(ids) as Plot[]
        return data.map(normalizePlot)
      } catch {
        return mockPlots.filter(p => ids.includes(p.id)).map(normalizePlot)
      }
    },
    enabled: ids.length > 0,
  })
}

export function usePrefetchPlot() {
  const qc = useQueryClient()
  return useCallback((id: string) => {
    qc.prefetchQuery({
      queryKey: ['plot', id],
      queryFn: async () => {
        try {
          const data = await api.getPlot(id) as Plot
          return normalizePlot(data)
        } catch {
          const found = mockPlots.find(p => p.id === id)
          if (found) return normalizePlot(found)
          throw new Error('Plot not found')
        }
      },
      staleTime: 120_000,
    })
  }, [qc])
}

// ── Leads ──

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { plot_id: string; name: string; phone: string; email?: string }) =>
      api.createLead(data) as Promise<Lead>,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }) },
  })
}

export function useLeads(filters?: Record<string, string>) {
  return useQuery<Lead[]>({
    queryKey: ['leads', filters],
    queryFn: () => api.getLeads(filters) as Promise<Lead[]>,
    staleTime: 30_000,
  })
}

// ── Favorites (localStorage) ──

function readSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
function writeSet(key: string, s: Set<string>) { localStorage.setItem(key, JSON.stringify([...s])) }

export function useFavorites() {
  const [ids, setIds] = useState<Set<string>>(() => readSet('favorites'))
  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      writeSet('favorites', next)
      return next
    })
  }, [])
  const isFav = useCallback((id: string) => ids.has(id), [ids])
  return { ids: [...ids], toggle, isFav }
}

// ── Compare (localStorage) ──

export function useCompare() {
  const [ids, setIds] = useState<Set<string>>(() => readSet('compare'))
  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      writeSet('compare', next)
      return next
    })
  }, [])
  const clear = useCallback(() => { setIds(new Set()); localStorage.removeItem('compare') }, [])
  const has = useCallback((id: string) => ids.has(id), [ids])
  return { ids: [...ids], toggle, clear, has }
}

// ── Recently Viewed (localStorage, max 10) ──

const MAX_RECENT = 10

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recently_viewed') || '[]') } catch { return [] }
  })

  const add = useCallback((id: string) => {
    setIds(prev => {
      const next = [id, ...prev.filter(i => i !== id)].slice(0, MAX_RECENT)
      localStorage.setItem('recently_viewed', JSON.stringify(next))
      return next
    })
  }, [])

  return { ids, add, count: ids.length }
}

// ── Auth ──

interface AuthCtx {
  user: User | null
  role: Role
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, role: Role) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthCtx>({
  user: null, role: 'public', login: async () => {}, register: async () => {}, logout: () => {}, isLoading: true,
})

function mockRole(email: string): Role {
  if (email.startsWith('admin@')) return 'admin'
  if (email.startsWith('biz@')) return 'business'
  return 'user'
}

function mockUser(email: string): User {
  return { id: 'mock-' + Date.now(), email, name: email.split('@')[0], role: mockRole(email) }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { setIsLoading(false); return }
    api.getMe()
      .then(u => setUser(u as User))
      .catch(() => { localStorage.removeItem('auth_token') })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.login(email, password) as { token: string; user: User }
      localStorage.setItem('auth_token', res.token)
      setUser(res.user)
    } catch {
      const u = mockUser(email)
      localStorage.setItem('auth_token', 'mock-token')
      setUser(u)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, role: Role) => {
    try {
      const res = await api.register(email, password, name, role) as { token: string; user: User }
      localStorage.setItem('auth_token', res.token)
      setUser(res.user)
    } catch {
      const u = { ...mockUser(email), name, role }
      localStorage.setItem('auth_token', 'mock-token')
      setUser(u)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }, [])

  const role: Role = user?.role ?? 'public'

  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }

// ── Debounce ──

export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// ── Market Overview ──

export function useMarketOverview() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['market-overview'],
    queryFn: () => api.getMarketOverview() as Promise<Record<string, unknown>>,
    staleTime: 300_000,
  })
}
