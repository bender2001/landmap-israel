import { useEffect, useRef } from 'react'

/**
 * Core Web Vitals monitoring hook.
 * Tracks LCP, FID, CLS, TTFB, and INP — the metrics Google uses for ranking.
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

    const clsObs = observeCLS(report)
    if (clsObs) observers.push(clsObs)

    measureTTFB(report)

    return () => {
      observers.forEach(obs => {
        try { obs.disconnect() } catch {}
      })
    }
  }, [enabled])
}
