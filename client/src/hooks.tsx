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
        // Track data freshness
        try { sessionStorage.setItem('data_last_fetched', String(Date.now())); sessionStorage.setItem('data_source', 'api') } catch {}
        return data.map(normalizePlot)
      } catch {
        try { sessionStorage.setItem('data_last_fetched', String(Date.now())); sessionStorage.setItem('data_source', 'demo') } catch {}
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

// ── Saved Searches (localStorage, max 8) ──

export interface SavedSearch {
  id: string
  name: string
  filters: Record<string, string>
  createdAt: number
}

const MAX_SAVED = 8

export function useSavedSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>(() => {
    try { return JSON.parse(localStorage.getItem('saved_searches') || '[]') } catch { return [] }
  })

  const save = useCallback((name: string, filters: Record<string, string>) => {
    setSearches(prev => {
      const next = [
        { id: Date.now().toString(), name, filters, createdAt: Date.now() },
        ...prev,
      ].slice(0, MAX_SAVED)
      localStorage.setItem('saved_searches', JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setSearches(prev => {
      const next = prev.filter(s => s.id !== id)
      localStorage.setItem('saved_searches', JSON.stringify(next))
      return next
    })
  }, [])

  return { searches, save, remove }
}

// ── Data Freshness Tracker ──

export function useDataFreshness() {
  const [lastFetched, setLastFetched] = useState<number | null>(() => {
    try { return Number(sessionStorage.getItem('data_last_fetched')) || null } catch { return null }
  })

  const markFetched = useCallback(() => {
    const now = Date.now()
    setLastFetched(now)
    try { sessionStorage.setItem('data_last_fetched', String(now)) } catch {}
  }, [])

  const relativeTime = lastFetched ? (() => {
    const secs = Math.floor((Date.now() - lastFetched) / 1000)
    if (secs < 60) return 'עכשיו'
    if (secs < 3600) return `לפני ${Math.floor(secs / 60)} דק׳`
    if (secs < 86400) return `לפני ${Math.floor(secs / 3600)} שע׳`
    return `לפני ${Math.floor(secs / 86400)} ימים`
  })() : null

  return { lastFetched, markFetched, relativeTime }
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

// ── User Geolocation ──

export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const cached = sessionStorage.getItem('user_location')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setError('הדפדפן לא תומך בשירותי מיקום')
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc)
        setLoading(false)
        try { sessionStorage.setItem('user_location', JSON.stringify(loc)) } catch {}
      },
      (err) => {
        setError(err.code === 1 ? 'גישה למיקום נדחתה' : 'לא ניתן לקבל מיקום')
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  return { location, error, loading, request }
}

// ── Debounce ──

export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// ── Online/Offline Status ──

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      // Show "reconnected" briefly
      if (!navigator.onLine) return
      setWasOffline(true)
      setTimeout(() => setWasOffline(false), 3000)
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return { online, wasOffline }
}

// ── Focus Trap (for modals) ──

export function useFocusTrap(active: boolean) {
  const ref = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const el = ref.current
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Focus first focusable element
    const focusables = el.querySelectorAll<HTMLElement>(focusableSelector)
    if (focusables.length) {
      requestAnimationFrame(() => focusables[0].focus())
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = el.querySelectorAll<HTMLElement>(focusableSelector)
      if (!nodes.length) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handler)
    return () => {
      el.removeEventListener('keydown', handler)
      // Restore focus when trap is deactivated
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}

// ── Market Overview ──

export function useMarketOverview() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['market-overview'],
    queryFn: () => api.getMarketOverview() as Promise<Record<string, unknown>>,
    staleTime: 300_000,
  })
}
