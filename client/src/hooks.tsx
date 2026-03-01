import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Plot, Lead, Role, User, Filters } from './types'
import { plots as mockPlots } from './data'
import { normalizePlot } from './utils'
import * as api from './api'

// ── Helpers ──
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(id: string | undefined): boolean { return !!id && UUID_RE.test(id) }

// ── Plot Queries ──

export function useAllPlots(filters: Partial<Filters> = {}) {
  return useQuery<Plot[]>({
    queryKey: ['plots', filters],
    queryFn: async () => {
      const t0 = performance.now()
      try {
        const data = await api.getPlots(filters as Record<string, string>) as Plot[]
        // Track data freshness + latency
        const latencyMs = Math.round(performance.now() - t0)
        try {
          sessionStorage.setItem('data_last_fetched', String(Date.now()))
          sessionStorage.setItem('data_source', 'api')
          sessionStorage.setItem('api_latency_ms', String(latencyMs))
        } catch {}
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

/** Track API response latency for UX confidence indicators */
export function useApiLatency() {
  const [latencyMs, setLatencyMs] = useState<number | null>(() => {
    try { const v = sessionStorage.getItem('api_latency_ms'); return v ? Number(v) : null } catch { return null }
  })
  // Re-read on tab focus (fresh fetch might have updated it)
  useEffect(() => {
    const handler = () => {
      try { const v = sessionStorage.getItem('api_latency_ms'); if (v) setLatencyMs(Number(v)) } catch {}
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [])
  // Also re-read after each query invalidation (new data fetch)
  useEffect(() => {
    const interval = setInterval(() => {
      try { const v = sessionStorage.getItem('api_latency_ms'); if (v) setLatencyMs(Number(v)) } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [])
  const label = latencyMs == null ? null :
    latencyMs < 200 ? '⚡ מהיר' :
    latencyMs < 800 ? '✓ תקין' :
    latencyMs < 2000 ? '⏳ איטי' : '🐌 איטי מאוד'
  const color = latencyMs == null ? null :
    latencyMs < 200 ? '#10B981' :
    latencyMs < 800 ? '#10B981' :
    latencyMs < 2000 ? '#F59E0B' : '#EF4444'
  return { latencyMs, label, color }
}

export function usePlot(id: string | undefined) {
  return useQuery<Plot>({
    queryKey: ['plot', id],
    queryFn: async () => {
      // Only call API for valid UUIDs — skip numeric/garbage IDs
      if (isValidUUID(id)) {
        try {
          const data = await api.getPlot(id!) as Plot
          return normalizePlot(data)
        } catch { /* fall through to mock lookup */ }
      }
      const found = mockPlots.find(p => p.id === id)
      if (found) return normalizePlot(found)
      throw new Error('Plot not found')
    },
    enabled: !!id,
    staleTime: 120_000,
    retry: isValidUUID(id) ? 2 : 0,
  })
}

export function useSimilarPlots(id: string | undefined) {
  return useQuery<Plot[]>({
    queryKey: ['similar-plots', id],
    queryFn: async () => {
      if (isValidUUID(id)) {
        try {
          const data = await api.getSimilarPlots(id!) as Plot[]
          return data.map(normalizePlot)
        } catch { /* fall through to mock */ }
      }
      return mockPlots.filter(p => p.id !== id).map(normalizePlot)
    },
    enabled: !!id,
    staleTime: 120_000,
  })
}

export function usePlotsBatch(ids: string[]) {
  // Only send valid UUIDs to API; resolve non-UUID IDs from mock data locally
  const validUUIDs = useMemo(() => ids.filter(isValidUUID), [ids])
  const nonUUIDs = useMemo(() => ids.filter(id => !isValidUUID(id)), [ids])

  return useQuery<Plot[]>({
    queryKey: ['plots-batch', ids],
    queryFn: async () => {
      const results: Plot[] = []
      // Resolve valid UUIDs via API
      if (validUUIDs.length > 0) {
        try {
          const data = await api.getPlotsBatch(validUUIDs) as Plot[]
          results.push(...data.map(normalizePlot))
        } catch {
          results.push(...mockPlots.filter(p => validUUIDs.includes(p.id)).map(normalizePlot))
        }
      }
      // Resolve non-UUID IDs from mock data
      if (nonUUIDs.length > 0) {
        results.push(...mockPlots.filter(p => nonUUIDs.includes(p.id)).map(normalizePlot))
      }
      return results
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

/** Prefetch plots for a city — use on hover for instant navigation */
export function usePrefetchPlotsByCity() {
  const qc = useQueryClient()
  return useCallback((city: string) => {
    qc.prefetchQuery({
      queryKey: ['plots', { city }],
      queryFn: async () => {
        try {
          const data = await api.getPlots({ city }) as Plot[]
          try { sessionStorage.setItem('data_last_fetched', String(Date.now())); sessionStorage.setItem('data_source', 'api') } catch {}
          return data.map(normalizePlot)
        } catch {
          return mockPlots.filter(p => p.city === city).map(normalizePlot)
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

// ── Data Freshness Tracker (auto-updating relative time) ──

function computeRelativeTime(ts: number | null): string | null {
  if (!ts) return null
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return 'עכשיו'
  if (secs < 3600) return `לפני ${Math.floor(secs / 60)} דק׳`
  if (secs < 86400) return `לפני ${Math.floor(secs / 3600)} שע׳`
  return `לפני ${Math.floor(secs / 86400)} ימים`
}

export function useDataFreshness() {
  const [lastFetched, setLastFetched] = useState<number | null>(() => {
    try { return Number(sessionStorage.getItem('data_last_fetched')) || null } catch { return null }
  })
  const [relativeTime, setRelativeTime] = useState<string | null>(() => computeRelativeTime(
    (() => { try { return Number(sessionStorage.getItem('data_last_fetched')) || null } catch { return null } })()
  ))

  const markFetched = useCallback(() => {
    const now = Date.now()
    setLastFetched(now)
    setRelativeTime('עכשיו')
    try { sessionStorage.setItem('data_last_fetched', String(now)) } catch {}
  }, [])

  // Auto-update relative time every 30s so "עכשיו" → "לפני 1 דק׳" etc.
  useEffect(() => {
    if (!lastFetched) return
    const update = () => setRelativeTime(computeRelativeTime(lastFetched))
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [lastFetched])

  // Also sync from sessionStorage on tab focus (e.g. SSE updated in another tab)
  useEffect(() => {
    const handler = () => {
      try {
        const ts = Number(sessionStorage.getItem('data_last_fetched')) || null
        if (ts && ts !== lastFetched) {
          setLastFetched(ts)
          setRelativeTime(computeRelativeTime(ts))
        }
      } catch {}
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [lastFetched])

  return { lastFetched, markFetched, relativeTime }
}

/** Smart data refresh via React Query cache invalidation — avoids full page reload */
export function useRefreshData() {
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Invalidate all plot-related queries — triggers background refetch
      await qc.invalidateQueries({ queryKey: ['plots'] })
      // Also invalidate individual plot pages and similar plots
      await qc.invalidateQueries({ queryKey: ['plot'] })
      await qc.invalidateQueries({ queryKey: ['similar-plots'] })
      // Update freshness timestamp
      try { sessionStorage.setItem('data_last_fetched', String(Date.now())) } catch {}
    } finally {
      setRefreshing(false)
    }
  }, [qc])

  return { refresh, refreshing }
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

// ── Media Query (JS-level responsive) ──

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 639px)')
}

// ── Market Overview ──

export function useMarketOverview() {
  return useQuery<Record<string, unknown>>({
    queryKey: ['market-overview'],
    queryFn: () => api.getMarketOverview() as Promise<Record<string, unknown>>,
    staleTime: 300_000,
  })
}

// ── Price Alerts (localStorage) ──

export interface PriceAlert {
  id: string
  plotId: string
  plotLabel: string     // "גוש 1234 חלקה 56 — חדרה"
  targetPrice: number   // alert when price ≤ this
  currentPrice: number  // price at time of creation
  createdAt: number
  triggered: boolean
}

const MAX_ALERTS = 20

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try { return JSON.parse(localStorage.getItem('price_alerts') || '[]') } catch { return [] }
  })

  const persist = useCallback((next: PriceAlert[]) => {
    localStorage.setItem('price_alerts', JSON.stringify(next))
    setAlerts(next)
  }, [])

  const add = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
    setAlerts(prev => {
      // Don't duplicate for same plot
      if (prev.some(a => a.plotId === alert.plotId && !a.triggered)) return prev
      const next = [
        { ...alert, id: Date.now().toString(), createdAt: Date.now(), triggered: false },
        ...prev,
      ].slice(0, MAX_ALERTS)
      localStorage.setItem('price_alerts', JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.id !== id)
      localStorage.setItem('price_alerts', JSON.stringify(next))
      return next
    })
  }, [])

  const check = useCallback((plotId: string, currentPrice: number): PriceAlert | null => {
    const alert = alerts.find(a => a.plotId === plotId && !a.triggered && currentPrice <= a.targetPrice)
    if (alert) {
      const next = alerts.map(a => a.id === alert.id ? { ...a, triggered: true } : a)
      localStorage.setItem('price_alerts', JSON.stringify(next))
      setAlerts(next)
      return alert
    }
    return null
  }, [alerts])

  const hasAlert = useCallback((plotId: string) => alerts.some(a => a.plotId === plotId && !a.triggered), [alerts])

  const clearAll = useCallback(() => persist([]), [persist])

  return { alerts, add, remove, check, hasAlert, clearAll, activeCount: alerts.filter(a => !a.triggered).length }
}

// ── PWA Install Prompt ──

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa_install_dismissed') === 'true' } catch { return false }
  })

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
      return true
    }
    return false
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try { localStorage.setItem('pwa_install_dismissed', 'true') } catch {}
  }, [])

  return {
    canInstall: !!deferredPrompt && !isInstalled && !dismissed,
    isInstalled,
    install,
    dismiss,
  }
}

// ── Scroll-triggered InView Hook ──

export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // If element is already above or inside the viewport (e.g. user jumped/scrolled past),
    // make it visible immediately — don't leave invisible sections on the page
    const rect = el.getBoundingClientRect()
    if (rect.bottom < window.innerHeight * 1.1 || rect.top < window.innerHeight) {
      setInView(true)
      return
    }
    // Fallback: ensure visibility within 2.5s even if observer fails
    // (content-visibility: auto or reduced-motion can prevent observer from firing)
    const fallbackTimer = setTimeout(() => setInView(true), 2500)
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); clearTimeout(fallbackTimer) } },
      { threshold: 0.01, rootMargin: '0px 0px 80px 0px', ...options }
    )
    observer.observe(el)
    return () => { observer.disconnect(); clearTimeout(fallbackTimer) }
  }, [])
  return { ref, inView }
}

// ── Map Viewport Visible Plots ──

export function useViewportPlots(plots: { id: string; coordinates?: [number, number][] }[], mapBounds: { north: number; south: number; east: number; west: number } | null) {
  return useMemo(() => {
    if (!mapBounds || !plots.length) return { visible: plots.length, total: plots.length }
    let visible = 0
    for (const pl of plots) {
      if (!pl.coordinates?.length) continue
      // Check if any coordinate of the plot is within the viewport
      const inView = pl.coordinates.some(c =>
        c.length >= 2 &&
        c[0] >= mapBounds.south && c[0] <= mapBounds.north &&
        c[1] >= mapBounds.west && c[1] <= mapBounds.east
      )
      if (inView) visible++
    }
    return { visible, total: plots.length }
  }, [plots, mapBounds])
}

// ── Server-Sent Events (real-time updates) ──

export type SSEStatus = 'connecting' | 'connected' | 'disconnected'

export interface SSEEvent {
  type: string
  data: Record<string, unknown>
  id?: string
}

/**
 * Connect to the server's SSE endpoint for real-time plot updates.
 * Automatically reconnects on disconnect and invalidates React Query cache
 * when relevant events arrive (plot updates, new listings, price changes).
 */
export function useSSE() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<SSEStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 8

  useEffect(() => {
    let mounted = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (!mounted) return

      try {
        const es = new EventSource('/api/events')
        esRef.current = es
        // Only log connecting on first attempt to avoid console noise
        if (retryCount.current === 0) setStatus('connecting')

        es.onopen = () => {
          if (!mounted) return
          setStatus('connected')
          retryCount.current = 0
        }

        es.onmessage = (e) => {
          if (!mounted) return
          try {
            const parsed = JSON.parse(e.data) as Record<string, unknown>
            const evt: SSEEvent = {
              type: (parsed.type as string) || 'update',
              data: parsed,
              id: e.lastEventId || undefined,
            }
            setLastEvent(evt)
            setUpdateCount(c => c + 1)

            // Auto-invalidate React Query cache based on event type
            const eventType = evt.type
            if (eventType === 'plot_updated' || eventType === 'plot_created' || eventType === 'plot_deleted') {
              qc.invalidateQueries({ queryKey: ['plots'] })
              const plotId = parsed.plotId as string | undefined
              if (plotId) {
                qc.invalidateQueries({ queryKey: ['plot', plotId] })
                qc.invalidateQueries({ queryKey: ['similar-plots', plotId] })
              }
            } else if (eventType === 'market_update') {
              qc.invalidateQueries({ queryKey: ['market-overview'] })
            } else if (eventType === 'price_change') {
              qc.invalidateQueries({ queryKey: ['plots'] })
            }
          } catch {
            // Ignore non-JSON messages (like keep-alive pings)
          }
        }

        es.onerror = () => {
          if (!mounted) return
          // Check readyState: if CONNECTING (0) on first error, likely MIME type
          // or server issue — use aggressive backoff to avoid console spam
          const wasNeverOpen = es.readyState === EventSource.CONNECTING ||
            (es.readyState === EventSource.CLOSED && retryCount.current === 0)
          es.close()
          esRef.current = null
          setStatus('disconnected')

          // If SSE never opened successfully, likely wrong MIME type or server
          // not supporting SSE — limit retries more aggressively
          const effectiveMax = wasNeverOpen ? 3 : maxRetries
          if (retryCount.current < effectiveMax) {
            // Start with 10s for MIME errors, 5s for normal; double each time
            const baseDelay = wasNeverOpen ? 10000 : 5000
            const delay = Math.min(baseDelay * Math.pow(2, retryCount.current), 120000)
            retryCount.current++
            retryTimer = setTimeout(connect, delay)
          }
          // After max retries: stay disconnected silently (no console noise)
        }
      } catch {
        setStatus('disconnected')
      }
    }

    connect()

    return () => {
      mounted = false
      if (retryTimer) clearTimeout(retryTimer)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [qc])

  return { status, lastEvent, updateCount }
}

// ── Neighborhood/City Statistics (derived from plot data) ──

export interface CityComparison {
  city: string
  plotCount: number
  avgPrice: number
  avgPricePerDunam: number
  avgRoi: number
  avgScore: number
  minPrice: number
  maxPrice: number
  totalArea: number // sqm
  dominantZoning: string
}

/**
 * Calculate how a specific plot compares to others in the same city.
 * Returns percentile rankings and delta values for key metrics.
 */
export function usePlotCityRanking(plot: Plot | null | undefined, allPlots: Plot[]) {
  return useMemo(() => {
    if (!plot || !allPlots.length) return null

    const cityPlots = allPlots.filter(pl => pl.city === plot.city && pl.id !== plot.id)
    if (cityPlots.length < 1) return null

    const { price, size } = { price: plot.total_price ?? plot.totalPrice ?? 0, size: plot.size_sqm ?? plot.sizeSqM ?? 0 }
    const plotRoi = (plot.projected_value ?? plot.projectedValue ?? 0) > 0 && price > 0
      ? (((plot.projected_value ?? plot.projectedValue ?? 0) - price) / price) * 100
      : 0
    const plotPpd = price > 0 && size > 0 ? Math.round(price / (size / 1000)) : 0

    // City averages
    const cityPrices = cityPlots.map(pl => pl.total_price ?? pl.totalPrice ?? 0).filter(v => v > 0)
    const cityRois = cityPlots.map(pl => {
      const pr = pl.total_price ?? pl.totalPrice ?? 0
      const pv = pl.projected_value ?? pl.projectedValue ?? 0
      return pr > 0 && pv > 0 ? ((pv - pr) / pr) * 100 : 0
    }).filter(v => v > 0)
    const cityPpds = cityPlots.map(pl => {
      const pr = pl.total_price ?? pl.totalPrice ?? 0
      const sz = pl.size_sqm ?? pl.sizeSqM ?? 0
      return pr > 0 && sz > 0 ? Math.round(pr / (sz / 1000)) : 0
    }).filter(v => v > 0)

    const avgPrice = cityPrices.length ? Math.round(cityPrices.reduce((s, v) => s + v, 0) / cityPrices.length) : 0
    const avgRoi = cityRois.length ? Math.round(cityRois.reduce((s, v) => s + v, 0) / cityRois.length * 10) / 10 : 0
    const avgPpd = cityPpds.length ? Math.round(cityPpds.reduce((s, v) => s + v, 0) / cityPpds.length) : 0

    // Percentile calculation
    function percentile(arr: number[], value: number): number {
      if (arr.length === 0) return 50
      const sorted = [...arr].sort((a, b) => a - b)
      let below = 0
      for (const v of sorted) {
        if (v < value) below++
        else break
      }
      return Math.round((below / sorted.length) * 100)
    }

    return {
      city: plot.city,
      plotCount: cityPlots.length + 1,
      price: {
        value: price,
        cityAvg: avgPrice,
        delta: avgPrice > 0 ? Math.round(((price - avgPrice) / avgPrice) * 100) : 0,
        percentile: percentile(cityPrices, price),
        isBelowAvg: price > 0 && avgPrice > 0 && price < avgPrice,
      },
      roi: {
        value: plotRoi,
        cityAvg: avgRoi,
        delta: avgRoi > 0 ? Math.round((plotRoi - avgRoi) * 10) / 10 : 0,
        percentile: percentile(cityRois, plotRoi),
        isAboveAvg: plotRoi > avgRoi,
      },
      pricePerDunam: {
        value: plotPpd,
        cityAvg: avgPpd,
        delta: avgPpd > 0 ? Math.round(((plotPpd - avgPpd) / avgPpd) * 100) : 0,
        percentile: percentile(cityPpds, plotPpd),
        isBelowAvg: plotPpd > 0 && avgPpd > 0 && plotPpd < avgPpd,
      },
    }
  }, [plot, allPlots])
}

// ── Document Title ──
const BASE_TITLE = 'LandMap Israel'
const TITLE_SEP = ' — '

/**
 * Dynamically updates document.title for SEO and browser tab clarity.
 * Automatically restores the base title on unmount.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const prev = document.title
    if (title) {
      document.title = `${title}${TITLE_SEP}${BASE_TITLE}`
    } else {
      document.title = `${BASE_TITLE}${TITLE_SEP}מפת קרקעות להשקעה`
    }
    return () => { document.title = prev }
  }, [title])
}

/**
 * Dynamically updates the meta description tag for SEO.
 * Google uses this in search result snippets.
 */
export function useMetaDescription(description: string | null | undefined) {
  useEffect(() => {
    if (!description) return
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    const prev = meta?.getAttribute('content') || ''
    if (meta) {
      meta.setAttribute('content', description)
    }
    return () => {
      if (meta && prev) meta.setAttribute('content', prev)
    }
  }, [description])
}

// (useDataFreshness already defined above at line ~243)

// ── Connection Quality Detection ──

type ConnectionSpeed = 'fast' | 'slow' | 'unknown'

/**
 * Detect connection quality via the Network Information API (navigator.connection).
 * Falls back to 'unknown' on unsupported browsers.
 * Use to conditionally disable expensive prefetches on slow/metered connections.
 */
export function useConnectionQuality(): { speed: ConnectionSpeed; saveData: boolean } {
  const [state, setState] = useState<{ speed: ConnectionSpeed; saveData: boolean }>(() => {
    const conn = (navigator as any).connection
    if (!conn) return { speed: 'unknown', saveData: false }
    const ect = conn.effectiveType as string | undefined
    const saveData = !!conn.saveData
    const speed: ConnectionSpeed = saveData ? 'slow'
      : (ect === '4g' || ect === '5g') ? 'fast'
      : (ect === '3g' || ect === '2g' || ect === 'slow-2g') ? 'slow'
      : 'unknown'
    return { speed, saveData }
  })

  useEffect(() => {
    const conn = (navigator as any).connection
    if (!conn) return
    const handler = () => {
      const ect = conn.effectiveType as string | undefined
      const saveData = !!conn.saveData
      const speed: ConnectionSpeed = saveData ? 'slow'
        : (ect === '4g' || ect === '5g') ? 'fast'
        : (ect === '3g' || ect === '2g' || ect === 'slow-2g') ? 'slow'
        : 'unknown'
      setState({ speed, saveData })
    }
    conn.addEventListener('change', handler)
    return () => conn.removeEventListener('change', handler)
  }, [])

  return state
}

// ── Native Share (Web Share API with clipboard fallback) ──

/**
 * Share a plot via the Web Share API on mobile, or fall back to clipboard copy.
 * Returns `{ share, canNativeShare }`.
 */
export function useSharePlot() {
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const share = useCallback(async (opts: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'failed'> => {
    // Try native share first (mobile browsers, PWA)
    if (navigator.share) {
      try {
        await navigator.share(opts)
        return 'shared'
      } catch (err) {
        // User cancelled — not an error
        if ((err as Error).name === 'AbortError') return 'failed'
      }
    }
    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(opts.url)
      return 'copied'
    } catch {
      // Last resort: execCommand
      try {
        const ta = document.createElement('textarea')
        ta.value = opts.url
        ta.style.cssText = 'position:fixed;top:-9999px;opacity:0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        return 'copied'
      } catch {
        return 'failed'
      }
    }
  }, [])

  return { share, canNativeShare }
}
