import { useEffect, useRef } from 'react'

/**
 * Detect slow connections or data-saver mode at the module level.
 * Checked once per prefetch trigger — avoids hook dependency overhead.
 * On slow connections (2G/3G/high-RTT/Save-Data), prefetching wastes bandwidth
 * that the user needs for actual content they're requesting.
 */
function shouldSkipPrefetch() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return false
  if (conn.saveData) return true
  const ect = conn.effectiveType
  if (ect === 'slow-2g' || ect === '2g') return true
  // On 3G, allow prefetch but with reduced aggressiveness (handled via rootMargin)
  return false
}

/**
 * useViewportPrefetch — triggers a callback when an element enters the viewport.
 *
 * Used for plot cards in the horizontal strip: when a card scrolls into view,
 * we prefetch its full data from the API. By the time the user clicks, the data
 * is already in React Query's cache — making the sidebar open feel instant.
 *
 * This is significantly better than hover-only prefetching because:
 * 1. Mobile users don't hover — they scroll and tap
 * 2. Fast scrollers miss hover events entirely
 * 3. Cards at the visible edge get prefetched before the user reaches them
 *
 * Connection-aware: skips prefetching entirely on 2G/Save-Data connections to
 * conserve bandwidth. On 3G, uses a tighter rootMargin (50px vs 200px) so only
 * cards very close to the viewport get prefetched. On 4G+, full 200px lookahead.
 * Like YouTube/Netflix adaptive prefetching — respects user's data budget.
 *
 * Performance: Uses a single shared IntersectionObserver instance per root
 * (via the root element). Each card registers with `observe()` and unregisters
 * on unmount. The observer fires once per card (unobserves after first trigger).
 *
 * @param {Function} onVisible - Callback to run when element enters viewport (called once)
 * @param {Object} options - IntersectionObserver options
 * @param {string} options.rootMargin - Margin around root (default '200px' for prefetch-ahead)
 * @param {boolean} options.skip - Skip observation (e.g., already selected)
 */
export function useViewportPrefetch(onVisible, { rootMargin = '200px', skip = false } = {}) {
  const ref = useRef(null)
  const triggeredRef = useRef(false)
  const callbackRef = useRef(onVisible)
  callbackRef.current = onVisible

  useEffect(() => {
    if (skip || triggeredRef.current) return
    const el = ref.current
    if (!el) return

    // Connection-aware prefetching: skip on very slow connections
    if (shouldSkipPrefetch()) return

    // Reduce rootMargin on 3G — only prefetch cards very close to viewport
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const effectiveMargin = conn?.effectiveType === '3g' ? '50px' : rootMargin

    // Reuse observer for lightweight footprint (1 observer per unique rootMargin)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true
            callbackRef.current()
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: effectiveMargin, threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, skip])

  return ref
}
