import { useQuery, useMutation, useQueryClient, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react'
import type { Plot, Filters, Lead } from './types'
import { plots as mockPlots } from './data'
import { normalizePlot } from './utils'
import * as api from './api'

// ── Plot Hooks ──
type PlotList = Plot[] & { _source?: 'api' | 'mock' }

async function fetchPlots(filters: Record<string, string | number | undefined>): Promise<PlotList> {
  try {
    const data = await api.getPlots(filters) as PlotList
    if (data?.length) { data._source = 'api'; return data }
  } catch { /* fallback */ }
  let result = mockPlots.map(normalizePlot) as PlotList
  if (filters.city && filters.city !== 'all') result = result.filter(p => p.city === filters.city) as PlotList
  result._source = 'mock'
  return result
}

async function fetchPlot(id: string): Promise<Plot | null> {
  try { const d = await api.getPlot(id) as Plot; if (d) return d } catch { /* fallback */ }
  const found = mockPlots.find(p => p.id === id)
  return found ? normalizePlot(found) : null
}

export function useAllPlots(filters: Record<string, string | number | undefined>) {
  const q = useQuery<PlotList, Error>({
    queryKey: ['plots', filters],
    queryFn: () => fetchPlots(filters),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 2,
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  })
  return { ...q, isMock: q.data?._source === 'mock' }
}

export function usePlot(id: string | null | undefined) {
  return useQuery<Plot | null, Error>({
    queryKey: ['plot', id],
    queryFn: () => fetchPlot(String(id)),
    enabled: !!id,
    retry: 1,
  })
}

export function useSimilarPlots(id: string | null | undefined) {
  return useQuery<Plot[], Error>({
    queryKey: ['similar', id],
    queryFn: () => api.getSimilarPlots(String(id)) as Promise<Plot[]>,
    enabled: !!id,
    staleTime: 120_000,
    retry: 1,
    placeholderData: [],
  })
}

export function usePlotsBatch(ids: string[]) {
  const sorted = ids.length ? [...ids].sort() : []
  return useQuery<Plot[], Error>({
    queryKey: ['batch', sorted],
    queryFn: async () => {
      try { const d = await api.getPlotsBatch(sorted) as Plot[]; if (d?.length) return d } catch { /* fallback */ }
      return (await Promise.all(sorted.map(fetchPlot))).filter(Boolean) as Plot[]
    },
    enabled: sorted.length > 0,
    staleTime: 60_000,
  })
}

export function usePrefetchPlot() {
  const qc = useQueryClient()
  return useCallback((id: string) => {
    if (id) qc.prefetchQuery({ queryKey: ['plot', id], queryFn: () => fetchPlot(id), staleTime: 60_000 })
  }, [qc])
}

// ── Lead Hooks ──
export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { plot_id: string; name: string; phone: string; email?: string }) =>
      api.createLead(data) as Promise<Lead>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useLeads(filters?: Record<string, string>) {
  return useQuery<Lead[], Error>({
    queryKey: ['leads', filters],
    queryFn: () => api.getLeads(filters) as Promise<Lead[]>,
    staleTime: 30_000,
  })
}

// ── Favorites (localStorage) ──
export function useFavorites() {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] }
  })
  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }, [])
  const isFav = useCallback((id: string) => ids.includes(id), [ids])
  return { ids, toggle, isFav }
}

// ── Compare ──
export function useCompare() {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('compare') || '[]') } catch { return [] }
  })
  const toggle = useCallback((id: string) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
      localStorage.setItem('compare', JSON.stringify(next))
      return next
    })
  }, [])
  const clear = useCallback(() => { setIds([]); localStorage.removeItem('compare') }, [])
  return { ids, toggle, clear, has: (id: string) => ids.includes(id) }
}

// ── Auth ──
interface AuthCtx { user: unknown; token: string | null; login: (e: string, p: string) => Promise<void>; logout: () => void; isLoading: boolean }
const AuthContext = createContext<AuthCtx>({ user: null, token: null, login: async () => {}, logout: () => {}, isLoading: true })
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<unknown>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) { setIsLoading(false); return }
    api.getMe().then(setUser).catch(() => { localStorage.removeItem('auth_token'); setToken(null) }).finally(() => setIsLoading(false))
  }, [token])

  const doLogin = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password) as { token: string; user: unknown }
    localStorage.setItem('auth_token', res.token)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, token, login: doLogin, logout, isLoading }}>{children}</AuthContext.Provider>
}

// ── Debounce ──
export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t) }, [value, ms])
  return debounced
}

// ── Market ──
export function useMarketOverview() {
  return useQuery({ queryKey: ['market'], queryFn: () => api.getMarketOverview(), staleTime: 5 * 60_000, retry: 1 })
}
