// ─── useTracking.ts ─── Consolidated tracking hooks
// Merges: useViewTracker, usePriceTracker, useImpressionTracker, useLastVisitPrice

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { trackPlotView } from '../api/plots'

// ═══ useViewTracker ═══

const VIEW_KEY = 'landmap_view_counts'
const VIEW_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

type ViewEntry = { count: number; lastViewed: number }
type ViewStore = Record<string, ViewEntry>

type UseViewTrackerResult = {
  trackView: (plotId: string) => void
  getViewCount: (plotId: string) => number
  isPopular: (plotId: string) => boolean
  popularPlotIds: Set<string>
}

export function useViewTracker(): UseViewTrackerResult {
  const getStore = useCallback((): ViewStore => {
    try {
      const raw = localStorage.getItem(VIEW_KEY)
      if (!raw) return {}
      const store = JSON.parse(raw) as ViewStore
      const now = Date.now()
      const pruned: ViewStore = {}
      for (const [id, entry] of Object.entries(store)) {
        if (now - entry.lastViewed < VIEW_MAX_AGE_MS) {
          pruned[id] = entry
        }
      }
      return pruned
    } catch {
      return {}
    }
  }, [])

  const trackView = useCallback((plotId: string) => {
    if (!plotId) return
    const store = getStore()
    const existing = store[plotId] || { count: 0, lastViewed: 0 }
    store[plotId] = {
      count: existing.count + 1,
      lastViewed: Date.now(),
    }
    try {
      localStorage.setItem(VIEW_KEY, JSON.stringify(store))
    } catch {}
    trackPlotView(plotId)
  }, [getStore])

  const getViewCount = useCallback((plotId: string) => {
    const store = getStore()
    return store[plotId]?.count || 0
  }, [getStore])

  const isPopular = useCallback((plotId: string) => {
    return getViewCount(plotId) >= 3
  }, [getViewCount])

  const popularPlotIds = useMemo(() => {
    const store = getStore()
    return new Set(
      Object.entries(store)
        .filter(([, entry]) => entry.count >= 3)
        .map(([id]) => id)
    )
  }, [getStore])

  return { trackView, getViewCount, isPopular, popularPlotIds }
}

// ═══ usePriceTracker ═══

const PRICE_KEY = 'landmap_price_history'
const PRICE_MAX_ENTRIES = 200

type PlotPriceLike = {
  id?: string
  total_price?: number
  totalPrice?: number
}

type PriceEntry = {
  price: number
  firstSeen: number
  previousPrice?: number
  changedAt?: number
}

type PriceStore = Record<string, PriceEntry>

type TrackedPriceChange = {
  direction: 'down' | 'up'
  previousPrice: number
  currentPrice: number
  pctChange: number
  changedAt?: number
}

type UsePriceTrackerResult = {
  recordPrices: (plots: PlotPriceLike[]) => void
  getPriceChange: (plotId: string) => TrackedPriceChange | null
  changedPlotIds: Set<string>
}

export function usePriceTracker(): UsePriceTrackerResult {
  const getStore = useCallback((): PriceStore => {
    try {
      const raw = localStorage.getItem(PRICE_KEY)
      return raw ? (JSON.parse(raw) as PriceStore) : {}
    } catch {
      return {}
    }
  }, [])

  const saveStore = useCallback((store: PriceStore) => {
    try {
      const keys = Object.keys(store)
      if (keys.length > PRICE_MAX_ENTRIES) {
        const sorted = keys
          .map(k => ({ k, ts: store[k].firstSeen || 0 }))
          .sort((a, b) => a.ts - b.ts)
        const toRemove = sorted.slice(0, keys.length - PRICE_MAX_ENTRIES)
        toRemove.forEach(({ k }) => delete store[k])
      }
      localStorage.setItem(PRICE_KEY, JSON.stringify(store))
    } catch {}
  }, [])

  const recordPrices = useCallback((plots: PlotPriceLike[]) => {
    if (!plots || plots.length === 0) return
    const store = getStore()
    let changed = false

    for (const plot of plots) {
      const id = plot.id
      const price = plot.total_price ?? plot.totalPrice
      if (!id || !price) continue

      const existing = store[id]
      if (!existing) {
        store[id] = { price, firstSeen: Date.now() }
        changed = true
      } else if (existing.price !== price) {
        store[id] = {
          price,
          previousPrice: existing.price,
          changedAt: Date.now(),
          firstSeen: existing.firstSeen,
        }
        changed = true
      }
    }

    if (changed) saveStore(store)
  }, [getStore, saveStore])

  const getPriceChange = useCallback((plotId: string): TrackedPriceChange | null => {
    if (!plotId) return null
    const store = getStore()
    const entry = store[plotId]
    if (!entry || !entry.previousPrice) return null

    const diff = entry.price - entry.previousPrice
    const pctChange = Math.round(Math.abs(diff) / entry.previousPrice * 100)
    if (pctChange === 0) return null

    return {
      direction: diff < 0 ? 'down' : 'up',
      previousPrice: entry.previousPrice,
      currentPrice: entry.price,
      pctChange,
      changedAt: entry.changedAt,
    }
  }, [getStore])

  const changedPlotIds = useMemo(() => {
    const store = getStore()
    return new Set(
      Object.entries(store)
        .filter(([, entry]) => entry.previousPrice && entry.previousPrice !== entry.price)
        .map(([id]) => id)
    )
  }, [getStore])

  return { recordPrices, getPriceChange, changedPlotIds }
}

