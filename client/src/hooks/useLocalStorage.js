import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

/**
 * Custom hook for type-safe localStorage with reactive cross-tab synchronization.
 *
 * Replaces the repeated try/catch + useState + useEffect pattern used in 10+ components
 * (MapView, PlotCardStrip, SearchAutocomplete, FilterBar, CompareBar, etc.)
 *
 * Features:
 * - SSR-safe (returns defaultValue during SSR)
 * - Cross-tab sync via `storage` event (if user opens two tabs, both stay in sync)
 * - Error-resilient: corrupted localStorage entries fall back to defaultValue
 * - Stable setter reference (wrapped in useCallback) for safe dependency arrays
 * - Supports both JSON-serializable values and raw strings
 *
 * Usage:
 *   const [value, setValue] = useLocalStorage('landmap_auto_search', false)
 *   const [items, setItems] = useLocalStorage('landmap_compare', [])
 *   setValue(prev => [...prev, newItem])  // function updater supported
 *
 * @param {string} key - localStorage key
 * @param {*} defaultValue - fallback value when key doesn't exist or is corrupted
 * @param {Object} [options]
 * @param {boolean} [options.raw=false] - if true, store/retrieve as raw string (no JSON)
 * @returns {[*, Function, Function]} [value, setValue, removeValue]
 */
export function useLocalStorage(key, defaultValue, options = {}) {
  const { raw = false } = options

  // Deserialize from localStorage
  const readValue = useCallback(() => {
    // SSR guard
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      if (item === null) return defaultValue
      return raw ? item : JSON.parse(item)
    } catch {
      return defaultValue
    }
  }, [key, defaultValue, raw])

  const [storedValue, setStoredValue] = useState(readValue)

  // Setter that writes to both state and localStorage
  const setValue = useCallback((valueOrUpdater) => {
    setStoredValue((prev) => {
      const nextValue = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(prev)
        : valueOrUpdater

      try {
        const serialized = raw ? String(nextValue) : JSON.stringify(nextValue)
        localStorage.setItem(key, serialized)
        // Dispatch custom event for same-tab subscribers (storage event only fires cross-tab)
        window.dispatchEvent(new CustomEvent('landmap-storage', { detail: { key } }))
      } catch {
        // localStorage full or unavailable — state still updates in memory
      }

      return nextValue
    })
  }, [key, raw])

  // Remove key entirely
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      window.dispatchEvent(new CustomEvent('landmap-storage', { detail: { key } }))
    } catch {}
    setStoredValue(defaultValue)
  }, [key, defaultValue])

  // Cross-tab synchronization: listen for storage events from other tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key || e.key === null) {
        setStoredValue(readValue())
      }
    }
    // Same-tab sync via custom event
    const handleCustom = (e) => {
      if (e.detail?.key === key) {
        setStoredValue(readValue())
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('landmap-storage', handleCustom)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('landmap-storage', handleCustom)
    }
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}

/**
 * Lightweight read-only hook for localStorage values that rarely change.
 * Uses useSyncExternalStore for tearing-safe reads without triggering re-renders on write.
 *
 * Usage:
 *   const introSeen = useLocalStorageValue('landmap_intro_seen', false)
 */
export function useLocalStorageValue(key, defaultValue) {
  const subscribe = useCallback((callback) => {
    const handler = (e) => {
      if (e.key === key || e.key === null) callback()
    }
    const customHandler = (e) => {
      if (e.detail?.key === key) callback()
    }
    window.addEventListener('storage', handler)
    window.addEventListener('landmap-storage', customHandler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('landmap-storage', customHandler)
    }
  }, [key])

  const getSnapshot = useCallback(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, () => defaultValue)
}
