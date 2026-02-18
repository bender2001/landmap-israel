import { useCallback, useMemo } from 'react'

const STORAGE_KEY = 'landmap_price_history'
const MAX_ENTRIES = 200

/**
 * Tracks plot prices in localStorage to detect price changes.
 * Shows "price dropped" / "price increased" badges like Yad2/Madlan.
 * 
 * Each entry: { price, firstSeen, previousPrice? }
 */
export function usePriceTracker() {
  const getStore = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [])

  const saveStore = useCallback((store) => {
    try {
      // Prune if too large
      const keys = Object.keys(store)
      if (keys.length > MAX_ENTRIES) {
        const sorted = keys
          .map(k => ({ k, ts: store[k].firstSeen || 0 }))
          .sort((a, b) => a.ts - b.ts)
        const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES)
        toRemove.forEach(({ k }) => delete store[k])
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch { /* quota */ }
  }, [])

  /**
   * Record current prices for a list of plots.
   * Call this once when plots are loaded.
   */
  const recordPrices = useCallback((plots) => {
    if (!plots || plots.length === 0) return
    const store = getStore()
    let changed = false

    for (const plot of plots) {
      const id = plot.id
      const price = plot.total_price ?? plot.totalPrice
      if (!id || !price) continue

      const existing = store[id]
      if (!existing) {
        // First time seeing this plot
        store[id] = { price, firstSeen: Date.now() }
        changed = true
      } else if (existing.price !== price) {
        // Price changed!
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

  /**
   * Get price change info for a plot.
   * Returns null if no change, or { direction: 'down'|'up', previousPrice, pctChange }
   */
  const getPriceChange = useCallback((plotId) => {
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

  /**
   * Get all plots with price changes (for alerts/badges).
   */
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