// ═══ useImpressionTracker ═══

type Impression = {
  plotId: string
  ts: number
  viewport: { w: number; h: number }
}

type UseImpressionTrackerOptions = {
  onImpression?: (plotId: string) => void
  threshold?: number
  cooldownMs?: number
  batchFlushMs?: number
}

type UseImpressionTrackerResult = {
  observeRef: (el: Element | null, plotId: string) => void
  unobserveRef: (el: Element | null) => void
  flush: () => void
}

export function useImpressionTracker({
  onImpression,
  threshold = 0.5,
  cooldownMs = 30_000,
  batchFlushMs = 5_000,
}: UseImpressionTrackerOptions = {}): UseImpressionTrackerResult {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementMapRef = useRef<Map<Element, string>>(new Map())
  const lastSeenRef = useRef<Map<string, number>>(new Map())
  const batchRef = useRef<Impression[]>([])
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback((): void => {
    const batch = batchRef.current
    if (batch.length === 0) return
    batchRef.current = []

    const payload = JSON.stringify({ impressions: batch, ts: Date.now() })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/impressions', payload)
      } else {
        fetch('/api/analytics/impressions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const now = Date.now()
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const plotId = elementMapRef.current.get(entry.target)
          if (!plotId) continue

          const lastSeen = lastSeenRef.current.get(plotId) || 0
          if (now - lastSeen < cooldownMs) continue

          lastSeenRef.current.set(plotId, now)
          if (onImpression) onImpression(plotId)

          batchRef.current.push({
            plotId,
            ts: now,
            viewport: { w: window.innerWidth, h: window.innerHeight },
          })

          if (!batchTimerRef.current) {
            batchTimerRef.current = setTimeout(() => {
              batchTimerRef.current = null
              flush()
            }, batchFlushMs)
          }
        }
      },
      { threshold, rootMargin: '0px' }
    )

    const handleUnload = () => flush()
    window.addEventListener('pagehide', handleUnload)

    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('pagehide', handleUnload)
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current)
      flush()
    }
  }, [threshold, cooldownMs, batchFlushMs, onImpression, flush])

  const observeRef = useCallback((el: Element | null, plotId: string) => {
    if (!observerRef.current || !el) return
    const prevId = elementMapRef.current.get(el)
    if (prevId === plotId) return
    if (prevId) observerRef.current.unobserve(el)
    elementMapRef.current.set(el, plotId)
    observerRef.current.observe(el)
  }, [])

  const unobserveRef = useCallback((el: Element | null) => {
    if (!el || !observerRef.current) return
    observerRef.current.unobserve(el)
    elementMapRef.current.delete(el)
  }, [])

  return { observeRef, unobserveRef, flush }
}

// ═══ useLastVisitPrice ═══

type LastVisitEntry = { price: number; ts: number }
type LastVisitStore = Record<string, LastVisitEntry>

type LastVisitPrice = {
  hasChange: boolean
  previousPrice: number | null
  change: number
  changePct: number
  direction: 'up' | 'down' | 'same'
  lastVisit: Date | null
  isFirstVisit: boolean
}

const LAST_VISIT_KEY = 'landmap_last_visit_prices'
const LAST_VISIT_MAX = 100

function loadLastVisitStore(): LastVisitStore {
  try {
    return JSON.parse(localStorage.getItem(LAST_VISIT_KEY) || '{}') as LastVisitStore
  } catch {
    return {}
  }
}

function saveLastVisitStore(store: LastVisitStore): void {
  try {
    const entries = Object.entries(store)
    if (entries.length > LAST_VISIT_MAX) {
      entries.sort((a, b) => a[1].ts - b[1].ts)
      const toKeep = entries.slice(entries.length - LAST_VISIT_MAX)
      store = Object.fromEntries(toKeep)
    }
    localStorage.setItem(LAST_VISIT_KEY, JSON.stringify(store))
  } catch {}
}

export function useLastVisitPrice(plotId: string | null | undefined, currentPrice: number | null | undefined): LastVisitPrice {
  const [priceChange, setPriceChange] = useState<LastVisitPrice>({
    hasChange: false,
    previousPrice: null,
    change: 0,
    changePct: 0,
    direction: 'same',
    lastVisit: null,
    isFirstVisit: true,
  })

  useEffect(() => {
    if (!plotId || !currentPrice || currentPrice <= 0) return

    const store = loadLastVisitStore()
    const entry = store[plotId]

    if (entry && entry.price > 0) {
      const diff = currentPrice - entry.price
      const pct = Math.round((diff / entry.price) * 100)
      const direction: LastVisitPrice['direction'] = pct > 0 ? 'up' : pct < 0 ? 'down' : 'same'

      setPriceChange({
        hasChange: pct !== 0,
        previousPrice: entry.price,
        change: diff,
        changePct: pct,
        direction,
        lastVisit: new Date(entry.ts),
        isFirstVisit: false,
      })
    } else {
      setPriceChange((prev) => ({ ...prev, isFirstVisit: true }))
    }

    store[plotId] = { price: currentPrice, ts: Date.now() }
    saveLastVisitStore(store)
  }, [plotId, currentPrice])

  return priceChange
}
