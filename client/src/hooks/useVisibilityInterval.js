import { useEffect, useRef, useCallback } from 'react'

/**
 * setInterval that automatically pauses when the tab is hidden.
 *
 * Standard setInterval keeps firing even when the tab is backgrounded — wasting
 * CPU and battery for UI-only updates the user can't see (like relative time labels,
 * blinking indicators, progress animations). Modern browsers throttle timers in
 * background tabs, but they still fire at reduced rates and trigger React re-renders.
 *
 * This hook:
 * - Fires the callback at the given interval ONLY when the tab is visible
 * - Fires immediately when the tab becomes visible again (if the interval elapsed while hidden)
 * - Optionally skips the immediate-on-return fire (catchUp: false)
 * - Cleans up properly on unmount
 *
 * Used by DataFreshnessIndicator (30s ticks), MarketTicker, and any component
 * that periodically re-renders for visual updates.
 *
 * @param {Function} callback - Function to call on each tick
 * @param {number} delayMs - Interval in milliseconds
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Enable/disable the interval
 * @param {boolean} [options.catchUp=true] - Fire immediately when tab returns if interval elapsed while hidden
 */
export function useVisibilityInterval(callback, delayMs, { enabled = true, catchUp = true } = {}) {
  const callbackRef = useRef(callback)
  const intervalRef = useRef(null)
  const hiddenAtRef = useRef(null)
  const lastFireRef = useRef(Date.now())

  // Keep callback ref fresh
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startInterval = useCallback(() => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      callbackRef.current()
      lastFireRef.current = Date.now()
    }, delayMs)
  }, [delayMs])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      stopInterval()
      return
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden — stop interval, record when we went hidden
        hiddenAtRef.current = Date.now()
        stopInterval()
      } else {
        // Tab visible again — restart interval
        const hiddenAt = hiddenAtRef.current
        hiddenAtRef.current = null

        // If enough time passed while hidden, fire immediately (catch up)
        if (catchUp && hiddenAt && Date.now() - lastFireRef.current >= delayMs) {
          callbackRef.current()
          lastFireRef.current = Date.now()
        }

        startInterval()
      }
    }

    // Start interval if tab is currently visible
    if (!document.hidden) {
      startInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, delayMs, catchUp, startInterval, stopInterval])
}
