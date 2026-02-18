import { useState, useEffect, useRef } from 'react'

/**
 * useLazyVisible — IntersectionObserver hook for deferred rendering.
 * Returns [ref, isVisible] where isVisible becomes true once the element
 * enters the viewport (and stays true — no un-mounting).
 * 
 * Used by CollapsibleSection in SidebarDetails to avoid rendering
 * heavy content (charts, benchmarks, radar) until the section scrolls
 * into view. Reduces initial sidebar render from ~50+ components to ~10.
 * 
 * @param {Object} options
 * @param {string} options.rootMargin - IntersectionObserver rootMargin (default: '200px' — preload 200px before visible)
 * @param {number} options.threshold - IntersectionObserver threshold (default: 0)
 * @param {boolean} options.skip - If true, always returns visible (for above-fold sections)
 * @returns {[React.RefObject, boolean]}
 */
export function useLazyVisible({ rootMargin = '200px', threshold = 0, skip = false } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(skip)

  useEffect(() => {
    if (skip || isVisible) return // Already visible or skipped — no need to observe

    const el = ref.current
    if (!el) return

    // Fallback for browsers without IntersectionObserver (rare, but safe)
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect() // Once visible, stop observing (content stays mounted)
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [skip, isVisible, rootMargin, threshold])

  return [ref, isVisible]
}
