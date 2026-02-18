import { useState, useEffect } from 'react'

/**
 * IdleRender — defers children rendering until the browser is idle.
 * 
 * Non-critical widgets (MarketTicker, FeaturedDeals, AlertSubscription, RecentlyViewed)
 * don't need to render during initial page load. Deferring them with requestIdleCallback
 * reduces Time to Interactive (TTI) and lets the map + filter bar render first.
 *
 * Falls back to a 200ms setTimeout on browsers without requestIdleCallback support.
 *
 * Usage:
 *   <IdleRender>
 *     <ExpensiveWidget />
 *   </IdleRender>
 *
 * With timeout (max wait before forcing render):
 *   <IdleRender timeout={3000}>
 *     <ExpensiveWidget />
 *   </IdleRender>
 */
export default function IdleRender({ children, timeout = 2000, fallback = null }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout })
      return () => window.cancelIdleCallback(id)
    }
    // Fallback for Safari and older browsers
    const timer = setTimeout(() => setReady(true), 200)
    return () => clearTimeout(timer)
  }, [timeout])

  return ready ? children : fallback
}
