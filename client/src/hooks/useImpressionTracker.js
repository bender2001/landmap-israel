import { useRef, useCallback, useEffect } from 'react'

/**
 * useImpressionTracker — tracks which elements (plot cards) a user actually *sees*
 * in the viewport using IntersectionObserver. Fires a callback when an element
 * becomes visible for the first time (or after a cooldown period).
 *
 * WHY THIS MATTERS:
 * Click tracking captures intent, but impression tracking captures *exposure*.
 * A plot with 100 impressions and 5 clicks has a 5% CTR — that's actionable data.
 * YouTube, TikTok, and Instagram all use impression data for their recommendation
 * algorithms. Currently we only track clicks (POST /api/plots/:id/view), missing
 * the denominator needed to calculate engagement rates.
 *
 * Usage:
 *   const { observeRef } = useImpressionTracker({
 *     onImpression: (plotId) => analytics.trackImpression(plotId),
 *     threshold: 0.5,      // 50% visible
 *     cooldownMs: 30_000,  // re-track after 30s
 *   })
 *   // In the card component:
 *   <div ref={(el) => observeRef(el, plot.id)} ...>
 *
 * Architecture notes:
 * - Single IntersectionObserver instance (efficient, no per-element observers)
 * - Cooldown map prevents spam from scroll jitter
 * - Auto-cleanup on unmount
 * - Batches impressions and sends via sendBeacon on page unload
 */
export function useImpressionTracker({
  onImpression,
  threshold = 0.5,
  cooldownMs = 30_000,
  batchFlushMs = 5_000,
} = {}) {
  const observerRef = useRef(null)
  const elementMapRef = useRef(new Map())   // el → plotId
  const lastSeenRef = useRef(new Map())     // plotId → timestamp
  const batchRef = useRef([])               // queued impressions
  const batchTimerRef = useRef(null)

  // Flush batched impressions to the server
  const flush = useCallback(() => {
    const batch = batchRef.current
    if (batch.length === 0) return
    batchRef.current = []

    // Send to analytics endpoint (non-blocking, fire-and-forget)
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
    } catch {
      // Silently ignore — impression tracking is never user-facing
    }
  }, [])

  // Initialize observer
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const now = Date.now()
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const plotId = elementMapRef.current.get(entry.target)
          if (!plotId) continue

          // Cooldown check — don't re-track the same plot within cooldownMs
          const lastSeen = lastSeenRef.current.get(plotId) || 0
          if (now - lastSeen < cooldownMs) continue

          lastSeenRef.current.set(plotId, now)

          // Fire callback (for real-time UI updates if needed)
          if (onImpression) onImpression(plotId)

          // Queue for batch send
          batchRef.current.push({
            plotId,
            ts: now,
            viewport: {
              w: window.innerWidth,
              h: window.innerHeight,
            },
          })

          // Schedule batch flush
          if (!batchTimerRef.current) {
            batchTimerRef.current = setTimeout(() => {
              batchTimerRef.current = null
              flush()
            }, batchFlushMs)
          }
        }
      },
      {
        threshold,
        // rootMargin: slight buffer so cards are tracked just before fully visible
        rootMargin: '0px',
      }
    )

    // Flush remaining impressions on page unload (covers tab close, navigation)
    const handleUnload = () => flush()
    window.addEventListener('pagehide', handleUnload)

    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('pagehide', handleUnload)
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current)
      flush() // flush remaining on unmount
    }
  }, [threshold, cooldownMs, batchFlushMs, onImpression, flush])

  /**
   * Register an element for impression tracking.
   * Use as a ref callback: ref={(el) => observeRef(el, plotId)}
   */
  const observeRef = useCallback((el, plotId) => {
    if (!observerRef.current) return
    if (!el) return

    // If this element was already being observed with a different plotId, unobserve first
    const prevId = elementMapRef.current.get(el)
    if (prevId === plotId) return // already tracking this exact element+id

    if (prevId) {
      observerRef.current.unobserve(el)
    }

    elementMapRef.current.set(el, plotId)
    observerRef.current.observe(el)
  }, [])

  /**
   * Unregister an element (call on card unmount if needed).
   */
  const unobserveRef = useCallback((el) => {
    if (!el || !observerRef.current) return
    observerRef.current.unobserve(el)
    elementMapRef.current.delete(el)
  }, [])

  return { observeRef, unobserveRef, flush }
}
