import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * useLastVisitPrice — tracks per-plot price changes between user visits.
 *
 * On each visit, stores the current price + timestamp in localStorage.
 * On subsequent visits, compares the stored price with the current price and
 * returns the change (amount, percentage, direction).
 *
 * Like Yad2's "המחיר ירד מאז הביקור האחרון" badge — but per-user, per-plot.
 * This is hyper-personalized: shows price changes relative to when YOU last saw
 * the plot, not when the price objectively changed.
 *
 * Storage format: { [plotId]: { price: number, ts: number } }
 * Key: landmap_last_visit_prices
 * Max entries: 100 (LRU-style cleanup to avoid localStorage bloat)
 */
const STORAGE_KEY = 'landmap_last_visit_prices'
const MAX_ENTRIES = 100

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveStore(store) {
  try {
    // LRU cleanup: if over MAX_ENTRIES, remove oldest entries
    const entries = Object.entries(store)
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => a[1].ts - b[1].ts) // oldest first
      const toKeep = entries.slice(entries.length - MAX_ENTRIES)
      store = Object.fromEntries(toKeep)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage full or unavailable — degrade silently
  }
}

/**
 * @param {string} plotId — plot UUID
 * @param {number} currentPrice — current total_price of the plot
 * @returns {{ hasChange: boolean, previousPrice: number|null, change: number, changePct: number, direction: 'up'|'down'|'same', lastVisit: Date|null, isFirstVisit: boolean }}
 */
export function useLastVisitPrice(plotId, currentPrice) {
  const [priceChange, setPriceChange] = useState({
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

    const store = loadStore()
    const entry = store[plotId]

    if (entry && entry.price > 0) {
      const diff = currentPrice - entry.price
      const pct = Math.round((diff / entry.price) * 100)
      const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'same'

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
      setPriceChange(prev => ({ ...prev, isFirstVisit: true }))
    }

    // Record the current visit (update price + timestamp)
    store[plotId] = { price: currentPrice, ts: Date.now() }
    saveStore(store)
  }, [plotId, currentPrice])

  return priceChange
}
