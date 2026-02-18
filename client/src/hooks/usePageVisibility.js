import { useEffect, useCallback, useRef } from 'react'

/**
 * Hook that tracks page visibility and triggers a callback when the user
 * returns to the tab after being away for a specified duration.
 *
 * Real estate data can change while users are away (new listings, price updates).
 * Like Madlan/Airbnb, we auto-refresh stale data when they come back — this keeps
 * the app feeling "live" without the cost of constant polling.
 *
 * @param {Function} onReturn - Called when user returns after staleDuration
 * @param {Object} [options]
 * @param {number} [options.staleDurationMs=120000] - How long "away" before data is considered stale (default 2 min)
 * @param {boolean} [options.enabled=true] - Enable/disable the hook
 */
export function usePageVisibility(onReturn, { staleDurationMs = 120_000, enabled = true } = {}) {
  const hiddenAtRef = useRef(null)
  const callbackRef = useRef(onReturn)

  // Keep callback ref fresh without re-registering listener
  useEffect(() => {
    callbackRef.current = onReturn
  }, [onReturn])

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab hidden — record timestamp
      hiddenAtRef.current = Date.now()
    } else {
      // Tab visible again — check if stale
      const hiddenAt = hiddenAtRef.current
      hiddenAtRef.current = null

      if (hiddenAt && Date.now() - hiddenAt >= staleDurationMs) {
        callbackRef.current?.()
      }
    }
  }, [staleDurationMs])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handleVisibilityChange, enabled])
}

/**
 * Hook that detects when the user returns to the tab and refetches
 * React Query queries that have gone stale.
 *
 * React Query v5 has built-in refetchOnWindowFocus, but it fires on every
 * focus event (even alt-tabbing for 1 second). This hook is smarter:
 * it only refetches after the user has been away for a meaningful duration,
 * reducing unnecessary API calls while keeping data fresh.
 *
 * @param {Function} refetchFn - The refetch function from useQuery
 * @param {Object} [options] - Same as usePageVisibility options
 */
export function useRefreshOnReturn(refetchFn, options) {
  usePageVisibility(
    useCallback(() => {
      refetchFn?.()
    }, [refetchFn]),
    options
  )
}
