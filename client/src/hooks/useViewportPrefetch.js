import { useEffect, useRef } from 'react'

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
      { rootMargin, threshold: 0 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, skip])

  return ref
}
