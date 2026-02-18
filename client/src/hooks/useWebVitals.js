import { useEffect, useRef } from 'react'

/**
 * Core Web Vitals monitoring hook.
 * Tracks LCP, INP, CLS, TTFB (and legacy FID) — the metrics Google uses for ranking.
 * As of March 2024, the three Core Web Vitals are: LCP, INP, CLS.
 * Reports to our analytics endpoint (non-blocking, fire-and-forget).
 *
 * Why this matters:
 * - Madlan/Yad2 monitor these to stay fast
 * - Google Search uses CWV as a ranking signal
 * - Helps identify performance regressions before users complain
 */

const ANALYTICS_ENDPOINT = '/api/admin/analytics'

function reportMetric(metric) {
  // Don't report in dev mode (noisy)
  if (import.meta.env.DEV) {
    console.debug(`[WebVital] ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'}`, metric)
    return
  }

  // Beacon API for reliable delivery even on page unload
  const body = JSON.stringify({
    type: 'web-vital',
    name: metric.name,
    value: Math.round(metric.value * 100) / 100,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: Math.round(metric.delta * 100) / 100,
    navigationType: metric.navigationType,
    url: window.location.pathname,
    timestamp: Date.now(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  }
}

/**
 * Observe Largest Contentful Paint (LCP).
 * LCP measures loading performance — should be ≤2.5s.
 */
function observeLCP(callback) {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        callback({
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
        })
      }
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
    return observer
  } catch { return null }
}

/**
 * Observe First Input Delay (FID).
 * FID measures interactivity — should be ≤100ms.
 * Note: Google deprecated FID in favor of INP (March 2024), but we keep
 * FID tracking for backwards compatibility with older analytics dashboards.
 */
function observeFID(callback) {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const firstEntry = entries[0]
      if (firstEntry) {
        const value = firstEntry.processingStart - firstEntry.startTime
        callback({
          name: 'FID',
          value,
          delta: value,
          rating: value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
        })
      }
    })
    observer.observe({ type: 'first-input', buffered: true })
    return observer
  } catch { return null }
}

/**
 * Observe Interaction to Next Paint (INP).
 * INP replaced FID as a Core Web Vital in March 2024.
 * It measures the latency of ALL interactions (clicks, taps, keyboard),
 * not just the first one. Should be ≤200ms.
 *
 * INP picks the worst interaction (p98 for pages with 50+ interactions,
 * otherwise the single worst) — so it catches slow event handlers that
 * FID would miss (e.g., slow filter re-renders, map redraws on click).
 *
 * This is critical for LandMap because:
 * - Filter toggling triggers heavy re-renders (plot list + map polygons)
 * - Map polygon clicks fire expensive score/ROI calculations
 * - Compare/favorite toggles update multiple components
 * Google now uses INP instead of FID for search ranking signals.
 */
function observeINP(callback) {
  if (!('PerformanceObserver' in window)) return

  try {
    // Track all interactions, keep the worst one (by duration)
    let worstINP = 0
    let interactionCount = 0
    // For pages with many interactions, use p98 (skip top 2% outliers)
    const interactionDurations = []

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count entries with an interactionId (real user interactions)
        if (!entry.interactionId) continue

        const duration = entry.duration
        interactionCount++
        interactionDurations.push(duration)

        // Update worst INP
        if (duration > worstINP) {
          worstINP = duration
        }
      }

      // Calculate INP value: p98 for 50+ interactions, worst otherwise
      let inpValue
      if (interactionDurations.length >= 50) {
        // p98: sort and pick the 98th percentile (skip top 2% outliers)
        const sorted = [...interactionDurations].sort((a, b) => a - b)
        const idx = Math.floor(sorted.length * 0.98) - 1
        inpValue = sorted[Math.max(0, idx)]
      } else {
        inpValue = worstINP
      }

      if (inpValue > 0) {
        callback({
          name: 'INP',
          value: inpValue,
          delta: inpValue,
          rating: inpValue <= 200 ? 'good' : inpValue <= 500 ? 'needs-improvement' : 'poor',
          navigationType: getNavigationType(),
          interactionCount,
        })
      }
    })

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 })
    return observer
  } catch { return null }
}

/**
 * Observe Cumulative Layout Shift (CLS).
 * CLS measures visual stability — should be ≤0.1.
 */
function observeCLS(callback) {
  if (!('PerformanceObserver' in window)) return

  try {
    let clsValue = 0
    let sessionValue = 0
    let sessionEntries = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0]
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1]

          // Start new session window if gap > 1s or total > 5s
          if (
            sessionValue &&
            (entry.startTime - lastSessionEntry.startTime > 1000 ||
              entry.startTime - firstSessionEntry.startTime > 5000)
          ) {
            if (sessionValue > clsValue) clsValue = sessionValue
            sessionValue = entry.value
            sessionEntries = [entry]
          } else {
            sessionValue += entry.value
            sessionEntries.push(entry)
          }
        }
      }

      const finalValue = Math.max(clsValue, sessionValue)
      callback({
        name: 'CLS',
        value: finalValue,
        delta: finalValue,
        rating: finalValue <= 0.1 ? 'good' : finalValue <= 0.25 ? 'needs-improvement' : 'poor',
        navigationType: getNavigationType(),
      })
    })
    observer.observe({ type: 'layout-shift', buffered: true })
    return observer
  } catch { return null }
}

/**
 * Measure Time to First Byte (TTFB).
 * TTFB measures server responsiveness — should be ≤800ms.
 */
function measureTTFB(callback) {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav) {
      const value = nav.responseStart - nav.requestStart
      callback({
        name: 'TTFB',
        value,
        delta: value,
        rating: value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor',
        navigationType: getNavigationType(),
      })
    }
  } catch {}
}

function getNavigationType() {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    return nav?.type || 'navigate'
  } catch {
    return 'navigate'
  }
}

/**
 * Hook to monitor Core Web Vitals in the app.
 * Call once in the root component — it automatically reports metrics.
 *
 * @param {boolean} enabled - Whether to enable monitoring (default: true)
 */
export function useWebVitals(enabled = true) {
  const reported = useRef(new Set())

  useEffect(() => {
    if (!enabled) return

    const observers = []

    // Deduplicate reports (each metric should be reported once per page load)
    const report = (metric) => {
      if (reported.current.has(metric.name)) return
      reported.current.add(metric.name)
      reportMetric(metric)
    }

    const lcpObs = observeLCP(report)
    if (lcpObs) observers.push(lcpObs)

    const fidObs = observeFID(report)
    if (fidObs) observers.push(fidObs)

    // INP replaces FID as a Core Web Vital (March 2024).
    // Unlike FID (first interaction only), INP tracks ALL interactions and reports
    // the worst one — catching slow filter re-renders, map clicks, etc.
    // We report INP on page unload (visibilitychange) since it accumulates over time.
    const inpObs = observeINP(report)
    if (inpObs) observers.push(inpObs)

    const clsObs = observeCLS(report)
    if (clsObs) observers.push(clsObs)

    measureTTFB(report)

    // Report INP on page hide — INP accumulates over the session and should be
    // reported when the user navigates away or switches tabs. The 'visibilitychange'
    // event is the most reliable trigger (fires on tab close, navigation, minimize).
    // Without this, INP would only report mid-session snapshots, missing late interactions.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Force-report any pending INP value (overrides the dedup check)
        reported.current.delete('INP')
        // The INP observer's callback will fire with the final accumulated value
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      observers.forEach(obs => {
        try { obs.disconnect() } catch {}
      })
    }
  }, [enabled])
}
