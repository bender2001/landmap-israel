import { useCallback, useMemo } from 'react'
import { trackPlotView } from '../api/plots.js'

const STORAGE_KEY = 'landmap_view_counts'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Tracks plot view counts both client-side (localStorage) and server-side.
 * Server tracking enables real "X people viewed this" indicators.
 * Client tracking provides instant local popular/trending badges.
 */
export function useViewTracker() {
  const getStore = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return {}
      const store = JSON.parse(raw)
      // Prune old entries
      const now = Date.now()
      const pruned = {}
      for (const [id, entry] of Object.entries(store)) {
        if (now - entry.lastViewed < MAX_AGE_MS) {
          pruned[id] = entry
        }
      }
      return pruned
    } catch {
      return {}
    }
  }, [])

  const trackView = useCallback((plotId) => {
    if (!plotId) return
    const store = getStore()
    const existing = store[plotId] || { count: 0, lastViewed: 0 }
    store[plotId] = {
      count: existing.count + 1,
      lastViewed: Date.now(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch { /* quota exceeded — ignore */ }
    // Fire-and-forget server-side tracking
    trackPlotView(plotId)
  }, [getStore])

  const getViewCount = useCallback((plotId) => {
    const store = getStore()
    return store[plotId]?.count || 0
  }, [getStore])

  const isPopular = useCallback((plotId) => {
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
