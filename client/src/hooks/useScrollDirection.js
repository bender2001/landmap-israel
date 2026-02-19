import { useState, useEffect, useRef } from 'react'

/**
 * useScrollDirection — detects scroll direction on the page.
 * Returns 'up' | 'down' | null (null = at top of page / no scroll yet).
 *
 * Used by MobileBottomNav to auto-hide when scrolling down (maximizes map/content area)
 * and reappear when scrolling up (user wants to navigate). Same pattern as:
 * - Madlan's mobile nav
 * - YouTube app bottom tabs
 * - Instagram bottom navigation
 *
 * Hysteresis threshold (15px): ignores tiny scroll jitters from elastic bounce,
 * touch imprecision, and iOS momentum scrolling. Prevents nav from flickering
 * on small scroll movements.
 *
 * Performance: uses passive scroll listener + requestAnimationFrame to avoid
 * layout thrashing. Only updates state when direction actually changes.
 */
export function useScrollDirection({ threshold = 15 } = {}) {
  const [direction, setDirection] = useState(null)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const updateDirection = () => {
      const scrollY = window.scrollY

      // At top of page — always show nav
      if (scrollY < 10) {
        setDirection(null)
        lastScrollY.current = scrollY
        ticking.current = false
        return
      }

      const diff = scrollY - lastScrollY.current

      // Apply hysteresis threshold — ignore small movements
      if (Math.abs(diff) < threshold) {
        ticking.current = false
        return
      }

      setDirection(diff > 0 ? 'down' : 'up')
      lastScrollY.current = scrollY
      ticking.current = false
    }

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true
        requestAnimationFrame(updateDirection)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}
